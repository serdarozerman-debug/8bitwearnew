#!/usr/bin/env node

/**
 * Mockup PNG Normalization Script
 * 
 * Purpose: Normalize all t-shirt mockup images to have:
 * - Same visual scale (shoulder width as reference)
 * - Same vertical alignment (neck/shoulder line as top anchor)
 * - Same canvas size (2000x2000px)
 * 
 * This eliminates per-color CSS hacks in the frontend.
 */

const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
  INPUT_DIR: path.join(__dirname, '../public/mockups/raw'),
  OUTPUT_DIR: path.join(__dirname, '../public/mockups/normalized'),
  CANVAS_SIZE: 2000,
  TARGET_SHIRT_WIDTH: 1600, // 80% of canvas
  TOP_PADDING: 100, // Space from top for neck/shoulder alignment
};

/**
 * Get visual bounds of non-transparent pixels
 */
async function getVisualBounds(imagePath) {
  const image = sharp(imagePath);
  const { data, info } = await image
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  
  let minX = width, minY = height, maxX = 0, maxY = 0;
  let hasContent = false;

  // Scan all pixels to find bounding box of non-transparent content
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const alpha = channels === 4 ? data[idx + 3] : 255;
      
      // Consider pixel as content if alpha > threshold
      if (alpha > 10) {
        hasContent = true;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (!hasContent) {
    throw new Error(`No content found in ${imagePath}`);
  }

  return {
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

/**
 * Normalize a single mockup image
 */
async function normalizeMockup(inputPath, outputPath) {
  console.log(`\n📐 Processing: ${path.basename(inputPath)}`);

  // Step 1: Get visual bounds
  const bounds = await getVisualBounds(inputPath);
  console.log(`   Visual bounds: ${bounds.width}x${bounds.height} at (${bounds.left}, ${bounds.top})`);

  // Step 2: Calculate scale based on target shirt width
  const scale = CONFIG.TARGET_SHIRT_WIDTH / bounds.width;
  const scaledWidth = Math.round(bounds.width * scale);
  const scaledHeight = Math.round(bounds.height * scale);
  console.log(`   Scale factor: ${scale.toFixed(3)}x → ${scaledWidth}x${scaledHeight}`);

  // Step 3: Crop to visual bounds and resize
  const image = sharp(inputPath);
  
  const croppedResized = await image
    // Crop to visual content only
    .extract({
      left: bounds.left,
      top: bounds.top,
      width: bounds.width,
      height: bounds.height,
    })
    // Resize to target scale
    .resize(scaledWidth, scaledHeight, {
      fit: 'fill',
      kernel: 'lanczos3', // High-quality resampling
    })
    .toBuffer();

  // Step 4: Calculate padding (ensure positive values)
  const totalHeight = scaledHeight + CONFIG.TOP_PADDING;
  let canvasHeight = CONFIG.CANVAS_SIZE;
  
  // If shirt is too tall for canvas, increase canvas height
  if (totalHeight > CONFIG.CANVAS_SIZE) {
    canvasHeight = totalHeight;
    console.log(`   ⚠️  Adjusted canvas height to ${canvasHeight}px to fit content`);
  }

  const bottomPadding = Math.max(0, canvasHeight - scaledHeight - CONFIG.TOP_PADDING);
  const leftPadding = Math.round((CONFIG.CANVAS_SIZE - scaledWidth) / 2);
  const rightPadding = CONFIG.CANVAS_SIZE - scaledWidth - leftPadding;

  // Step 5: Place on canvas
  await sharp(croppedResized)
    .extend({
      top: CONFIG.TOP_PADDING,
      bottom: bottomPadding,
      left: leftPadding,
      right: rightPadding,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ quality: 100, compressionLevel: 6 })
    .toFile(outputPath);

  console.log(`   ✅ Saved: ${path.basename(outputPath)}`);
}

/**
 * Process all mockups in input directory
 */
async function processAll() {
  console.log('🚀 Starting Mockup Normalization Pipeline\n');
  console.log(`📂 Input:  ${CONFIG.INPUT_DIR}`);
  console.log(`📂 Output: ${CONFIG.OUTPUT_DIR}`);
  console.log(`📏 Canvas: ${CONFIG.CANVAS_SIZE}x${CONFIG.CANVAS_SIZE}px`);
  console.log(`📏 Target: ${CONFIG.TARGET_SHIRT_WIDTH}px width (${(CONFIG.TARGET_SHIRT_WIDTH / CONFIG.CANVAS_SIZE * 100).toFixed(0)}% of canvas)`);

  // Ensure output directory exists
  await fs.mkdir(CONFIG.OUTPUT_DIR, { recursive: true });

  // Get all PNG files
  const files = await fs.readdir(CONFIG.INPUT_DIR);
  const pngFiles = files.filter(f => f.toLowerCase().endsWith('.png'));

  console.log(`\n📋 Found ${pngFiles.length} PNG files to process\n`);

  // Process each file
  let successCount = 0;
  let errorCount = 0;

  for (const file of pngFiles) {
    const inputPath = path.join(CONFIG.INPUT_DIR, file);
    const outputPath = path.join(CONFIG.OUTPUT_DIR, file);

    try {
      await normalizeMockup(inputPath, outputPath);
      successCount++;
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      errorCount++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`✅ Success: ${successCount} files`);
  if (errorCount > 0) {
    console.log(`❌ Errors:  ${errorCount} files`);
  }
  console.log('='.repeat(60));
  console.log('\n✨ Normalization complete! All mockups are now consistent.\n');
}

// Run if called directly
if (require.main === module) {
  processAll().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { normalizeMockup, processAll };
