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

    console.log("جاري تشغيل وتحويل البث وتجهيز التخزين المسبق...");
    
    const ffmpeg = spawn('ffmpeg', [
        '-y',
        '-user_agent', 'VLC/3.0.18 LibVLC/3.0.18',
        '-reconnect', '1',
        '-reconnect_streamed', '1',
        '-reconnect_delay_max', '2',
        '-rw_timeout', '20000000',
        '-i', STREAM_URL,
        '-c:v', 'copy',
        '-c:a', 'copy',
        '-f', 'hls',
        '-hls_time', '3',
        '-hls_list_size', '20',       // الاحتفاظ بقائمة من 20 قطعة فيديو سابقة في السيرفر
        '-hls_flags', 'delete_segments+omit_endlist',
        path.join(hlsFolder, 'stream.m3u8')
    ]);

    ffmpeg.stderr.on('data', (data) => {});

    ffmpeg.on('close', (code) => {
        console.log(`إعادة الاتصال الفوري بالبث... (Code: ${code})`);
        setTimeout(startFFmpeg, 1000);
    });
}

startFFmpeg();

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
