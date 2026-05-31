const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const srcPublic = path.join(root, 'public');
const destPublic = path.join(root, '.next', 'standalone', 'public');
const srcStatic = path.join(root, '.next', 'static');
const destStatic = path.join(root, '.next', 'standalone', '.next', 'static');

function copyDir(src, dest) {
  try {
    if (fs.existsSync(src)) {
      // Create destination directory if it doesn't exist
      fs.mkdirSync(dest, { recursive: true });
      fs.cpSync(src, dest, { recursive: true, force: true });
      console.log(`[Copy Standalone] Copied ${src} -> ${dest}`);
    } else {
      console.warn(`[Copy Standalone] Source directory does not exist: ${src}`);
    }
  } catch (err) {
    console.error(`[Copy Standalone] Error copying ${src} -> ${dest}:`, err);
    process.exit(1);
  }
}

console.log('[Copy Standalone] Starting post-build asset copy...');
copyDir(srcPublic, destPublic);
copyDir(srcStatic, destStatic);
console.log('[Copy Standalone] Asset copying complete.');
