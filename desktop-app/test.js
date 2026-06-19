const { app, BrowserWindow } = require('electron')
app.whenReady().then(() => {
  new BrowserWindow({ width: 800, height: 600 })
})
