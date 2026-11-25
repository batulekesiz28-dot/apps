#!/usr/bin/env bash
# JARVIS (macOS / Linux): ilk çalıştırmada gerekenleri kurar, sonra başlatır.
cd "$(dirname "$0")"
command -v python3 >/dev/null || { echo "python3 bulunamadı. https://www.python.org/downloads/"; exit 1; }
if [ ! -x .venv/bin/python ]; then
  echo "İlk kurulum: gerekenler indiriliyor, bir kez sürer..."
  python3 -m venv .venv && .venv/bin/python -m pip install -q --upgrade pip && .venv/bin/python -m pip install -q -r requirements.txt && .venv/bin/python -m playwright install chromium
fi
exec .venv/bin/python jarvis.py "$@"
