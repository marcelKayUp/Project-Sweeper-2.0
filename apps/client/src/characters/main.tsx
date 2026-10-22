import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CharacterWorkshop } from "./screen.tsx";
import { ModularCharacterWorkshop } from "./modularScreen.tsx";
import "./style.css";
import "./modularStyle.css";

const root = document.getElementById("root");
if (!root) throw new Error("Werkstatt-Root fehlt");
const LegacyWorkshop = new URLSearchParams(window.location.search).get("quelle") === "prozedural";
createRoot(root).render(<StrictMode>{LegacyWorkshop ? <CharacterWorkshop /> : <ModularCharacterWorkshop />}</StrictMode>);
