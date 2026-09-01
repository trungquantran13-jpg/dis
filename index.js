const { Client } = require('discord.js-selfbot-v13');
const { joinVoiceChannel } = require('@discordjs/voice');
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

// ===== CONFIG =====
const DATA_FILE = path.join(__dirname, 'visit_stats.json');

// ===== QUẢN LÝ THỐNG KÊ =====
class VisitStats {
    constructor() {
        this.data = this.loadData();
        this.today = this.getToday();
    }

    getToday() {
        return new Date().toISOString().split('T')[0];
    }

    loadData() {
        try {
            if (fs.existsSync(DATA_FILE)) {
                const raw = fs.readFileSync(DATA_FILE);
                return JSON.parse(raw);
            }
        } catch (err) {
            console.log('[STATS] Không thể đọc file stats, tạo mới');
        }
        return {
            totalVisits: 0,
            dailyVisits: {},
            lastVisit: null,
            uniqueIPs: {}
        };
    }

    saveData() {
        try {
            fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2));
        } catch (err) {
            console.error('[STATS] Lỗi lưu stats:', err);
        }
    }

    addVisit(ip) {
        const today = this.getToday();
        
        // Tăng tổng visits
        this.data.totalVisits++;
        
        // Tăng daily visits
        if (!this.data.dailyVisits[today]) {
            this.data.dailyVisits[today] = 0;
        }
        this.data.dailyVisits[today]++;
        
        // Lưu IP (đếm unique)
        if (!this.data.uniqueIPs[ip]) {
            this.data.uniqueIPs[ip] = 0;
        }
        this.data.uniqueIPs[ip]++;
        
        // Cập nhật thời gian truy cập cuối
        this.data.lastVisit = new Date().toISOString();
        
        this.saveData();
        return this.getStats();
    }

    getStats() {
        const today = this.getToday();
        const totalIPs = Object.keys(this.data.uniqueIPs).length;
        
        return {
            totalVisits: this.data.totalVisits,
            todayVisits: this.data.dailyVisits[today] || 0,
            uniqueIPs: totalIPs,
            lastVisit: this.data.lastVisit,
            dailyHistory: this.data.dailyVisits,
            topIPs: this.getTopIPs(5)
        };
    }

    getTopIPs(limit = 5) {
        return Object.entries(this.data.uniqueIPs)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([ip, count]) => ({ ip, count }));
    }
}

// ===== KHỞI TẠO STATS =====
const stats = new VisitStats();

