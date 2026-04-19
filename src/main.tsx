import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { installMockApi } from "./lib/mock-api";

installMockApi();

createRoot(document.getElementById("root")!).render(<App />);
