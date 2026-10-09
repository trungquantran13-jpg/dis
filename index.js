const { Client } = require('discord.js-selfbot-v13');
const { joinVoiceChannel } = require('@discordjs/voice');
const http = require('http');

// =========================
// WEB SERVER + REQUEST COUNTER
// =========================
let visitCount = 0;

const server = http.createServer((req, res) => {
    visitCount++;

    console.log(`[WEB] Request #${visitCount} | ${req.method} ${req.url}`);

    // Endpoint chính cho cron job
    if (req.url === '/' || req.url === '/ping') {
        res.writeHead(200, {
            'Content-Type': 'text/plain; charset=utf-8'
        });

        res.end(
            `Discord Voice Bot is Running!\n` +
            `Requests: ${visitCount}\n`
        );
        return;
    }

    // Endpoint xem số lượt truy cập
    if (req.url === '/stats') {
        res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8'
        });

        res.end(JSON.stringify({
            status: 'online',
            requests: visitCount
        }));
        return;
    }

    res.writeHead(404, {
        'Content-Type': 'text/plain; charset=utf-8'
    });

    res.end('Not Found');
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`[SERVER] Listening on port ${PORT}`);
});

// =========================
// DISCORD VOICE
// =========================
const client = new Client();

client.on('ready', async () => {
    console.log(`[SYSTEM] Đã đăng nhập: ${client.user.tag}`);

    const channel = client.channels.cache.get('1438763948387209312');

    if (channel) {
        joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
            selfDeaf: true,
            selfMute: true
        });

        console.log(`[VOICE] Đã treo vào phòng: ${channel.name}`);
    } else {
        console.log('[VOICE] Không tìm thấy channel!');
    }
});

// =========================
// LOGIN
// =========================
client.login(process.env.DISCORD_TOKEN);
