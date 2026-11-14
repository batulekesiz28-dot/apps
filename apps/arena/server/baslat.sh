#!/bin/sh
cd "$(dirname "$0")"
[ -f .env ] || { cp .env.example .env; echo ".env oluşturuldu — anahtarlarını ekle, sonra tekrar çalıştır."; exit 0; }
exec node arena-server.mjs
