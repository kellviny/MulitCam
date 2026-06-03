const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 512,
    height: 512,
    show: false,
    frame: false,
    transparent: false, // Prevents black background issues on Windows capture
    webPreferences: { offscreen: true }
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
    <rect width="512" height="512" rx="112" fill="#6366f1" />
    <path fill="#ffffff" d="M382 186.2v139.6c0 10-8.2 18.2-18.2 18.2L312 308v28c0 17.7-14.3 32-32 32H136c-17.7 0-32-14.3-32-32V176c0-17.7 14.3-32 32-32h144c17.7 0 32 14.3 32 32v28l51.8-36c10.4-7.2 26.2 0.2 26.2 13z" />
  </svg>`;

  // Force transparent pixels to be white or a solid color so Windows taskbar doesn't render it black
  await win.loadURL(`data:text/html;charset=utf-8,
    <html>
      <head><style>body { margin: 0; background-color: #ffffff; overflow: hidden; display: flex; justify-content: center; align-items: center; }</style></head>
      <body>${svg}</body>
    </html>
  `);

  setTimeout(async () => {
    const image = await win.webContents.capturePage();
    fs.writeFileSync(path.join(__dirname, 'build', 'icon.png'), image.toPNG());
    console.log('Icon generated successfully!');
    app.quit();
  }, 2000);
});
