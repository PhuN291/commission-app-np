// Vercel serverless function. Nội dung thật nằm ở bundle tự-chứa ./_bundle.js do
// `npm run vercel-build` sinh ra (esbuild gộp server + resolve alias @shared/*).
// File này committed để Vercel nhận là function; _bundle.js (prefix _) không thành route.
export { default } from "./_bundle.js";
