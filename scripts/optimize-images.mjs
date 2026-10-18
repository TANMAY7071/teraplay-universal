import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const assetsDir = path.join(rootDir, 'src/assets');
const publicDir = path.join(rootDir, 'public');

async function processDirectory(dir, isPublic = false) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await processDirectory(fullPath, isPublic);
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (!['.jpg', '.jpeg', '.png'].includes(ext)) continue;

    const baseName = path.basename(entry.name, ext);
    const webpPath = path.join(dir, `${baseName}.webp`);

    try {
      const originalStats = fs.statSync(fullPath);
      const originalSizeKB = (originalStats.size / 1024).toFixed(1);

      // Convert to webp with high quality
      const image = sharp(fullPath);
      const metadata = await image.metadata();

      await sharp(fullPath)
        .webp({ quality: 80, effort: 5 })
        .toFile(webpPath);

      const webpStats = fs.statSync(webpPath);
      const webpSizeKB = (webpStats.size / 1024).toFixed(1);
      const savings = (((originalStats.size - webpStats.size) / originalStats.size) * 100).toFixed(1);

      console.log(`[WebP] ${entry.name} (${originalSizeKB} KB) -> ${baseName}.webp (${webpSizeKB} KB, -${savings}%)`);

      // If heavy logo in public, also overwrite PNG with sharp-optimized PNG to protect existing <img> tags
      if (isPublic && ext === '.png' && originalStats.size > 100 * 1024) {
        const tempPngPath = path.join(dir, `${baseName}-opt.png`);
        await sharp(fullPath)
          .png({ compressionLevel: 9, quality: 80 })
          .toFile(tempPngPath);
        fs.renameSync(tempPngPath, fullPath);
        const optStats = fs.statSync(fullPath);
        console.log(`[PNG Opt] Overwrote ${entry.name} -> ${(optStats.size / 1024).toFixed(1)} KB`);
      }
    } catch (err) {
      console.error(`Error processing ${entry.name}:`, err.message);
    }
  }
}

async function main() {
  console.log('Optimizing src/assets images...');
  await processDirectory(assetsDir, false);

  console.log('\nOptimizing public images...');
  await processDirectory(publicDir, true);

  console.log('\nImage optimization finished.');
}

main().catch(console.error);
