export const PROVIDERS = {
  MSSQL: "mssql",
  SQLITE: "sqlite",
};

export const DEFAULT_PROVIDER = PROVIDERS.MSSQL;

export function getDatabaseConfig() {
  const provider = process.env.DB_PROVIDER || DEFAULT_PROVIDER;
  const normalized = provider.toLowerCase();
  
  return {
    provider: normalized,
    isMSSQL: normalized === PROVIDERS.MSSQL,
    isSQLite: normalized === PROVIDERS.SQLITE,
  };
}
