// =========================
// KHỞI TẠO VÀ PHỤ THUỘC
// =========================
const { Client } = require('@trickstarcandina/discordjs-selfbot');
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    StreamType,
    generateDependencyReport
} = require('@discordjs/voice');
const http = require('http');
const fs = require('fs');
const path = require('path');

// =========================
// KIỂM TRA PHỤ THUỘC (QUAN TRỌNG)
// =========================
// Kiểm tra xem thư viện DAVE đã được tải thành công chưa
try {
    require('@snazzah/davey');
    console.log('[DAVE] Thư viện mã hóa @snazzah/davey đã tải thành công');
} catch (err) {
    console.error('[DAVE] Lỗi nghiêm trọng: Không thể tải @snazzah/davey');
    console.error('[DAVE] Kết nối voice sẽ thất bại vì thiếu hỗ trợ DAVE');
    console.error('[DAVE] Vui lòng đảm bảo đã chạy: npm i @snazzah/davey');
    process.exit(1);
}

// In báo cáo phụ thuộc voice để gỡ lỗi
console.log('[VOICE] Báo cáo phụ thuộc:');
console.log(generateDependencyReport());

// =========================
// MÁY CHỦ WEB + BỘ ĐẾM YÊU CẦU
// =========================
let visitCount = 0;

const server = http.createServer((req, res) => {
    visitCount++;
    console.log(`[WEB] Yêu cầu #${visitCount} | ${req.method} ${req.url}`);

    if (req.url === '/' || req.url === '/ping') {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(
            `Discord Voice Bot đang chạy!\n` +
            `Số yêu cầu: ${visitCount}\n` +
            `DAVE: đã bật\n`
        );
        return;
    }

    if (req.url === '/stats') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
            status: 'online',
            requests: visitCount,
            dave: 'enabled'
        }));
        return;
    }

    // Endpoint kiểm tra sức khỏe, dùng cho giám sát uptime
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
        return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`[SERVER] Đang lắng nghe cổng ${PORT}`);
});

// =========================
// CLIENT DISCORD
// =========================
const client = new Client();

// Cấu hình ID kênh voice của bạn ở đây
const VOICE_CHANNEL_ID = '1438763948387209312';

client.on('ready', async () => {
    console.log(`[SYSTEM] Đã đăng nhập: ${client.user.tag}`);

    const channel = client.channels.cache.get(VOICE_CHANNEL_ID);

    if (!channel) {
        console.error('[VOICE] Không tìm thấy kênh voice! Vui lòng kiểm tra ID kênh');
        return;
    }

    try {
        // Tham gia kênh voice (DAVE sẽ được xử lý tự động bởi @discordjs/voice + @snazzah/davey)
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
            selfDeaf: true,
            selfMute: true,
            // Tùy chọn dành riêng cho DAVE (nếu thư viện hỗ trợ)
            daveEncryption: true
        });

        console.log(`[VOICE] Đã tham gia kênh: ${channel.name}`);

        // Xử lý sự kiện lỗi kết nối voice
        connection.on('error', (error) => {
            console.error('[VOICE ERROR]', error);
            // Mã lỗi phổ biến:
            // 4017 = Yêu cầu DAVE, client không hỗ trợ
            // 4015 = Timeout
            // 4006 = Phiên không hợp lệ
        });

        connection.on('stateChange', (oldState, newState) => {
            console.log(`[VOICE] Trạng thái: ${oldState.status} → ${newState.status}`);
            if (newState.status === 'disconnected') {
                console.warn('[VOICE] Đã ngắt kết nối khỏi kênh voice');
            }
        });

        // =========================
        // CƠ CHẾ GIỮ KẾT NỐI ÂM THANH (TÙY CHỌN)
        // =========================
        // Gửi khung âm thanh im lặng định kỳ để ngăn Discord ngắt kết nối do không hoạt động
        // Lưu ý: Điều này sẽ tiêu tốn thêm một chút bộ nhớ, chỉ bật khi cần thiết
        const KEEP_ALIVE_INTERVAL = 60 * 1000; // 60 giây
        const silentWavPath = path.join(__dirname, 'silent.wav');

        // Chỉ bật giữ kết nối khi tệp âm thanh im lặng tồn tại
        if (fs.existsSync(silentWavPath)) {
            const player = createAudioPlayer();
            player.on('error', (err) => {
                console.error('[AUDIO ERROR]', err);
            });

            // Tạo tài nguyên âm thanh im lặng có thể tái sử dụng
            const createSilentResource = () => {
                return createAudioResource(
                    fs.createReadStream(silentWavPath),
                    { inputType: StreamType.Arbitrary }
                );
            };

            // Định kỳ phát âm thanh im lặng
            setInterval(() => {
                if (player.state.status !== AudioPlayerStatus.Playing) {
                    try {
                        player.play(createSilentResource());
                        connection.subscribe(player);
                    } catch (err) {
                        console.error('[KEEPALIVE ERROR]', err);
                    }
                }
            }, KEEP_ALIVE_INTERVAL);

            console.log('[VOICE] Đã bật cơ chế giữ kết nối âm thanh (tệp âm thanh im lặng đã tìm thấy)');
        } else {
            console.log('[VOICE] Không tìm thấy silent.wav, bỏ qua giữ kết nối âm thanh');
            console.log('[VOICE] Nếu bị ngắt kết nối thường xuyên, hãy tạo tệp WAV im lặng 20ms');
        }

    } catch (err) {
        console.error('[VOICE] Tham gia kênh voice thất bại:', err.message);
        
        // Phán đoán lỗi DAVE
        if (err.message && err.message.includes('DAVE')) {
            console.error('[VOICE] Phát hiện lỗi liên quan đến DAVE!');
            console.error('[VOICE] Đảm bảo đã cài đặt @snazzah/davey: npm i @snazzah/davey');
        }
    }
});

// =========================
// ĐĂNG NHẬP
// =========================
if (!process.env.DISCORD_TOKEN) {
    console.error('[LOGIN] Biến môi trường DISCORD_TOKEN chưa được đặt!');
    process.exit(1);
}

client.login(process.env.DISCORD_TOKEN).catch((err) => {
    console.error('[LOGIN] Đăng nhập thất bại:', err.message);
    process.exit(1);
});
