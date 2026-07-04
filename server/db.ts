import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

// Nạp .env lúc runtime (Node 20.12+ built-in, không cần dotenv). tsx/node không tự
// load .env. Prod set env trực tiếp → bỏ qua nếu không có file (.env optional).
const loadEnvFile = (process as unknown as { loadEnvFile?: (path?: string) => void }).loadEnvFile;
try {
  loadEnvFile?.(".env");
} catch {
  /* .env không tồn tại — bỏ qua, dùng env có sẵn (vd production) */
}

if (!process.env.DATABASE_URL) throw new Error("Thiếu DATABASE_URL");

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
