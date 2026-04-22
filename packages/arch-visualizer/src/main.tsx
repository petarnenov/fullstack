import { createRoot } from "react-dom/client";
import App from "./App";

const root = document.getElementById("root");
if (!root) throw new Error("#root not found");

document.body.style.margin = "0";
document.body.style.background = "#020617";
document.body.style.color = "#e2e8f0";
document.body.style.fontFamily = "ui-sans-serif, system-ui, -apple-system, sans-serif";

createRoot(root).render(<App />);
