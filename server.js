const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// استلام رابط البث من متغيرات البيئة في Railway
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

    console.log("جاري تشغيل وتحويل البث المباشر...");
    
    const ffmpeg = spawn('ffmpeg', [
        '-re',
        '-i', STREAM_URL,
        '-c', 'copy',
        '-f', 'hls',
        '-hls_time', '3',
        '-hls_list_size', '6',
        '-hls_flags', 'delete_segments',
        path.join(hlsFolder, 'stream.m3u8')
    ]);

    ffmpeg.stderr.on('data', (data) => {
        console.log(`FFmpeg: ${data.toString()}`);
    });

    ffmpeg.on('close', (code) => {
        console.log(`انقطع البث، إعادة المحاولة خلال 5 ثوانٍ... (Code: ${code})`);
        setTimeout(startFFmpeg, 5000);
    });
}

startFFmpeg();

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
