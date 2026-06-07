import { prisma } from "../prisma";

/**
 * Checks for duplicate records in a Prisma model based on field-value pairs.
 * Designed to be reusable across different modules/entities (e.g., Parties, Products).
 *
 * @param {string} modelName - The Prisma model name (camelCase/lowercase, e.g. 'party', 'product')
 * @param {Object} checkFields - Field-value pairs to check (e.g., { name: 'Ali', phoneNumber: '03001234567' })
 * @param {Object} options - Additional options
 * @param {number|string} [options.excludeId] - An ID to exclude from the duplicate check (for edits)
 * @param {string} [options.idField] - The name of the ID field, defaults to 'id'
 * @param {Array<string>} [options.caseInsensitiveFields] - Fields that should be compared in a case-insensitive manner (e.g., ['name'])
 * @returns {Promise<{ found: boolean, matches: Object, record: Object }|null>}
 */
export async function checkDuplicateRecord(modelName, checkFields, options = {}) {
  const { excludeId, idField = "id", caseInsensitiveFields = ["name"] } = options;

  if (!prisma[modelName]) {
    throw new Error(`Prisma model '${modelName}' does not exist.`);
  }

  // Build conditions: Filter out empty or null values
  const conditions = [];
  const entries = Object.entries(checkFields).filter(
    ([_, value]) => value !== undefined && value !== null && String(value).trim() !== ""
  );

  if (entries.length === 0) return null;

  for (const [field, value] of entries) {
    conditions.push({ [field]: { equals: String(value).trim() } });
  }

  const query = {
    where: {
      OR: conditions,
    },
  };

  if (excludeId !== undefined && excludeId !== null) {
    query.where.AND = {
      [idField]: { not: parseInt(excludeId) },
    };
  }

  // Retrieve matching candidate records from DB
  const candidates = await prisma[modelName].findMany(query);

  // Perform a case-insensitive check in Javascript to ensure consistent,
  // database-agnostic behavior (independent of SQLite / Postgres / MSSQL collation settings).
  for (const candidate of candidates) {
    const matches = {};
    let isMatch = false;

    for (const [field, value] of entries) {
      const candidateValue = candidate[field];
      if (candidateValue === undefined || candidateValue === null) continue;

      const vStr = String(value).trim();
      const cStr = String(candidateValue).trim();

      if (caseInsensitiveFields.includes(field)) {
        if (vStr.toLowerCase() === cStr.toLowerCase()) {
          matches[field] = true;
          isMatch = true;
        }
      } else {
        if (vStr === cStr) {
          matches[field] = true;
          isMatch = true;
        }
      }
    }

    if (isMatch) {
      return {
        found: true,
        matches,
        record: candidate,
      };
    }
  }

  return null;
}
