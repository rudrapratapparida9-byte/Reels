async function testEndpoints(url) {
  const shortcode = 'C8r8Xq9p1Yx';
  const igUrl = `https://www.instagram.com/reel/${shortcode}/`;

  // Endpoint 1: snapsave / snapinsta APIs / public ig extractors
  const apis = [
    {
      name: 'Indown / SaveVideo public API',
      fetch: async () => {
        const res = await fetch('https://api.vkrdown.com/api/get?url=' + encodeURIComponent(igUrl));
        return await res.json();
      }
    },
    {
      name: 'FastDL / IG Extractor',
      fetch: async () => {
        const res = await fetch('https://social-downloader.onrender.com/api/instagram?url=' + encodeURIComponent(igUrl));
        return await res.json();
      }
    },
    {
      name: 'Snapinsta / Indown public API',
      fetch: async () => {
        const res = await fetch('https://tools.betabotz.eu.org/tools/instagramdl?url=' + encodeURIComponent(igUrl));
        return await res.json();
      }
    },
    {
      name: 'Cobalt v7 API',
      fetch: async () => {
        const res = await fetch('https://co.wuk.sh/api/json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ url: igUrl })
        });
        return await res.json();
      }
    }
  ];

  for (const api of apis) {
    try {
      console.log(`Testing ${api.name}...`);
      const result = await Promise.race([
        api.fetch(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
      ]);
      console.log(`${api.name} success:`, JSON.stringify(result).substring(0, 200));
    } catch (e) {
      console.log(`${api.name} failed:`, e.message);
    }
  }
}

testEndpoints();
