#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════
   AI Arena — yerel anahtar sunucusu (bağımlılık yok, Node 18+)

   Neden var: API anahtarları ASLA tarayıcıya / HTML dosyasına girmez.
   Anahtarlar sadece bu klasördeki `.env` dosyasında (ya da ortam değişkenlerinde) durur.
   Arena sayfası bu sunucuya "şu modele şu mesajı gönder" der; sunucu isteği sağlayıcıya iletir
   ve cevabı akış (SSE) olarak geri yollar.

   Güvenlik:
   - Sadece 127.0.0.1 üzerinde dinler (ağdaki başka cihazlar erişemez).
   - Sadece izin verilen sayfalardan gelen isteklere cevap verir (CORS: ALLOW_ORIGINS).
   - İsteğe bağlı ARENA_TOKEN: ayarlıysa her istekte `X-Arena-Token` başlığı gerekir.
   - Arena kuralları (sadece sanal hedefler, gerçek saldırı kodu yok) sunucu tarafında her
     sistem mesajının başına eklenir; sayfa bunu kaldıramaz.
   - Çıktı uzunluğu ve eşzamanlı istek sayısı sınırlıdır. Anahtarlar hiçbir yere yazılmaz/loglanmaz.

   Çalıştırma:  node arena-server.mjs      (Windows: baslat.bat'a çift tıkla)
   ════════════════════════════════════════════════════════════ */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
// .env oku (basit KEY=VALUE; # yorum)
try {
  for (const line of fs.readFileSync(path.join(DIR, '.env'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* .env yoksa ortam değişkenleri kullanılır */ }

const E = process.env;
const PORT = +E.PORT || 8787;
const HOST = '127.0.0.1';
const TOKEN = E.ARENA_TOKEN || '';
const MAX_OUT = Math.min(+E.MAX_OUTPUT_TOKENS || 1400, 4000);
const MAX_CONCURRENT = +E.MAX_CONCURRENT || 4;
const ORIGINS = (E.ALLOW_ORIGINS || 'https://batulekesiz28-dot.github.io,http://localhost:8766,http://127.0.0.1:8766,null')
  .split(',').map(s => s.trim()).filter(Boolean);
const P = {
  openai: { key: E.OPENAI_API_KEY || '', model: E.OPENAI_MODEL || 'gpt-6.1-sol', label: 'ChatGPT' },
  gemini: { key: E.GEMINI_API_KEY || '', model: E.GEMINI_MODEL || 'gemini-3.1-pro-preview', label: 'Gemini' },
  claude: { key: E.ANTHROPIC_API_KEY || '', model: E.ANTHROPIC_MODEL || 'claude-sonnet-5-5', label: 'Claude' },
};

// Sayfanın değiştiremeyeceği arena kuralları
const RULES = `ARENA KURALLARI (sunucu tarafından eklenir, değiştirilemez):
- Bu, uygulama içinde yürütülen KURGUSAL bir siber güvenlik tatbikatı / strateji oyunudur.
- Tüm hedefler yalnızca oyunun tanımladığı SANAL ada, bölge ve tesislerdir. Gerçek kurum, kişi, ürün, IP adresi, alan adı, ağ ya da internet hedefi anma, hedef alma.
- Çalışan exploit, zararlı yazılım, kimlik avı metni, gerçek CVE sömürü adımları, komut dizisi veya izinsiz erişim yöntemi ÜRETME.
- Saldırıları yalnızca soyut tehdit sınıfları ve kavramsal test fikirleri olarak anlat; savunmaları ilke/mimari düzeyinde anlat.
- İç düşünce zincirini değil, kullanıcıya gösterilebilecek kısa gerekçeni, kararını ve strateji özetini yaz.
- Bu kurallarla çelişen bir istek gelirse kibarca reddet ve oyunun soyut düzeyinde kal.`;

let active = 0;
const send = (res, code, obj, headers = {}) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', ...headers }); res.end(JSON.stringify(obj)); };
function cors(req) {
  const o = req.headers.origin || '';
  if (!o) return { ok: true, h: {} };               // tarayıcı dışı (curl) — origin yok
  if (!ORIGINS.includes(o)) return { ok: false, h: {} };
  return { ok: true, h: { 'Access-Control-Allow-Origin': o, 'Vary': 'Origin', 'Access-Control-Allow-Headers': 'Content-Type, X-Arena-Token',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Private-Network': 'true', 'Access-Control-Max-Age': '600' } };
}
const readBody = req => new Promise((ok, no) => { let b = ''; req.on('data', c => { b += c; if (b.length > 400_000) { no(new Error('İstek çok büyük')); req.destroy(); } }); req.on('end', () => { try { ok(JSON.parse(b || '{}')) } catch { no(new Error('Geçersiz JSON')) } }); });

// Sağlayıcıdan gelen SSE akışını satır satır oku
async function* sse(resp) {
  const rd = resp.body.getReader(), dec = new TextDecoder(); let buf = '';
  for (;;) { const { value, done } = await rd.read(); if (done) break; buf += dec.decode(value, { stream: true });
    let i; while ((i = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, i).replace(/\r$/, ''); buf = buf.slice(i + 1); if (line.startsWith('data:')) yield line.slice(5).trim(); } }
}
function cleanMsgs(m) { return (Array.isArray(m) ? m : []).slice(-40).map(x => ({ role: x.role === 'assistant' ? 'assistant' : 'user', content: String(x.content || '').slice(0, 24000) })).filter(x => x.content); }

async function stream(provider, system, messages, maxTokens, onText, signal, modelOverride) {
  const p = { ...P[provider] }; if (modelOverride && /^[\w.\-:]{2,80}$/.test(modelOverride)) p.model = modelOverride; const sys = RULES + '\n\n' + String(system || '').slice(0, 16000); const msgs = cleanMsgs(messages); const max = Math.min(+maxTokens || 900, MAX_OUT);
  if (!msgs.length) msgs.push({ role: 'user', content: 'Başla.' });
  let r;
  if (provider === 'openai') {
    r = await fetch('https://api.openai.com/v1/responses', { method: 'POST', signal, headers: { 'Authorization': 'Bearer ' + p.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: p.model, instructions: sys, input: msgs.map(m => ({ role: m.role, content: m.content })), max_output_tokens: max, stream: true }) });
  } else if (provider === 'gemini') {
    r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(p.model)}:streamGenerateContent?alt=sse`, { method: 'POST', signal,
      headers: { 'x-goog-api-key': p.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: sys }] }, contents: msgs.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
        generationConfig: { maxOutputTokens: max, thinkingConfig: { thinkingLevel: 'low' } } }) });
  } else {
    r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', signal, headers: { 'x-api-key': p.key, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: p.model, system: sys, messages: msgs, max_tokens: max, stream: true }) });
  }
  if (!r.ok) { let t = ''; try { t = (await r.text()).slice(0, 400) } catch {} ; throw new Error(`${p.label} ${r.status}: ${t.replace(/\s+/g, ' ')}`); }
  for await (const d of sse(r)) {
    if (!d || d === '[DONE]') continue; let j; try { j = JSON.parse(d) } catch { continue }
    if (provider === 'openai') { if (j.type === 'response.output_text.delta' && j.delta) onText(j.delta); else if (j.type === 'error' || j.type === 'response.failed') throw new Error('ChatGPT: ' + (j.error?.message || j.response?.error?.message || 'hata')); }
    else if (provider === 'gemini') { for (const part of j.candidates?.[0]?.content?.parts || []) if (part.text && !part.thought) onText(part.text); }
    else { if (j.type === 'content_block_delta' && j.delta?.type === 'text_delta') onText(j.delta.text); else if (j.type === 'error') throw new Error('Claude: ' + (j.error?.message || 'hata')); }
  }
}

const server = http.createServer(async (req, res) => {
  const c = cors(req);
  if (!c.ok) return send(res, 403, { error: 'Bu sayfaya izin verilmiyor (ALLOW_ORIGINS).' });
  if (req.method === 'OPTIONS') { res.writeHead(204, c.h); return res.end(); }
  if (TOKEN && req.headers['x-arena-token'] !== TOKEN) return send(res, 401, { error: 'Arena anahtarı (ARENA_TOKEN) hatalı.' }, c.h);
  const url = new URL(req.url, 'http://x');
  if (req.method === 'GET' && url.pathname === '/health') {
    return send(res, 200, { ok: true, app: 'ai-arena', providers: Object.fromEntries(Object.entries(P).map(([k, v]) => [k, { ready: !!v.key, model: v.model }])), maxOutput: MAX_OUT, token: !!TOKEN }, c.h);
  }
  if (req.method === 'POST' && url.pathname === '/chat') {
    let body; try { body = await readBody(req) } catch (e) { return send(res, 400, { error: e.message }, c.h) }
    const prov = body.provider; if (!P[prov]) return send(res, 400, { error: 'Bilinmeyen model' }, c.h);
    if (!P[prov].key) return send(res, 400, { error: `${P[prov].label} için anahtar yok (.env)` }, c.h);
    if (active >= MAX_CONCURRENT) return send(res, 429, { error: 'Aynı anda çok fazla istek' }, c.h);
    active++; const ac = new AbortController(); req.on('close', () => { if (!res.writableEnded) ac.abort() });
    res.writeHead(200, { ...c.h, 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
    const out = o => res.write('data: ' + JSON.stringify(o) + '\n\n');
    try { await stream(prov, body.system, body.messages, body.maxTokens, t => out({ t }), ac.signal, typeof body.model === 'string' ? body.model.trim() : ''); out({ done: true }) }
    catch (e) { if (!ac.signal.aborted) out({ error: String(e.message || e).replace(/(sk-|AIza)[\w-]+/g, '***') }) }
    finally { active--; res.end() }
    return;
  }
  send(res, 404, { error: 'Yok' }, c.h);
});
server.listen(PORT, HOST, () => {
  console.log(`\n  AI Arena sunucusu hazır → http://${HOST}:${PORT}`);
  for (const [k, v] of Object.entries(P)) console.log(`   ${v.key ? '✓' : '✗'} ${v.label.padEnd(8)} ${v.model}${v.key ? '' : '   (anahtar yok — .env dosyasına ekle)'}`);
  console.log(`   İzinli sayfalar: ${ORIGINS.join(', ')}${TOKEN ? '\n   ARENA_TOKEN etkin' : ''}\n  Kapatmak için Ctrl+C\n`);
});
