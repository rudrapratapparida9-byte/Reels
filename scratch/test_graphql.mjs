import https from 'https';

async function testGraphQL(shortcode) {
  const url = `https://www.instagram.com/graphql/query/?query_hash=b3055c2c970542f302550d5900de7344&variables=${encodeURIComponent(JSON.stringify({ shortcode }))}`;
  
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'X-IG-App-ID': '936619743392459',
        'Accept': 'application/json'
      }
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        console.log('GraphQL Status:', res.statusCode);
        try {
          const data = JSON.parse(body);
          console.log('Data keys:', Object.keys(data));
          if (data.data?.shortcode_media) {
            const m = data.data.shortcode_media;
            console.log('Video URL:', m.video_url?.slice(0, 80));
            console.log('Display URL:', m.display_url?.slice(0, 80));
          }
          resolve(data);
        } catch (e) {
          console.log('Parse error, raw:', body.slice(0, 200));
          resolve(null);
        }
      });
    }).on('error', (e) => {
      console.log('GraphQL Error:', e.message);
      resolve(null);
    });
  });
}

testGraphQL('DdETKR9hOiG');
