import https from 'https';

async function testDocId(shortcode) {
  const url = `https://www.instagram.com/graphql/query/?doc_id=10015901848480474&variables=${encodeURIComponent(JSON.stringify({ shortcode }))}`;
  
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'X-IG-App-ID': '936619743392459',
        'Accept': '*/*',
        'Referer': `https://www.instagram.com/reel/${shortcode}/`
      }
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        console.log('DocId Status:', res.statusCode);
        try {
          const data = JSON.parse(body);
          if (data.data?.xdt_shortcode_media) {
            const m = data.data.xdt_shortcode_media;
            console.log('SUCCESS! Video URL:', m.video_url?.slice(0, 80));
            console.log('Display URL:', m.display_url?.slice(0, 80));
            console.log('Title/Owner:', m.owner?.username);
          } else {
            console.log('Keys:', Object.keys(data));
          }
          resolve(data);
        } catch (e) {
          console.log('Parse error:', e.message);
          resolve(null);
        }
      });
    }).on('error', (e) => {
      console.log('Error:', e.message);
      resolve(null);
    });
  });
}

testDocId('DdETKR9hOiG');
