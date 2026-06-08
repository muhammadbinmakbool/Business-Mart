import { getDatabaseConfig } from "./config";

export function getProvider() {
  const config = getDatabaseConfig();
  return config.provider;
}

export function isSQLite() {
  const config = getDatabaseConfig();
  return config.isSQLite;
}

export function isMSSQL() {
  const config = getDatabaseConfig();
  return config.isMSSQL;
}
