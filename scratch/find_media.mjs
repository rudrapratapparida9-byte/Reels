import https from 'https';
import fs from 'fs';

https.get(`https://www.instagram.com/p/C8jG9YyO8W5/embed/captioned/`, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9'
  }
}, (res) => {
  let html = '';
  res.on('data', c => html += c);
  res.on('end', () => {
    fs.writeFileSync('scratch/embed_dump.html', html);
    console.log('Saved dump of', html.length, 'bytes');
    
    // Search for cdninstagram or fbcdn or mp4
    const urls = html.match(/https:\\\/\\\/[^"'\s<>]*(?:cdninstagram|fbcdn)[^"'\s<>]*/g) || [];
    console.log('Found CDN URLs:', urls.length);
    urls.slice(0, 5).forEach(u => console.log(u.replace(/\\\//g, '/').replace(/\\u0026/g, '&')));
  });
});
