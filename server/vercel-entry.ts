/**
 * Điểm vào để esbuild gộp thành 1 bundle tự-chứa (api/_bundle.js) cho Vercel.
 * Vì @vercel/node KHÔNG tự gộp cây import server (alias @shared/*, import không đuôi
 * trong ESM không resolve được lúc chạy) → tự bundle bằng esbuild của project.
 *
 * Dựng Express app MỘT lần / warm instance, không listen (serverless).
 */
import type { IncomingMessage, ServerResponse } from "http";
import type { Express } from "express";
import { createApp } from "./app";

let appPromise: Promise<Express> | null = null;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!appPromise) appPromise = createApp();
  const app = await appPromise;
  (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(req, res);
}
