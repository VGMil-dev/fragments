import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles/main.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("No se encontró el elemento raíz de Fragments.");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
