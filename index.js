require('dotenv').config();
const https = require('https');
const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { google } = require('googleapis');
const cron = require('node-cron');

const app = express();
app.get('/', (req, res) => res.send('Bot Active'));
app.get('/health', (req, res) => res.status(200).send('OK'));
app.listen(7860, '0.0.0.0');

(async () => {
    // Jalankan init setelah server hidup
    try { await initGoogleServices(); } catch (e) { console.error(e); }
    await connectToWhatsApp();
})();

const ADMIN_NUMBERS = ['6285654448411', '6285643270067', '78086934687993'];
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const systemPrompt = `Kamu adalah OpenClaw, asisten virtual pribadi milik Faizun Karim.
Tugas utamamu merespons chat dan menjadi router untuk mengeksekusi sistem.

ATURAN ROUTING:
1. Jika user ingin cek/baca email, balas: [ACTION_CEK_EMAIL]
2. Jika user ingin cek jadwal, balas: [ACTION_CEK_KALENDER]
3. Jika user ingin kirim email, balas: [ACTION_TULIS_EMAIL|penerima|subjek|isi]
4. Jika user ingin tambah jadwal, balas: [ACTION_TULIS_KALENDER|judul|waktu(ISO)]
5. Jika maksud user kurang jelas, tanya konfirmasi.
6. Jika di luar itu, balas natural sebagai asisten cerdas.`;

const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite", systemInstruction: systemPrompt });

let gmail, calendar;

async function initGoogleServices() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.github.com',
            path: `/gists/${process.env.GIST_ID}`,
            headers: { 'Authorization': `token ${process.env.GIST_TOKEN}`, 'User-Agent': 'Node-Bot' }
        };
        https.get(options, (res) => {
            let data = '';
            res.on('data', (c) => data += c);
            res.on('end', () => {
                try {
                    const gist = JSON.parse(data);
                    const firstFileKey = Object.keys(gist.files)[0];
                    const config = JSON.parse(gist.files[firstFileKey].content);
                    const { client_id, client_secret, redirect_uris } = config.credentials.installed || config.credentials.web;
                    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
                    oAuth2Client.setCredentials(config.token);
                    gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
                    calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
                    console.log("OPENCLAW SECURE SYSTEM ONLINE!");
                    resolve();
                } catch (e) { reject(e); }
            });
        }).on('error', reject);
    });
}

const chatSessions = {};

async function cekEmailBaru() {
    try {
        const res = await gmail.users.messages.list({ userId: 'me', maxResults: 3, q: 'is:unread' });
        if (!res.data.messages) return "Kotak masuk bersih.";
        let hasil = "📩 *3 Email Terbaru:*\n\n";
        for (let m of res.data.messages.slice(0, 3)) {
            const mail = await gmail.users.messages.get({ userId: 'me', id: m.id });
            const headers = mail.data.payload.headers;
            hasil += `*Dari:* ${headers.find(h => h.name === 'From')?.value.split('<')[0]}\n*Subjek:* ${headers.find(h => h.name === 'Subject')?.value}\n---\n`;
        }
        return hasil;
    } catch (e) { return `Gagal email: ${e.message}`; }
}

async function kirimEmail(to, subject, body) {
    try {
        const raw = `To: ${to}\r\nSubject: ${subject}\r\n\r\n${body}`;
        const base64 = Buffer.from(raw).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
        await gmail.users.messages.send({ userId: 'me', requestBody: { raw: base64 } });
        return "✅ Email berhasil dikirim.";
    } catch (e) { return `Gagal kirim email: ${e.message}`; }
}

async function cekKalender() {
    try {
        const res = await calendar.events.list({ calendarId: 'primary', timeMin: (new Date()).toISOString(), maxResults: 5, singleEvents: true, orderBy: 'startTime' });
        if (!res.data.items.length) return "Tidak ada agenda.";
        let hasil = "📅 *Jadwal Mendatang:*\n\n";
        res.data.items.forEach((e, i) => hasil += `*${i + 1}. ${e.summary}*\n`);
        return hasil;
    } catch (e) { return `Gagal kalender: ${e.message}`; }
}

async function tulisKalender(summary, startTime) {
    try {
        await calendar.events.insert({
            calendarId: 'primary',
            requestBody: { summary, start: { dateTime: startTime }, end: { dateTime: new Date(new Date(startTime).getTime() + 3600000).toISOString() } }
        });
        return `✅ Jadwal "${summary}" berhasil ditambahkan.`;
    } catch (e) { return `Gagal tambah jadwal: ${e.message}`; }
}

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('wa_session');
    const sock = makeWASocket({ auth: state, logger: pino({ level: 'silent' }), browser: ["OpenClawBot", "Chrome", "1.0.0"] });

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) qrcode.generate(qr, { small: true });
        if (connection === 'close') {
            if (lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut) connectToWhatsApp();
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify') return;
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
        const sender = msg.key.remoteJid;
        
        if (text) {
            try {
                await sock.sendPresenceUpdate('composing', sender);
                if (!chatSessions[sender]) chatSessions[sender] = model.startChat();
                
                const remoteJid = await sock.onWhatsApp(sender);
                const actualNumber = remoteJid && remoteJid.length > 0 ? remoteJid[0].jid.split('@')[0] : sender.replace(/\D/g, '');
                const isAuthorized = ADMIN_NUMBERS.some(adminNum => actualNumber.includes(adminNum));
                
                const result = await chatSessions[sender].sendMessage(text);
                const reply = result.response.text().trim();

                if (!isAuthorized) {
                    await sock.sendMessage(sender, { text: "⛔ Akses ditolak." });
                    return;
                }

                if (reply.includes('[ACTION_CEK_EMAIL]')) {
                    await sock.sendMessage(sender, { text: await cekEmailBaru() });
                } else if (reply.includes('[ACTION_TULIS_EMAIL]')) {
                    const [_, to, sub, body] = reply.split('|');
                    await sock.sendMessage(sender, { text: await kirimEmail(to, sub, body) });
                } else if (reply.includes('[ACTION_CEK_KALENDER]')) {
                    await sock.sendMessage(sender, { text: await cekKalender() });
                } else if (reply.includes('[ACTION_TULIS_KALENDER]')) {
                    const [_, summary, time] = reply.split('|');
                    await sock.sendMessage(sender, { text: await tulisKalender(summary, time) });
                } else {
                    await sock.sendMessage(sender, { text: reply });
                }
            } catch (e) {
                await sock.sendMessage(sender, { text: "Sistem kendala teknis." });
            }
        }
    });
}

(async () => {
    try { await initGoogleServices(); } catch (e) { console.error("Gagal init Gist:", e.message); }
    await connectToWhatsApp();
})();