import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templatePath = 'file:///' + path.join(__dirname, 'icon-template.html').replace(/\\/g, '/');

// Find Chrome executable
const chromePaths = [
  'C:/Users/achum/.cache/puppeteer/chrome/win64-146.0.7680.153/chrome-win64/chrome.exe',
  'C:/Users/achum/.cache/puppeteer/chrome/win64-145.0.7632.77/chrome-win64/chrome.exe',
];
const executablePath = chromePaths.find(p => fs.existsSync(p));
if (!executablePath) { console.error('Chrome not found'); process.exit(1); }

const browser = await puppeteer.launch({ executablePath, args: ['--no-sandbox'] });

for (const [size, name] of [[512,'icon-512'],[192,'icon-192'],[180,'icon-180'],[32,'favicon-32']]) {
  const page = await browser.newPage();
  await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
  await page.goto(templatePath, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 500)); // wait for font
  await page.screenshot({ path: path.join(__dirname, `${name}.png`), clip: { x:0, y:0, width:size, height:size } });
  await page.close();
  console.log(`Generated ${name}.png (${size}x${size})`);
}
await browser.close();
console.log('Done!');
