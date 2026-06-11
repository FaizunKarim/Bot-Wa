const { google } = require('googleapis');
const fs = require('fs');
const readline = require('readline');

const credentials = JSON.parse(fs.readFileSync('credentials.json'));
const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;

const oAuth2Client = new google.auth.OAuth2(
  client_id, client_secret, redirect_uris[0]
);

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly'
];

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
});

console.log('\n1. Buka link ini jika belum login:');
console.log(authUrl);

// Membuat input terminal agar kamu bisa mem-paste kode
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log('\n==================================================');
rl.question('2. Paste KODE yang kamu dapatkan dari URL browser ke sini:\n> ', (code) => {
  // Menukarkan kode dengan Token permanen
  oAuth2Client.getToken(decodeURIComponent(code), (err, token) => {
    if (err) {
      console.error('Gagal mendapatkan token. Pastikan kodenya benar!', err.message);
      return rl.close();
    }
    
    // Menyimpan token ke file
    fs.writeFileSync('token.json', JSON.stringify(token));
    console.log('\n==================================================');
    console.log('BERHASIL! File token.json sudah terbuat di folder kamu.');
    console.log('Sekarang bot-mu punya akses permanen ke Kalender & Gmail!');
    console.log('==================================================\n');
    rl.close();
  });
});