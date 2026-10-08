const { Client } = require('discord.js-selfbot-v13');
const { joinVoiceChannel } = require('@discordjs/voice');
const http = require('http');

// =========================
// 1. WEB SERVER (Giữ cho Render hoạt động)
// =========================
let visitCount = 0;

const server = http.createServer((req, res) => {
    visitCount++;
    console.log(`[WEB] Request #${visitCount} | ${req.method} ${req.url}`);

    if (req.url === '/' || req.url === '/ping') {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`Discord Voice Bot is Running!\nRequests: ${visitCount}\n`);
        return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`[SERVER] Listening on port ${PORT}`);
});

// =========================
// 2. DISCORD SELFBOT CONFIG
// =========================
const VOICE_CHANNEL_ID = '1438763948387209312';

const client = new Client({
    checkUpdate: false,
    ws: {
        properties: {
            $os: 'Windows',
            $browser: 'Discord Client',$device: 'desktop'
        }
    }
});

// --- IN BẮT LỖI CHI TIẾT (DEBUG LOGS) ---
client.on('debug', (info) => {
    console.log(`[DISCORD DEBUG] ${info}`);
});

client.on('error', (error) => {
    console.error('[DISCORD ERROR]', error);
});

client.on('warn', (info) => {
    console.warn('[DISCORD WARN]', info);
});

client.on('shardDisconnect', (event, id) => {
    console.error(`[DISCORD DISCONNECT] Shard ${id} bị ngắt kết nối: Code ${event.code} | Reason: ${event.reason}`);
});

// --- KHI ĐĂNG NHẬP THÀNH CÔNG ---
client.on('ready', async () => {
    console.log(`[SYSTEM] Đã đăng nhập thành công: ${client.user.tag}`);

    try {
        const channel = await client.channels.fetch(VOICE_CHANNEL_ID).catch((err) => {
            console.error('[VOICE ERROR] Lỗi khi fetch channel:', err.message);
            return null;
        });

        if (!channel) {
            console.error(`[VOICE ERROR] Không tìm thấy kênh ID ${VOICE_CHANNEL_ID}!`);
            return;
        }

        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
            selfDeaf: true,
            selfMute: true
        });

        console.log(`[VOICE SUCCESS] Đã kết nối vào phòng: ${channel.name}`);
    } catch (err) {
        console.error('[VOICE EXCEPTION]', err);
    }
});

// =========================
// 3. ĐĂNG NHẬP
// =========================
const token = process.env.DISCORD_TOKEN;

if (!token) {
    console.error('[CONFIG ERROR] Không tìm thấy DISCORD_TOKEN trong biến môi trường!');
} else {
    console.log('[SYSTEM] Bắt đầu gửi request đăng nhập tới Discord...');
    client.login(token).catch(err => {
        console.error('[LOGIN FAILURE] Đăng nhập thất bại:', err);
    });
}
