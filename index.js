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

    // Endpoint chính cho cron job / UptimeRobot
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
const client = new Client({ checkUpdate: false });
const VOICE_CHANNEL_ID = '1438763948387209312';

client.on('ready', async () => {
    console.log(`[SYSTEM] Đã đăng nhập: ${client.user.tag}`);

    try {
        // Dùng fetch thay vì cache.get để đảm bảo lấy được Channel kể cả khi Render mới khởi động
        const channel = await client.channels.fetch(VOICE_CHANNEL_ID).catch(() => null);

        if (channel) {
            joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
                selfDeaf: true,
                selfMute: true
            });

            console.log(`[VOICE] Đã treo vào phòng: ${channel.name} (Server: ${channel.guild.name})`);
        } else {
            console.error(`[VOICE] Không tìm thấy channel ID ${VOICE_CHANNEL_ID}! Kiểm tra xem tài khoản phụ đã JOIN Server chưa.`);
        }
    } catch (err) {
        console.error('[VOICE] Lỗi khi tham gia phòng Voice:', err);
    }
});

// =========================
// LOGIN WITH CHECK
// =========================
const token = process.env.DISCORD_TOKEN;

if (!token) {
    console.error('[LỖI] Không tìm thấy DISCORD_TOKEN trong biến môi trường!');
} else {
    console.log('[SYSTEM] Đang gửi yêu cầu đăng nhập Discord...');
    client.login(token).catch(err => {
        console.error('[LỖI ĐĂNG NHẬP]: Token sai hoặc tài khoản bị dính Capcha/Checkpoit:', err.message);
    });
}
