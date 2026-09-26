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

    // إضافة .ts تلقائياً إن لم تكن موجودة
    if (!formattedUrl.endsWith('.ts') && !formattedUrl.endsWith('.m3u8')) {
        formattedUrl = formattedUrl + '.ts';
    }

    console.log("جاري قراءة وتحويل بث الـ TS المباشر...");

    const ffmpeg = spawn('ffmpeg', [
        '-y',
        '-loglevel', 'warning',
        // انتحال مشغل IPTV لمنع الحظر
        '-user_agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) VLC/3.0.18',
        '-headers', 'Connection: keep-alive\r\n',
        '-reconnect', '1',
        '-reconnect_streamed', '1',
        '-reconnect_delay_max', '3',
        '-i', formattedUrl,
        // معالجة الفيديو والصوت لضمان التوافق مع المتصفح
        '-c:v', 'copy',          // نسخ الفيديو بدون إجهاد المعالج
        '-c:a', 'aac',           // تحويل الصوت لـ AAC المضمون في جميع المتصفحات
        '-b:a', '128k',
        '-f', 'hls',
        '-hls_time', '2',
        '-hls_list_size', '12',
        '-hls_flags', 'delete_segments+omit_endlist',
        path.join(hlsFolder, 'stream.m3u8')
    ]);

    ffmpeg.stderr.on('data', (data) => {
        console.log(`FFmpeg TS Log: ${data.toString()}`);
    });

    ffmpeg.on('close', (code) => {
        console.log(`انقطع اتصال الـ TS، إعادة الاتصال تلقائياً... (كود: ${code})`);
        setTimeout(startFFmpeg, 2000);
    });
}

startFFmpeg();

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
