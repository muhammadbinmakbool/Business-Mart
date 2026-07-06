const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const targetDirs = [
  path.join(rootDir, 'prisma', 'client'),
  path.join(rootDir, '.next', 'standalone', 'prisma', 'client')
];

let totalDeletedCount = 0;
let totalFreedBytes = 0;

console.log('[Prisma Clean] Scanning for temporary engine files...');

for (const dir of targetDirs) {
  if (!fs.existsSync(dir)) {
    continue;
  }

  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (file.startsWith('query_engine') && file.includes('.tmp')) {
        const filePath = path.join(dir, file);
        try {
          const stats = fs.statSync(filePath);
          totalFreedBytes += stats.size;
          fs.unlinkSync(filePath);
          totalDeletedCount++;
        } catch (err) {
          console.error(`[Prisma Clean] Failed to delete ${file} in ${path.basename(dir)}:`, err.message);
        }
      }
    }
  } catch (err) {
    console.error(`[Prisma Clean] Error scanning directory ${dir}:`, err.message);
  }
}

if (totalDeletedCount > 0) {
  const freedMb = (totalFreedBytes / (1024 * 1024)).toFixed(2);
  if (freedMb >= 1024) {
    const freedGb = (freedMb / 1024).toFixed(2);
    console.log(`[Prisma Clean] Deleted ${totalDeletedCount} temporary Prisma engine files. Freed ${freedGb} GB.`);
  } else {
    console.log(`[Prisma Clean] Deleted ${totalDeletedCount} temporary Prisma engine files. Freed ${freedMb} MB.`);
  }
} else {
  console.log('[Prisma Clean] No temporary engine files found.');
}
