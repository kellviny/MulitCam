const path = require('path');
const { execSync } = require('child_process');
const fs = require('fs');

const url = 'https://github.com/livekit/livekit/releases/download/v1.6.0/livekit_1.6.0_linux_amd64.tar.gz';
const dest = path.join(__dirname, 'livekit.tar.gz');

try {
  console.log('Downloading livekit-server from:', url);
  execSync(`curl -L -o "${dest}" "${url}"`, { stdio: 'inherit' });
  
  console.log('Extracting livekit-server...');
  execSync('tar -xzf livekit.tar.gz', { cwd: __dirname, stdio: 'inherit' });
  
  // Clean up tarball
  if (fs.existsSync(dest)) {
    fs.unlinkSync(dest);
  }
  
  console.log('LiveKit server downloaded and extracted successfully.');
} catch (error) {
  console.error('Error during LiveKit download or extraction:', error.message);
  process.exit(1);
}

