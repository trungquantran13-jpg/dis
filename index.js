const { Client } = require('discord.js-selfbot-v13');
const { joinVoiceChannel } = require('@discordjs/voice');
const http = require('http');
const url = require('url');

// ===== BIẾN ĐẾM ĐƠN GIẢN =====
let totalVisits = 0;
let todayVisits = 0;
let currentDate = new Date().toISOString().split('T')[0]; // Lưu ngày hiện tại

// Reset đếm ngày mới nếu cần
function checkNewDay() {
    const today = new Date().toISOString().split('T')[0];
    if (today !== currentDate) {
        todayVisits = 0;
        currentDate = today;
        console.log(`[COUNTER] 📅 Ngày mới: ${today}, reset đếm hôm nay`);
    }
}

// Hàm tăng đếm
function incrementCounter() {
    checkNewDay();
    totalVisits++;
    todayVisits++;
    return {
        total: totalVisits,
        today: todayVisits,
        date: currentDate
    };
}

// ===== TẠO WEB SERVER =====
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // API lấy stats dạng JSON
    if (pathname === '/api/stats') {
        checkNewDay();
        res.writeHead(200, { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({
            totalVisits: totalVisits,
            todayVisits: todayVisits,
            currentDate: currentDate,
            status: 'online'
        }, null, 2));
        return;
    }

    // API reset counter
    if (pathname === '/api/reset') {
        const resetKey = parsedUrl.query.key;
        if (resetKey === process.env.RESET_KEY || resetKey === 'admin123') {
            totalVisits = 0;
            todayVisits = 0;
            currentDate = new Date().toISOString().split('T')[0];
            console.log('[COUNTER] 🔄 Đã reset counter');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                success: true, 
                message: 'Đã reset counter',
                totalVisits: 0,
                todayVisits: 0
            }));
            return;
        } else {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
        }
    }

    // Trang chính - Hiển thị counter
    if (pathname === '/' || pathname === '/index.html') {
        // Tăng đếm và lấy stats
        const stats = incrementCounter();
        
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Discord Voice Bot - Counter</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 50px;
            max-width: 500px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
        }
        .logo {
            font-size: 60px;
            margin-bottom: 10px;
        }
        h1 {
            color: #333;
            font-size: 24px;
            margin-bottom: 5px;
        }
        .subtitle {
            color: #999;
            font-size: 14px;
            margin-bottom: 30px;
        }
        .counter-box {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 15px;
            padding: 30px;
            margin: 20px 0;
        }
        .number {
            color: white;
            font-size: 64px;
            font-weight: bold;
            line-height: 1;
        }
        .label {
            color: rgba(255,255,255,0.8);
            font-size: 16px;
            margin-top: 10px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin: 20px 0;
        }
        .stat-item {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 10px;
        }
        .stat-number {
            font-size: 28px;
            font-weight: bold;
            color: #667eea;
        }
        .stat-label {
            color: #666;
            font-size: 13px;
            margin-top: 5px;
        }
        .status {
            display: inline-block;
            background: #28a745;
            color: white;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 13px;
            margin-top: 15px;
        }
        .footer {
            margin-top: 20px;
            font-size: 12px;
            color: #999;
        }
        .badge {
            background: #e9ecef;
            padding: 3px 12px;
            border-radius: 12px;
            font-size: 12px;
            color: #555;
            margin-top: 10px;
            display: inline-block;
        }
        @media (max-width: 480px) {
            .container { padding: 30px 20px; }
            .number { font-size: 48px; }
            .stat-number { font-size: 22px; }
            .stats-grid { gap: 10px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🎧</div>
        <h1>Discord Voice Bot</h1>
        <div class="subtitle">Giữ kết nối voice 24/7</div>

        <div class="counter-box">
            <div class="number">${stats.total}</div>
            <div class="label">📊 Tổng số lượt truy cập</div>
        </div>

        <div class="stats-grid">
            <div class="stat-item">
                <div class="stat-number">${stats.today}</div>
                <div class="stat-label">📅 Hôm nay (${stats.date})</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">${Math.floor(stats.total / (stats.today > 0 ? 1 : 1))}</div>
                <div class="stat-label">⏱️ Trung bình/ngày</div>
            </div>
        </div>

        <div>
            <span class="status">🟢 Bot đang hoạt động</span>
        </div>
        <div class="badge">
            ⏰ ${new Date().toLocaleString('vi-VN')}
        </div>

        <div class="footer">
            Powered by Discord.js Selfbot | ${process.env.RENDER ? 'Render.com' : 'Localhost'}
        </div>
    </div>

    <script>
        // Tự động reload mỗi 30s để cập nhật counter (cho cron job)
        setTimeout(() => {
            location.reload();
        }, 30000);
    </script>
</body>
</html>
        `);
        return;
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 - Not Found');
});

// ===== DISCORD VOICE BOT =====
const client = new Client();

client.on('ready', async () => {
    console.log(`[SYSTEM] ✅ Đã đăng nhập: ${client.user.tag}`);
    
    // Thay ID phòng Voice của bạn vào đây
    const channelId = '1438763948387209312';
    const channel = client.channels.cache.get(channelId);
    
    if (channel) {
        try {
            joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
                selfDeaf: true,
                selfMute: true
            });
            console.log(`[VOICE] ✅ Đã treo vào phòng: ${channel.name}`);
            console.log(`[COUNTER] 📊 Counter đang hoạt động tại: http://localhost:${PORT}`);
            console.log(`[COUNTER] 📈 Tổng visits: ${totalVisits} | Hôm nay: ${todayVisits}`);
        } catch (error) {
            console.error('[VOICE] ❌ Lỗi kết nối voice:', error);
        }
    } else {
        console.error(`[VOICE] ❌ Không tìm thấy phòng voice với ID: ${channelId}`);
        console.log('[VOICE] 📝 Các phòng voice có sẵn:');
        client.channels.cache.forEach(ch => {
            if (ch.type === 'GUILD_VOICE' || ch.type === 'voice') {
                console.log(`   - ${ch.name} (${ch.id})`);
            }
        });
    }
});

// ===== XỬ LÝ LỖI =====
client.on('error', (error) => {
    console.error('[CLIENT] ❌ Lỗi:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('[PROCESS] ❌ Unhandled Rejection:', error);
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`[SERVER] 🚀 Server đang chạy tại port ${PORT}`);
    console.log(`[SERVER] 📊 Xem counter tại: http://localhost:${PORT}`);
    console.log(`[SERVER] 📡 API stats: http://localhost:${PORT}/api/stats`);
});

// ===== LOGIN DISCORD =====
const token = process.env.DISCORD_TOKEN;
if (!token) {
    console.error('[ERROR] ❌ Thiếu DISCORD_TOKEN trong biến môi trường!');
    process.exit(1);
}

client.login(token).catch(err => {
    console.error('[ERROR] ❌ Đăng nhập Discord thất bại:', err);
});