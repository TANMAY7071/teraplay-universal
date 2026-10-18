import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const sourceFile = path.resolve(rootDir, 'public/data/cached-lore.json');
const targetDir = path.resolve(rootDir, 'public/data/lore');

if (!fs.existsSync(sourceFile)) {
  console.error(`Source file not found: ${sourceFile}`);
  process.exit(1);
}

console.log(`Reading ${sourceFile}...`);
const raw = fs.readFileSync(sourceFile, 'utf8');
const data = JSON.parse(raw);

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const indexEntries = [];

for (const [key, val] of Object.entries(data)) {
  const filePath = path.join(targetDir, `${key}.json`);
  fs.writeFileSync(filePath, JSON.stringify(val), 'utf8');
  const sizeMB = (fs.statSync(filePath).size / (1024 * 1024)).toFixed(2);
  console.log(`Wrote ${key}.json (${sizeMB} MB)`);

  indexEntries.push({
    slug: key,
    worldCount: val?.world?.length || 0,
    characterCount: val?.characters?.length || 0,
    cultivationCount: val?.cultivation?.length || 0,
    techniquesCount: val?.techniques?.length || 0,
    artifactsCount: val?.artifacts?.length || 0,
    clansCount: val?.clans?.length || 0,
    galleryCount: val?.gallery?.length || 0,
    timelineCount: val?.timeline?.length || 0
  });
}

const indexFilePath = path.join(targetDir, 'index.json');
fs.writeFileSync(indexFilePath, JSON.stringify({ series: indexEntries }, null, 2), 'utf8');
console.log(`Wrote index.json (${indexEntries.length} series)`);
console.log('Lore splitting completed successfully.');
