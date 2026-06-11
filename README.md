
---
title: Bot WA Gweh
emoji: 🌍
colorFrom: yellow
colorTo: blue
sdk: docker
pinned: false
---


# 🤖 Bot WhatsApp Personal Assistant

Asisten virtual pribadi berbasis WhatsApp yang terintegrasi dengan Google Gemini, Gmail, dan Google Calendar. Sistem ini dirancang untuk otomasi harian, pengelolaan jadwal, dan triage email masuk secara aman.

## 🚀 Fitur Utama
- **AI Router**: Menggunakan Gemini 3.1 Flash-Lite untuk memahami perintah natural.
- **Gmail Automation**: Cek email masuk terbaru langsung via chat.
- **Calendar Sync**: Sinkronisasi jadwal harian.
- **Otomasi Harian**: Ringkasan pagi otomatis via Cron Job.
- **Keamanan Berlapis**: Hanya nomor admin yang terdaftar yang bisa mengakses data sensitif.
- **Self-Maintaining**: Sesi autentikasi aman dengan `baileys` multi-file auth.

## 🛠️ Setup Lokal
1. Pastikan Node.js 20+ terinstal.
2. Clone repo ini dan jalankan `npm install`.
3. Buat file `.env` dengan isi:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```
4. Letakkan `credentials.json` dan `token.json` di folder utama jika dibutuhkan.
5. Jalankan bot dengan `npm start`.

## 🚀 Persiapan Deployment
1. **Node.js**: Pastikan versi 20+ terinstal.
2. **Environment Variables**: Buat file `.env` dan tambahkan `GEMINI_API_KEY`.
3. **Google API**:
   - Letakkan `credentials.json` dan `token.json` di folder utama.
   - **PERINGATAN**: Pastikan file ini ada di `.gitignore`.
4. Untuk deployment di Hugging Face Spaces, gunakan konfigurasi Docker yang tersedia di repo.

## 📦 Instalasi
```bash
git clone <url-repo-kamu>
cd <folder-bot>
npm install
npm start
```