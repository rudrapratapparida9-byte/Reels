import { exec } from 'child_process';

const url = 'https://www.instagram.com/reel/DdETKR9hOiG/';

const tests = [
  `yt-dlp -j --no-warnings --socket-timeout 6 "${url}"`,
  `python -m yt_dlp -j --no-warnings --socket-timeout 6 "${url}"`,
  `yt-dlp -j --no-warnings --extractor-args "instagram:api=api1" "${url}"`,
  `yt-dlp -j --no-warnings --extractor-args "instagram:api=mobile" "${url}"`
];

tests.forEach((cmd, idx) => {
  exec(cmd, { timeout: 10000 }, (err, stdout, stderr) => {
    if (err) {
      console.log(`[Test ${idx}] Fail:`, err.message.slice(0, 100));
    } else {
      try {
        const info = JSON.parse(stdout);
        console.log(`[Test ${idx}] SUCCESS!`, info.id, info.title, info.url ? info.url.slice(0, 60) : 'no direct url');
      } catch (e) {
        console.log(`[Test ${idx}] Raw:`, stdout.slice(0, 100));
      }
    }
  });
});
