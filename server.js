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
    if (!formattedUrl.endsWith('.m3u8') && !formattedUrl.endsWith('.ts')) {
        formattedUrl = formattedUrl + '.ts';
    }

    console.log("جاري البدء في تحويل وسحب البث المباشر...");

    const ffmpeg = spawn('ffmpeg', [
        '-y',
        '-loglevel', 'warning',
        '-user_agent', 'VLC/3.0.18 LibVLC/3.0.18',
        '-probesize', '32768',          // تقليل حجم الفحص لبدء إنشاء الملف فوراً
        '-analyzeduration', '0',        // إلغاء تحليل البث المطوّل لسرعة الاستجابة
        '-i', formattedUrl,
        '-c', 'copy',                  // نسخ المجرى مباشرة بدون معالجة ثقيلة
        '-f', 'hls',
        '-hls_time', '2',
        '-hls_list_size', '10',
        '-hls_flags', 'delete_segments+omit_endlist',
        path.join(hlsFolder, 'stream.m3u8')
    ]);

    ffmpeg.stderr.on('data', (data) => {
        console.log(`FFmpeg Log: ${data.toString()}`);
    });

    ffmpeg.on('close', (code) => {
        console.log(`انقطع الاتصال بالبث، إعادة المحاولة... (Code: ${code})`);
        setTimeout(startFFmpeg, 2000);
    });
}

startFFmpeg();

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
