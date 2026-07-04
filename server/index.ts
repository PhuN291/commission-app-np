import { createServer } from "http";
import { createApp, log } from "./app";
import { serveStatic } from "./static";

// Local entry: dựng app (createApp) rồi thêm phần phục vụ client + LISTEN.
// - production: serveStatic(dist/public)
// - development: vite middleware (HMR)
// Trên Vercel KHÔNG chạy file này — dùng api/index.ts (serverless), static do CDN phục vụ.
(async () => {
  const app = await createApp();
  const httpServer = createServer(app);

  // importantly only setup vite in development and after all other routes so the
  // catch-all route doesn't interfere with the API routes.
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve on the port from env PORT (default 3001). Serves both API + client.
  const port = parseInt(process.env.PORT || "3001", 10);
  httpServer.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
