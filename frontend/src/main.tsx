import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const storedTheme = localStorage.getItem("questions-theme");
document.documentElement.setAttribute(
  "data-theme",
  storedTheme === "light" ? "light" : "dark",
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
