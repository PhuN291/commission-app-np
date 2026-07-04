import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { getCurrentUser } from "./permissions";

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

/** 2 cửa đăng nhập không cần token; mọi /api khác phải có Bearer token hợp lệ. */
const AUTH_WHITELIST = new Set(["/api/auth/request-otp", "/api/auth/verify-otp"]);

/**
 * Dựng Express app đầy đủ (json + logging + auth middleware + routes + error handler)
 * NHƯNG KHÔNG listen và KHÔNG serveStatic/vite. Dùng chung cho:
 *  - local entry (server/index.ts) → thêm serveStatic (prod) / vite (dev) + listen
 *  - serverless entry (api/index.ts trên Vercel) → export default handler; static do CDN
 *
 * Tách khỏi listen() để import được trên serverless mà không mở cổng.
 */
export async function createApp(): Promise<Express> {
  const app = express();
  // registerRoutes nhận httpServer nhưng chỉ dùng để return; không mở ws, không listen ở đây.
  const httpServer = createServer(app);

  app.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ extended: false }));

  // Log method/path/status/time cho /api — KHÔNG in nội dung response (tránh lộ token, SĐT).
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
      }
    });
    next();
  });

  // Lớp kiểm đăng nhập chung: áp cho MỌI /api (trừ 2 cửa đăng nhập). Bearer token → user.
  app.use(async (req, res, next) => {
    if (!req.path.startsWith("/api")) return next();
    if (AUTH_WHITELIST.has(req.path)) return next();
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "unauthorized", message: "Vui lòng đăng nhập" });
    }
    req.currentUser = user;
    next();
  });

  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) {
      return next(err);
    }
    return res.status(status).json({ message });
  });

  return app;
}
