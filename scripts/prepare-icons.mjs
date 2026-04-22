import fs from 'node:fs';
import path from 'node:path';
import pngToIco from 'png-to-ico';
import sharp from 'sharp';

const root = path.resolve(process.cwd());
const buildDir = path.join(root, 'build');
const pngPath = path.join(buildDir, 'icon.png');
const squarePngPath = path.join(buildDir, 'icon.square.png');
const icoPath = path.join(buildDir, 'icon.ico');

if (!fs.existsSync(pngPath)) {
  console.error(`Missing icon PNG at ${pngPath}`);
  process.exit(1);
}

// png-to-ico requires a *square* PNG. Pad to a square with transparent background first.
const meta = await sharp(pngPath).metadata();
const size = Math.max(meta.width || 512, meta.height || 512);
await sharp(pngPath)
  .resize(size, size, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .resize(512, 512)
  .png({ compressionLevel: 9 })
  .toFile(squarePngPath);

const buf = await pngToIco(squarePngPath);
fs.writeFileSync(icoPath, buf);
console.log(`Wrote ${icoPath}`);

