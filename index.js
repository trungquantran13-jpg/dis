const { Client } = require('discord.js-selfbot-v13');
const { joinVoiceChannel } = require('@discordjs/voice');
const http = require('http');

// =========================
// 1. WEB SERVER (Giữ cho Render luôn hoạt động)
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

    if (req.url === '/stats') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ status: 'online', requests: visitCount }));
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

// Bắt lỗi WebSocket để tránh crash hoặc đứng ngầm
client.on('error', (error) => {
    console.error('[LỖI DISCORD CLIENT]:', error.message);
});

client.on('shardDisconnect', () => {
    console.log('[SYSTEM] Mất kết nối Discord, đang kết nối lại...');
});

client.on('ready', async () => {
    console.log(`[SYSTEM] Đã đăng nhập thành công: ${client.user.tag}`);

    try {
        // Lấy thông tin kênh từ Discord
        const channel = await client.channels.fetch(VOICE_CHANNEL_ID).catch(() => null);

        if (!channel) {
            console.error(`[VOICE] Không tìm thấy kênh ID ${VOICE_CHANNEL_ID}! Kiểm tra tài khoản đã join server chưa.`);
            return;
        }

        if (!channel.isVoice()) {
            console.error(`[VOICE] ID ${VOICE_CHANNEL_ID} không phải là phòng Voice!`);
            return;
        }

        // Thực hiện kết nối vào Voice Channel
        joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
            selfDeaf: true,
            selfMute: true
        });

        console.log(`[VOICE] Đã treo thành công vào phòng: ${channel.name} (Server: ${channel.guild.name})`);
    } catch (err) {
        console.error('[VOICE] Lỗi kết nối Voice:', err);
    }
});

// =========================
// 3. ĐĂNG NHẬP
// =========================
const token = process.env.DISCORD_TOKEN;

if (!token) {
    console.error('[LỖI] Chưa cài đặt DISCORD_TOKEN trong Environment Variables trên Render!');
} else {
    console.log('[SYSTEM] Đang gửi yêu cầu đăng nhập Discord...');
    client.login(token).catch(err => {
        console.error('[LỖI LOGIN]:', err.message);
    });
}
