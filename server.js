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

    console.log("جاري تشغيل وتحويل البث المباشر بأعلى أداء وتخزين مؤقت...");
    
    const ffmpeg = spawn('ffmpeg', [
        '-y',
        '-user_agent', 'VLC/3.0.18 LibVLC/3.0.18',
        '-reconnect', '1',
        '-reconnect_streamed', '1',
        '-reconnect_delay_max', '2', // إعادة الاتصال الخاطف خلال ثانيتين فقط عند التذبذب
        '-rw_timeout', '20000000',
        '-i', STREAM_URL,
        '-c:v', 'copy',
        '-c:a', 'copy', // النسخ المباشر للصوت والفيديو لتوفير معالج السيرفر ومنع التبطئ
        '-f', 'hls',
        '-hls_time', '2',             // كل قطعة تكون 2 ثانية لسرعة الاستجابة
        '-hls_list_size', '15',        // الاحتفاظ بـ 15 قطعة في القائمة (تخزين مؤقت يصل لـ 30 ثانية)
        '-hls_flags', 'delete_segments+omit_endlist',
        path.join(hlsFolder, 'stream.m3u8')
    ]);

    ffmpeg.stderr.on('data', (data) => {
        // يمكن متابعة حالة البث من السجلات
    });

    ffmpeg.on('close', (code) => {
        console.log(`انقطع الاتصال، جاري إعادة الربط المباشر... (كود: ${code})`);
        setTimeout(startFFmpeg, 1000); // إعادة الاتصال الفوري خلال ثانية واحدة
    });
}

startFFmpeg();

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
