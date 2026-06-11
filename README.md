# 🤖 Bot WhatsApp Personal Assistant (WhatsApp Bot)

Asisten virtual pribadi berbasis WhatsApp yang terintegrasi dengan Google Gemini, Gmail, dan Google Calendar. Sistem ini dirancang untuk otomasi harian, pengelolaan jadwal, dan triage email masuk secara aman.

## 🛠️ Fitur
- **AI Agent Router**: Menggunakan Gemini 3.1 Flash-Lite untuk memahami niat pengguna.
- **Gmail & Calendar Integration**: Cek email dan jadwal rapat langsung via WhatsApp.
- **Cron Job Automation**: Laporan harian otomatis setiap pukul 07:00 WIB.
- **Security Hardening**:
  - Filter akses nomor admin (whitelist).
  - Isolasi chat grup (bot hanya merespons chat pribadi).
  - Anti-Prompt Injection untuk keamanan AI.
- **Self-Maintaining**: Sesi autentikasi aman dengan `baileys` multi-file auth.

## 🚀 Persiapan Deployment
1. **Node.js**: Pastikan versi 20+ terinstal.
2. **Environment Variables**: Buat file `.env` dan tambahkan `GEMINI_API_KEY`.
3. **Google API**:
   - Letakkan `credentials.json` dan `token.json` di folder utama.
   - **PERINGATAN**: Pastikan file ini ada di `.gitignore`.

## 📦 Instalasi
```bash
# Clone repo
git clone <url-repo-kamu>
cd <folder-bot>

# Install dependencies
npm install

# Jalankan bot
npm start
