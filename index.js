const express = require('express');
const { fork } = require('child_process');
const app = express();

app.get('/', (req, res) => res.send('Bot Active'));
app.get('/health', (req, res) => res.status(200).send('OK'));

const PORT = process.env.PORT || 7860;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Web Server running on port ${PORT}`);
    
    // Fork menjalankan bot sebagai proses yang benar-benar terpisah
    const startBot = () => {
        const bot = fork('./bot.js');
        
        bot.on('exit', (code) => {
            console.log(`Bot terhenti (code ${code}). Restarting dalam 5 detik...`);
            setTimeout(startBot, 5000);
        });
    };
    startBot();
});