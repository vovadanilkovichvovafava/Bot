/**
 * Icon Generator Script
 * Run with: node scripts/generate-icons.js
 *
 * This script generates PWA icons from the SVG source.
 * Requires: sharp (npm install sharp)
 */

const fs = require('fs');
const path = require('path');

// Try to use sharp if available, otherwise create placeholder PNGs
async function generateIcons() {
  const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
  const iconsDir = path.join(__dirname, '../public/icons');

  // Ensure directory exists
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  let sharp;
  try {
    sharp = require('sharp');
    console.log('Using sharp for high-quality PNG generation');
  } catch (e) {
    console.log('Sharp not available, creating placeholder icons');
    sharp = null;
  }

  const svgPath = path.join(iconsDir, 'icon.svg');

  if (sharp && fs.existsSync(svgPath)) {
    // Generate PNGs from SVG using sharp
    for (const size of sizes) {
      const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
      await sharp(svgPath)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      console.log(`Generated: icon-${size}x${size}.png`);
    }

    // Generate badge
    await sharp(svgPath)
      .resize(72, 72)
      .png()
      .toFile(path.join(iconsDir, 'badge-72x72.png'));
    console.log('Generated: badge-72x72.png');

    // Generate shortcut icons
    await sharp(svgPath)
      .resize(96, 96)
      .png()
      .toFile(path.join(iconsDir, 'live-shortcut.png'));
    await sharp(svgPath)
      .resize(96, 96)
      .png()
      .toFile(path.join(iconsDir, 'chat-shortcut.png'));
    console.log('Generated shortcut icons');

  } else {
    // Create simple SVG placeholders for each size
    for (const size of sizes) {
      const svg = createSimpleSVG(size);
      const outputPath = path.join(iconsDir, `icon-${size}x${size}.svg`);
      fs.writeFileSync(outputPath, svg);
      console.log(`Created placeholder: icon-${size}x${size}.svg`);
    }
  }

  console.log('\nIcon generation complete!');
  console.log('For best results, install sharp: npm install sharp');
}

function createSimpleSVG(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#10141E"/>
  <circle cx="256" cy="256" r="140" fill="#4A7AFF" opacity="0.2"/>
  <text x="256" y="290" font-family="Arial" font-size="180" font-weight="bold" fill="#4A7AFF" text-anchor="middle">AI</text>
</svg>`;
}

generateIcons().catch(console.error);
