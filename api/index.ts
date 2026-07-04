/**
 * Vercel serverless entry. Dựng Express app MỘT lần / warm instance rồi delegate mọi
 * request `/api/*` (theo rewrite trong vercel.json) cho app xử lý.
 *
 * KHÔNG listen (serverless). Static client (dist/public) do Vercel CDN phục vụ, không
 * đi qua function này. Đăng nhập/OTP/token nằm ở DB nên sống qua cold-start.
 */
import type { IncomingMessage, ServerResponse } from "http";
import type { Express } from "express";
import { createApp } from "../server/app";

let appPromise: Promise<Express> | null = null;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!appPromise) appPromise = createApp();
  const app = await appPromise;
  (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(req, res);
}
