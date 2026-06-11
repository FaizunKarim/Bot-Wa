require('dotenv').config();
const https = require('https');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { google } = require('googleapis');

const ADMIN_NUMBERS = ['6285654448411', '6285643270067', '78086934687993'];
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite", systemInstruction: `Kamu adalah OpenClaw, asisten virtual milik Faizun Karim.
ATURAN ROUTING:
1. Cek email: [ACTION_CEK_EMAIL]
2. Cek jadwal: [ACTION_CEK_KALENDER]
3. Kirim email: [ACTION_TULIS_EMAIL|penerima|subjek|isi]
4. Tambah jadwal: [ACTION_TULIS_KALENDER|judul|waktu(ISO)]` });

let gmail, calendar;
const chatSessions = {};

async function initGoogleServices() {
    return new Promise((resolve, reject) => {
        const options = { hostname: 'api.github.com', path: `/gists/${process.env.GIST_ID}`, headers: { 'Authorization': `token ${process.env.GIST_TOKEN}`, 'User-Agent': 'Node-Bot' } };
        https.get(options, (res) => {
            let data = '';
            res.on('data', (c) => data += c);
            res.on('end', () => {
                try {
                    const gist = JSON.parse(data);
                    const config = JSON.parse(gist.files[Object.keys(gist.files)[0]].content);
                    const oAuth2Client = new google.auth.OAuth2(config.credentials.installed.client_id, config.credentials.installed.client_secret, config.credentials.installed.redirect_uris[0]);
                    oAuth2Client.setCredentials(config.token);
                    gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
                    calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
                    resolve();
                } catch (e) { reject(e); }
            });
        }).on('error', reject);
    });
}

async function kirimEmail(to, sub, body) {
    try {
        const raw = `To: ${to}\r\nSubject: ${sub}\r\n\r\n${body}`;
        const b64 = Buffer.from(raw).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
        await gmail.users.messages.send({ userId: 'me', requestBody: { raw: b64 } });
        return "✅ Email terkirim.";
    } catch (e) { return `Error: ${e.message}`; }
}

async function tulisKalender(summary, startTime) {
    try {
        await calendar.events.insert({ calendarId: 'primary', requestBody: { summary, start: { dateTime: startTime }, end: { dateTime: new Date(new Date(startTime).getTime() + 3600000).toISOString() } } });
        return `✅ Jadwal "${summary}" ditambah.`;
    } catch (e) { return `Error: ${e.message}`; }
}

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('wa_session');
    const sock = makeWASocket({ auth: state, logger: pino({ level: 'silent' }), browser: ["OpenClawBot", "Chrome", "1.0.0"] });
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify' || m.messages[0].key.fromMe) return;
        const msg = m.messages[0];
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
        const sender = msg.key.remoteJid;
        if (!text) return;
        try {
            const actualNumber = (await sock.onWhatsApp(sender))?.[0]?.jid.split('@')[0] || sender.replace(/\D/g, '');
            if (!ADMIN_NUMBERS.some(num => actualNumber.includes(num))) return await sock.sendMessage(sender, { text: "⛔ Akses ditolak." });
            if (!chatSessions[sender]) chatSessions[sender] = model.startChat();
            const reply = (await chatSessions[sender].sendMessage(text)).response.text().trim();
            if (reply.includes('[ACTION_CEK_EMAIL]')) await sock.sendMessage(sender, { text: await (async () => { const res = await gmail.users.messages.list({userId:'me',q:'is:unread'}); return res.data.messages ? "Ada email baru." : "Bersih."; })() });
            else if (reply.includes('[ACTION_TULIS_EMAIL]')) { const [_, to, s, b] = reply.split('|'); await sock.sendMessage(sender, { text: await kirimEmail(to, s, b) }); }
            else if (reply.includes('[ACTION_TULIS_KALENDER]')) { const [_, sum, t] = reply.split('|'); await sock.sendMessage(sender, { text: await tulisKalender(sum, t) }); }
            else await sock.sendMessage(sender, { text: reply });
        } catch (e) { console.error(e); }
    });
}

(async () => { await initGoogleServices(); await connectToWhatsApp(); })();