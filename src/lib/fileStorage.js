import fs from "fs";
import path from "path";

// In production, configure an absolute path outside the Next.js runtime build folder for persistence.
// We default to public/uploads, which is easy to change to a shared volume path (e.g. process.env.UPLOAD_DIR)
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");

/**
 * Stores a file on the local filesystem.
 * Handles path sanitization, folder creation, and returns the public serving path.
 * 
 * @param {File} file - The file object from Request formData
 * @param {string} category - Category prefix for sorting/naming
 * @returns {Promise<string>} Relative URL path
 */
export async function storeFile(file, category = "file") {
  if (!file) throw new Error("No file provided");

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Sanitize file extension
  const rawExt = path.extname(file.name);
  const cleanExt = rawExt.toLowerCase().replace(/[^a-z0-9.]/g, "");
  
  // Sanitize base filename (remove spaces, special characters, limit length)
  const baseName = path.basename(file.name, rawExt);
  const cleanBase = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-") // replace all spaces/special chars with dashes
    .replace(/-+/g, "-")       // remove duplicate dashes
    .replace(/^-|-$/g, "")     // trim leading/trailing dashes
    .slice(0, 50);             // limit length

  const filename = `${category}-${cleanBase}-${Date.now()}${cleanExt}`;

  // Ensure target folder exists
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  const filePath = path.join(UPLOAD_DIR, filename);
  await fs.promises.writeFile(filePath, buffer);

  // Returns relative URL route for serving from next.js static uploads
  return `/uploads/${filename}`;
}

/**
 * Deletes a file on the local filesystem.
 * 
 * @param {string} relativePath - The relative URL path starting with /uploads/
 * @returns {Promise<void>}
 */
export async function deleteFile(relativePath) {
  if (!relativePath || !relativePath.startsWith("/uploads/")) return;

  const fileName = relativePath.replace("/uploads/", "");
  const filePath = path.join(UPLOAD_DIR, fileName);

  try {
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  } catch (e) {
    console.error(`Failed to delete local file at path ${filePath}:`, e);
  }
}
