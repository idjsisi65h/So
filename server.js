const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const STREAM_URL = process.env.STREAM_URL;

app.use(cors());
app.use(express.static('public'));

const hlsFolder = path.join(__dirname, 'public', 'hls');
if (!fs.existsSync(hlsFolder)) {
    fs.mkdirSync(hlsFolder, { recursive: true });
}

function startFFmpeg() {
    if (!STREAM_URL) {
        console.log("تنبيه: لم يتم وضع رابط STREAM_URL في Railway!");
        return;
    }

    console.log("جاري تشغيل وتحويل البث وتجاوز الحماية...");
    
    const ffmpeg = spawn('ffmpeg', [
        '-y',
        // انتحال متصفح حديث لتجاوز حظر MBC و edgenextcdn
        '-user_agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        '-headers', 'Referer: https://shahid.mbc.net/\r\n',
        '-reconnect', '1',
        '-reconnect_streamed', '1',
        '-reconnect_delay_max', '3',
        '-rw_timeout', '15000000',
        '-i', STREAM_URL,
        // إعادة ترميز التوقيت بدون ضغط المعالج لضمان عدم توقف العداد
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-ar', '44100',
        '-ac', '2',
        '-f', 'hls',
        '-hls_time', '2',
        '-hls_list_size', '15',
        '-hls_flags', 'delete_segments+omit_endlist+split_by_time',
        path.join(hlsFolder, 'stream.m3u8')
    ]);

    ffmpeg.stderr.on('data', (data) => {});

    ffmpeg.on('close', (code) => {
        console.log(`انقطع الاتصال، جاري إعادة التشغيل تلقائياً... (Code: ${code})`);
        setTimeout(startFFmpeg, 1000);
    });
}

startFFmpeg();

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