// ===== TẠO WEB SERVER =====
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const clientIP = req.headers['x-forwarded-for']?.split(',')[0] || 
                     req.socket.remoteAddress || 
                     'unknown';

    // API endpoint để lấy stats dạng JSON
    if (pathname === '/api/stats') {
        res.writeHead(200, { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify(stats.getStats(), null, 2));
        return;
    }

    // API reset stats (nếu cần)
    if (pathname === '/api/reset' && req.method === 'POST') {
        // Có thể thêm xác thực đơn giản
        const resetKey = parsedUrl.query.key;
        if (resetKey === process.env.RESET_KEY || resetKey === 'admin123') {
            // Lưu lại dữ liệu cũ
            const oldData = stats.data;
            // Reset
            stats.data = {
                totalVisits: 0,
                dailyVisits: {},
                lastVisit: null,
                uniqueIPs: {}
            };
            stats.saveData();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                success: true, 
                message: 'Stats đã được reset',
                oldStats: oldData 
            }));
            return;
        } else {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
        }
    }

    // Trang chính - Hiển thị stats đẹp
    if (pathname === '/' || pathname === '/index.html') {
        // Ghi nhận visit
        const currentStats = stats.addVisit(clientIP);
        
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Discord Voice Bot Stats</title>
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
            padding: 40px;
            max-width: 600px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 {
            color: #333;
            font-size: 28px;
            text-align: center;
            margin-bottom: 10px;
        }
        .subtitle {
            text-align: center;
            color: #666;
            margin-bottom: 30px;
            font-size: 14px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            transition: transform 0.2s;
        }
        .stat-card:hover {
            transform: translateY(-2px);
        }
        .stat-number {
            font-size: 32px;
            font-weight: bold;
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .stat-label {
            color: #666;
            font-size: 13px;
            margin-top: 5px;
        }
        .last-visit {
            background: #f0f0f0;
            padding: 12px;
            border-radius: 8px;
            text-align: center;
            font-size: 13px;
            color: #555;
            margin-bottom: 20px;
        }
        .top-ips {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
        }
        .top-ips h3 {
            color: #333;
            font-size: 14px;
            margin-bottom: 10px;
        }
        .ip-item {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            border-bottom: 1px solid #eee;
            font-size: 13px;
        }
        .ip-item:last-child {
            border-bottom: none;
        }
        .ip-address {
            color: #333;
        }
        .ip-count {
            color: #666;
            font-weight: bold;
        }
        .status {
            display: inline-block;
            background: #28a745;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            margin-top: 15px;
        }
        .footer {
            text-align: center;
            margin-top: 20px;
            font-size: 12px;
            color: #999;
        }
        .badge {
            background: #e9ecef;
            padding: 2px 10px;
            border-radius: 12px;
            font-size: 11px;
            color: #555;
        }
        @media (max-width: 480px) {
            .container { padding: 20px; }
            .stats-grid { grid-template-columns: 1fr; }
            .stat-number { font-size: 28px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎧 Discord Voice Bot</h1>
        <div class="subtitle">
            <span class="badge">🟢 Online</span>
            <span style="margin-left: 10px;">${new Date().toLocaleString('vi-VN')}</span>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">${currentStats.totalVisits}</div>
                <div class="stat-label">📊 Tổng truy cập</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${currentStats.todayVisits}</div>
                <div class="stat-label">📅 Hôm nay</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${currentStats.uniqueIPs}</div>
                <div class="stat-label">👤 IP duy nhất</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${Object.keys(currentStats.dailyHistory).length}</div>
                <div class="stat-label">📆 Số ngày hoạt động</div>
            </div>
        </div>

        ${currentStats.lastVisit ? `
        <div class="last-visit">
            🕐 Lần truy cập cuối: ${new Date(currentStats.lastVisit).toLocaleString('vi-VN')}
        </div>
        ` : ''}

        <div class="top-ips">
            <h3>🔥 Top IP truy cập nhiều nhất</h3>
            ${currentStats.topIPs.length > 0 ? 
                currentStats.topIPs.map(ip => `
                    <div class="ip-item">
                        <span class="ip-address">${ip.ip}</span>
                        <span class="ip-count">${ip.count} lượt</span>
                    </div>
                `).join('') : 
                '<div style="text-align:center;color:#999;padding:10px;">Chưa có dữ liệu</div>'
            }
        </div>

        <div style="text-align:center;margin-top:15px;">
            <span class="status">✅ Bot đang hoạt động</span>
        </div>

        <div class="footer">
            Powered by Discord.js Selfbot v13 | Render.com
        </div>
    </div>
</body>
</html>
        `);
        return;
    }

    // 404
    res.writeHead(404);
    res.end('Not Found');
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
            const connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
                selfDeaf: true,
                selfMute: true
            });
            console.log(`[VOICE] ✅ Đã treo vào phòng: ${channel.name}`);
            console.log(`[VOICE] 📊 Stats sẽ được cập nhật tại: http://localhost:${PORT}`);
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
    console.error('[CLIENT] Lỗi:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('[PROCESS] Unhandled Rejection:', error);
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`[SERVER] 🚀 Server đang chạy tại port ${PORT}`);
    console.log(`[SERVER] 📊 Xem stats tại: http://localhost:${PORT}`);
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