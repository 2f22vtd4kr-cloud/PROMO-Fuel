import { existsSync } from "fs";
import path from "path";

function resolveDbPath(): string {
  const envPath = process.env["DB_PATH"];
  if (envPath) {
    // If env var is absolute or resolves locally — use it directly
    if (existsSync(envPath)) return envPath;
    // Env var is a relative path (e.g. ./data/campaigns.db from workspace root),
    // but this process runs from artifacts/api-server/ — try workspace root resolution
    const fromRoot = path.resolve(process.cwd(), "../..", envPath);
    if (existsSync(fromRoot)) return fromRoot;
  }
  // Primary location: data/campaigns.db (persistent directory)
  const fromData = path.resolve(process.cwd(), "data/campaigns.db");
  if (existsSync(fromData)) return fromData;
  // Dev: process launched from artifacts/api-server — db is two levels up
  const fromDataUp = path.resolve(process.cwd(), "../../data/campaigns.db");
  if (existsSync(fromDataUp)) return fromDataUp;
  // Legacy fallback: root campaigns.db (pre-migration)
  const fromCwd = path.resolve(process.cwd(), "campaigns.db");
  if (existsSync(fromCwd)) return fromCwd;
  return path.resolve(process.cwd(), "../../campaigns.db");
}

export const DB_PATH = resolveDbPath();
