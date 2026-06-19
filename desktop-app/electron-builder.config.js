/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'com.multicam.desktop',
  productName: 'MultiCam Desktop',
  electronVersion: '30.0.0',
  icon: 'build/icon.png',
  directories: {
    output: 'release'
  },
  files: [
    'dist/**/*',
    'build/**/*',
    'package.json'
  ],
  asarUnpack: [
    'dist/**/*',
    'build/livekit-server.exe',
    'build/livekit-server',
    'build/livekit.yaml'
  ],
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64']
      }
    ]
  },
  linux: {
    target: ['AppImage', 'deb'],
    icon: 'build/icon.png'
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true
  }
};
