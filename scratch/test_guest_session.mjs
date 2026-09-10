import https from 'https';

async function getGuestSession() {
  return new Promise((resolve) => {
    https.get('https://www.instagram.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    }, (res) => {
      const setCookie = res.headers['set-cookie'] || [];
      const cookies = setCookie.map(c => c.split(';')[0]).join('; ');
      const csrfMatch = cookies.match(/csrftoken=([^;]+)/);
      const csrftoken = csrfMatch ? csrfMatch[1] : '';
      resolve({ cookies, csrftoken });
    }).on('error', () => resolve({ cookies: '', csrftoken: '' }));
  });
}

async function testWithSession(shortcode) {
  const session = await getGuestSession();
  console.log('Session acquired, cookies len:', session.cookies.length);
  
  const url = `https://www.instagram.com/graphql/query/?doc_id=10015901848480474&variables=${encodeURIComponent(JSON.stringify({ shortcode }))}`;
  
  https.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      'X-IG-App-ID': '936619743392459',
      'X-CSRFToken': session.csrftoken,
      'Cookie': session.cookies,
      'Referer': `https://www.instagram.com/reel/${shortcode}/`
    }
  }, (res) => {
    let body = '';
    res.on('data', c => body += c);
    res.on('end', () => {
      console.log('GraphQL with Session Status:', res.statusCode);
      try {
        const data = JSON.parse(body);
        if (data.data?.xdt_shortcode_media) {
          const m = data.data.xdt_shortcode_media;
          console.log('🎉 SUCCESS! Video URL:', m.video_url?.slice(0, 80));
          console.log('🎉 Display URL:', m.display_url?.slice(0, 80));
          console.log('🎉 Username:', m.owner?.username);
        } else {
          console.log('Response:', body.slice(0, 200));
        }
      } catch (e) {
        console.log('Error:', e.message);
      }
    });
  });
}

testWithSession('DdETKR9hOiG');
