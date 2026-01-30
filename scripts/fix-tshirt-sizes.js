#!/usr/bin/env node
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

const TSHIRT_DIR = path.join(__dirname, '../public/mockups/tshirt');
const COLORS = ['white', 'red']; // Fix white and red (currently 1536x1536)
const ANGLES = ['front-chest', 'back', 'left-sleeve', 'right-sleeve'];
const TARGET_WIDTH = 1024;
const TARGET_HEIGHT = 1536;

async function fixSize(imagePath) {
  const basename = path.basename(imagePath);
  const color = path.basename(path.dirname(imagePath));
  console.log(`${color}/${basename}`);
  
  const image = sharp(imagePath);
  const metadata = await image.metadata();
  
  if (metadata.width === TARGET_WIDTH && metadata.height === TARGET_HEIGHT) {
    console.log(`  ✅ Already ${TARGET_WIDTH}x${TARGET_HEIGHT}, skipping`);
    return;
  }
  
  console.log(`  Current: ${metadata.width}x${metadata.height}`);
  
  // Resize to target dimensions, fit inside and pad
  await image
    .resize(TARGET_WIDTH, TARGET_HEIGHT, {
      fit: 'inside',
      kernel: 'lanczos3'
    })
    .png({ quality: 100 })
    .toFile(imagePath + '.tmp');
  
  // Replace original
  await fs.rename(imagePath + '.tmp', imagePath);
  
  console.log(`  ✅ Normalized to: ${TARGET_WIDTH}x${TARGET_HEIGHT}`);
}

async function main() {
  console.log('🔧 Normalizing t-shirt mockups to 1024x1536...\n');
  
  for (const color of COLORS) {
    for (const angle of ANGLES) {
      const filePath = path.join(TSHIRT_DIR, color, `${angle}.png`);
      try {
        await fixSize(filePath);
      } catch (error) {
        console.error(`  ❌ Error: ${error.message}`);
      }
    }
  }
  
  console.log('\n✨ All mockups normalized!');
}

main().catch(console.error);
