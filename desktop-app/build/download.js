const https = require('https');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const tar = require('tar');

const url = 'https://github.com/livekit/livekit/releases/download/v1.6.0/livekit-server-linux-amd64.tar.gz';
const dest = path.join(__dirname, 'livekit.tar.gz');

https.get(url, (res) => {
  if (res.statusCode === 302) {
    https.get(res.headers.location, (res2) => {
      res2.pipe(fs.createWriteStream(dest)).on('finish', () => {
        console.log('Downloaded, extracting...');
        require('child_process').execSync('tar -xzf livekit.tar.gz', { cwd: __dirname });
        console.log('Extracted livekit-server');
      });
    });
  }
});
