import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Chỉ để biết bản đang chạy là version nào lúc debug (không nắm phần build/deploy).
// Sửa tay số này mỗi lần build/deploy bản mới.
console.log("[NP Chat Hub] version: 1.0.1");

createRoot(document.getElementById("root")!).render(<App />);
