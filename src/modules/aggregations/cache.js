/**
 * Central Caching Layer
 * 
 * WARNING: This caching layer uses an in-memory Map. 
 * This is suitable ONLY for single-instance, local dev environments, or standalone 
 * desktop wraps (e.g. Electron wrap). 
 * 
 * NOT PRODUCTION SCALABLE (multi-instance / serverless / load-balanced environments).
 * If scaling this application to a multi-instance backend, swap this in-memory Map 
 * with a centralized caching engine like Redis or Next.js unstable_cache.
 */

const buckets = new Map();
const DEFAULT_TTL_MS = 60 * 1000; // 60 seconds default

/**
 * Retrieves a cached value from a specific bucket.
 * @param {string} bucketName - Name of the domain/bucket (e.g. 'dashboard', 'ledger')
 * @param {string} key - Cache item key
 * @returns {any|null} The cached data or null if not found or expired
 */
export function getCached(bucketName, key) {
  const bucket = buckets.get(bucketName);
  if (!bucket) return null;

  const cachedItem = bucket.get(key);
  if (!cachedItem) return null;

  const isExpired = Date.now() - cachedItem.timestamp > cachedItem.ttl;
  if (isExpired) {
    bucket.delete(key);
    return null;
  }

  return cachedItem.data;
}

/**
 * Sets a value in a cache bucket.
 * @param {string} bucketName - Name of the domain/bucket (e.g. 'dashboard', 'ledger')
 * @param {string} key - Cache item key
 * @param {any} data - Data to cache
 * @param {number} [ttlMs] - Time-to-live in milliseconds
 */
export function setCached(bucketName, key, data, ttlMs = DEFAULT_TTL_MS) {
  let bucket = buckets.get(bucketName);
  if (!bucket) {
    bucket = new Map();
    buckets.set(bucketName, bucket);
  }

  bucket.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttlMs
  });
}

/**
 * Invalidates (clears) an entire cache bucket.
 * @param {string} bucketName - Name of the domain/bucket to clear
 */
export function invalidateCacheBucket(bucketName) {
  const bucket = buckets.get(bucketName);
  if (bucket) {
    bucket.clear();
  }
}
