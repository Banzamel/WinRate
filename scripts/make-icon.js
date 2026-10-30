// Renders build/icon.svg to build/icon.png (512x512) with Electron's Chromium: `npx electron scripts/make-icon.js`.
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const SVG = path.join(__dirname, '..', 'build', 'icon.svg');
const OUT = path.join(__dirname, '..', 'build', 'icon.png');
const SIZE = 512;

app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: SIZE, height: SIZE, show: false, transparent: true, frame: false, webPreferences: { offscreen: true } });
  const html = `<html><body style="margin:0;background:transparent">${fs.readFileSync(SVG, 'utf8')}</body></html>`;
  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  await new Promise((r) => setTimeout(r, 300));
  const image = await win.webContents.capturePage({ x: 0, y: 0, width: SIZE, height: SIZE });
  fs.writeFileSync(OUT, image.resize({ width: SIZE, height: SIZE }).toPNG());
  console.log(`icon -> ${OUT}`);
  app.quit();
});
