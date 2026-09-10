import https from 'https';

function fetchUrl(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    }).on('error', reject);
  });
}

async function testShortcode(sc) {
  const embedUrl = `https://www.instagram.com/p/${sc}/embed/captioned/`;
  const res = await fetchUrl(embedUrl, {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
  });

  const raw = res.body;
  const mp4Regex = /https:[^"'\s<>]+\.mp4[^"'\s<>]*/g;
  let matches = raw.match(mp4Regex) || [];
  console.log('MP4 occurrences in HTML:', matches.length);
  matches.slice(0, 3).forEach((m, idx) => {
    const clean = m.replace(/\\u0026/g, '&').replace(/\\\//g, '/').replace(/\\/g, '');
    console.log(`Match ${idx + 1}:`, clean);
  });

  // Also check GraphQL queries
  const gqlUrl = `https://www.instagram.com/graphql/query/?doc_id=10015901848480474&variables=${encodeURIComponent(JSON.stringify({ shortcode: sc }))}`;
  try {
    const gqlRes = await fetchUrl(gqlUrl, {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      'X-IG-App-ID': '936619743392459',
      'Accept': '*/*'
    });
    console.log('GQL status:', gqlRes.status, 'Body len:', gqlRes.body.length);
    if (gqlRes.body.includes('video_url')) {
      console.log('GQL contains video_url!');
      const json = JSON.parse(gqlRes.body);
      console.log('GQL parsed data:', JSON.stringify(json).substring(0, 200));
    }
  } catch (e) {
    console.log('GQL error:', e.message);
  }
}

testShortcode('C8r8Xq9p1Yx');
