# Gunakan base image Node.js yang ringan
FROM node:20-slim

# Install dependensi sistem yang dibutuhkan oleh Baileys/Puppeteer (jika nanti perlu)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Tentukan folder kerja
WORKDIR /app

# Salin package.json dan install dependensi
COPY package*.json ./
RUN npm install --production

# Salin semua source code
COPY . .

# Buat folder untuk session agar tidak error
RUN mkdir -p wa_session

# Jalankan bot
CMD ["node", "-e", "try { require('./index.js'); } catch(e) { console.error('CRITICAL ERROR:', e); setTimeout(() => {}, 1000000); }"]