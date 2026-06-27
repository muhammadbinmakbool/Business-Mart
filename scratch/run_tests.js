import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const resolverPath = path.resolve(__dirname, '../src/modules/intake/utils/IntakePricingResolver.js');
const testPath = path.resolve(__dirname, '../src/modules/intake/utils/IntakePricingResolver.test.js');

const resolverTempPath = path.resolve(__dirname, '../src/modules/intake/utils/IntakePricingResolver.temp.js');
const testTempPath = path.resolve(__dirname, '../src/modules/intake/utils/IntakePricingResolver.test.temp.js');

try {
  // Read and replace @/lib/prisma with in-memory mock in resolver
  let resolverContent = fs.readFileSync(resolverPath, 'utf8');
  resolverContent = resolverContent.replace('import { prisma } from "@/lib/prisma";', 'export const prisma = { intakeTransaction: {}, product: {} };');
  fs.writeFileSync(resolverTempPath, resolverContent, 'utf8');

  // Read and replace resolver import in test
  let testContent = fs.readFileSync(testPath, 'utf8');
  testContent = testContent.replace('import { prisma } from "../../../lib/prisma.js";', 'import { prisma } from "./IntakePricingResolver.temp.js";');
  testContent = testContent.replace('./IntakePricingResolver.js', './IntakePricingResolver.temp.js');
  fs.writeFileSync(testTempPath, testContent, 'utf8');

  console.log("Running test suite using node...");
  execSync('node "' + testTempPath + '"', { stdio: 'inherit' });
} catch (err) {
  console.error("Runner failed:", err);
  process.exit(1);
} finally {
  // Cleanup
  if (fs.existsSync(resolverTempPath)) fs.unlinkSync(resolverTempPath);
  if (fs.existsSync(testTempPath)) fs.unlinkSync(testTempPath);
}
