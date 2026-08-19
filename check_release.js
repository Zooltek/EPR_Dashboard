const https = require('https');

const options = {
  hostname: 'api.github.com',
  path: '/repos/WiseLibs/better-sqlite3/releases/latest',
  headers: { 'User-Agent': 'Node.js' }
};

https.get(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('Tag:', json.tag_name);
      if (json.assets) {
        json.assets.forEach(a => console.log('-', a.name));
      }
    } catch (e) {
      console.error(e.message);
    }
  });
}).on('error', err => console.error(err.message));
