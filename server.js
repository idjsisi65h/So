const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

let STREAM_URL = process.env.STREAM_URL;

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

    let formattedUrl = STREAM_URL.trim();

    console.log("جاري تشغيل البث وتمديد فترة الاحتفاظ بالقطع...");

    const ffmpeg = spawn('ffmpeg', [
        '-y',
        '-user_agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        '-headers', 'Referer: https://shahid.mbc.net/\r\n',
        '-reconnect', '1',
        '-reconnect_streamed', '1',
        '-reconnect_delay_max', '3',
        '-i', formattedUrl,
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-ar', '44100',
        '-ac', '2',
        '-f', 'hls',
        '-hls_time', '3',
        '-hls_list_size', '30',        // الاحتفاظ بـ 30 قطعة سابقة (حوالي دقيقة ونصف كاملة في السيرفر)
        '-hls_flags', 'delete_segments+omit_endlist',
        path.join(hlsFolder, 'stream.m3u8')
    ]);

    ffmpeg.stderr.on('data', (data) => {});

    ffmpeg.on('close', (code) => {
        console.log(`إعادة تشغيل البث تلقائياً... (كود: ${code})`);
        setTimeout(startFFmpeg, 1000);
    });
}

startFFmpeg();

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
