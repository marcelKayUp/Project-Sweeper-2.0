import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GeneratorScreen } from "./screen.tsx";
import "./style.css";

const root = document.getElementById("root");
if (!root) throw new Error("root fehlt");
createRoot(root).render(<StrictMode><GeneratorScreen /></StrictMode>);
