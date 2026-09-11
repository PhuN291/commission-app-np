import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "@shared/schema";

// @neondatabase/serverless dùng WebSocket để kết nối — Node cần polyfill này vì
// không có WebSocket built-in (khác edge runtime của Vercel/Cloudflare).
neonConfig.webSocketConstructor = ws;

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
