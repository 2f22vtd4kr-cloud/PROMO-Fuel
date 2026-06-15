import { existsSync } from "fs";
import path from "path";

function resolveDbPath(): string {
  if (process.env["DB_PATH"]) return process.env["DB_PATH"];
  // Production: process is launched from workspace root — campaigns.db is right here
  const fromCwd = path.resolve(process.cwd(), "campaigns.db");
  if (existsSync(fromCwd)) return fromCwd;
  // Dev: process is launched from artifacts/api-server — db is two levels up
  return path.resolve(process.cwd(), "../../campaigns.db");
}

export const DB_PATH = resolveDbPath();
