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

    // إذا كان الرابط رابط IPTV مباشر ولا ينتهي بـ .m3u8 أو .ts يتم تحويله للصيغة المتوافقة
    let formattedUrl = STREAM_URL.trim();
    if (!formattedUrl.endsWith('.m3u8') && !formattedUrl.endsWith('.ts')) {
        formattedUrl = formattedUrl + '.ts';
    }

    console.log("جاري تشغيل وسحب رابط IPTV...");
    
    const ffmpeg = spawn('ffmpeg', [
        '-y',
        // محاكاة مشغل IPTV احترافي (IPTVSmarters/VLC)
        '-user_agent', 'IPTVSmartersPro/3.1.5 (Linux;Android 11) Mobile',
        '-reconnect', '1',
        '-reconnect_streamed', '1',
        '-reconnect_delay_max', '5',
        '-timeout', '15000000',
        '-rw_timeout', '15000000',
        '-i', formattedUrl,
        // إعادة معالجة الصوت والفيديو للتوافق التام مع متصفحات الموبايل
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-ar', '44100',
        '-ac', '2',
        '-f', 'hls',
        '-hls_time', '3',
        '-hls_list_size', '15',
        '-hls_flags', 'delete_segments+omit_endlist',
        path.join(hlsFolder, 'stream.m3u8')
    ]);

    ffmpeg.stderr.on('data', (data) => {});

    ffmpeg.on('close', (code) => {
        console.log(`انقطع الاتصال بسيرفر IPTV، جاري إعادة المحاولة... (Code: ${code})`);
        setTimeout(startFFmpeg, 2000);
    });
}

startFFmpeg();

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
