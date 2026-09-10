import https from 'https';
import fs from 'fs';

async function testCobalt(url) {
  const endpoints = [
    'https://api.cobalt.tools/api/json',
    'https://cobalt-api.kwiatekm.pl/api/json',
    'https://co.wuk.sh/api/json',
    'https://api.wuk.sh/api/json'
  ];

  for (const ep of endpoints) {
    try {
      const u = new URL(ep);
      const reqData = JSON.stringify({ url, vQuality: '1080', filenamePattern: 'basic' });
      
      const res = await new Promise((resolve, reject) => {
        const req = https.request({
          hostname: u.hostname,
          path: u.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0'
          },
          timeout: 4000
        }, (resp) => {
          let body = '';
          resp.on('data', d => body += d);
          resp.on('end', () => {
            try { resolve(JSON.parse(body)); } catch (e) { resolve(null); }
          });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); resolve(null); });
        req.write(reqData);
        req.end();
      });

      if (res && (res.url || (res.picker && res.picker.length))) {
        console.log(`[Cobalt OK - ${ep}]:`, res.url || res.picker[0]?.url);
        return res;
      }
    } catch (e) {
      console.log(`[Cobalt Err - ${ep}]:`, e.message);
    }
  }
  return null;
}

testCobalt('https://www.instagram.com/reel/C8jG9YyO8W5/');
