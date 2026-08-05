const { Client } = require('discord.js-selfbot-v13');
const { joinVoiceChannel } = require('@discordjs/voice');
const http = require('http');

// 1. Tạo Web Server giả lập cho Render
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Discord Voice Bot is Running!\n');
});
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[SERVER] Listening on port ${PORT}`);
});

// 2. Code treo Voice Discord của bạn
const client = new Client();

client.on('ready', async () => {
    console.log(`[SYSTEM] Đã đăng nhập: ${client.user.tag}`);
    
    // Thay ID phòng Voice của bạn vào đây
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
    }
});

// Đăng nhập bằng Token từ biến môi trường
client.login(process.env.DISCORD_TOKEN);