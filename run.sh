#!/bin/bash
# Jalankan bot dengan auto-restart kalau crash
# Delay 3 detik sebelum restart

while true
do
  echo "🚀 Menjalankan bot..."
  node index.js
  echo "❌ Bot crash / berhenti. Restart dalam 3 detik..."
  sleep 3
done