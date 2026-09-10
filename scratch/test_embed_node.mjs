import https from 'https';

async function testEmbed(shortcode) {
  return new Promise((resolve) => {
    https.get(`https://www.instagram.com/p/${shortcode}/embed/captioned/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    }, (res) => {
      let html = '';
      res.on('data', chunk => html += chunk);
      res.on('end', () => {
        console.log('Status:', res.statusCode, 'Length:', html.length);
        
        // Find video URL
        const videoMatch = html.match(/class="EmbeddedVideo"[^>]*src="([^"]+)"/) ||
                           html.match(/"video_url":"([^"]+)"/) ||
                           html.match(/https:\\\/\\\/[^"'\s<>]+mp4[^"'\s<>]*/);
                           
        const thumbMatch = html.match(/class="EmbeddedMediaImage"[^>]*src="([^"]+)"/) ||
                           html.match(/"display_url":"([^"]+)"/);

        // Find caption
        const captionMatch = html.match(/class="Caption"[^>]*>(.*?)<\/div>/s) ||
                             html.match(/class="CaptionText"[^>]*>(.*?)<\/span>/s);

        const videoUrl = videoMatch ? (videoMatch[1] || videoMatch[0]).replace(/\\\//g, '/').replace(/\\u0026/g, '&').replace(/&amp;/g, '&') : null;
        const thumbUrl = thumbMatch ? (thumbMatch[1] || thumbMatch[0]).replace(/\\\//g, '/').replace(/\\u0026/g, '&').replace(/&amp;/g, '&') : null;
        
        console.log('Video URL:', videoUrl ? videoUrl.slice(0, 80) : 'None');
        console.log('Thumb URL:', thumbUrl ? thumbUrl.slice(0, 80) : 'None');
        resolve({ videoUrl, thumbUrl });
      });
    }).on('error', (e) => {
      console.log('Error:', e.message);
      resolve(null);
    });
  });
}

testEmbed('C8jG9YyO8W5');
