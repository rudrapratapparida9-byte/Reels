import https from 'https';

async function inspectEmbed(shortcode) {
  https.get(`https://www.instagram.com/p/${shortcode}/embed/captioned/`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  }, (res) => {
    let html = '';
    res.on('data', c => html += c);
    res.on('end', () => {
      const scripts = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
      console.log('Total scripts found:', scripts.length);
      for (const s of scripts) {
        if (s.includes('video_url') || s.includes('playback_url') || s.includes('display_url') || s.includes('shortcode_media') || s.includes('GraphVideo')) {
          console.log('Found candidate script:', s.slice(0, 300));
        }
      }
    });
  });
}

inspectEmbed('C8jG9YyO8W5');
