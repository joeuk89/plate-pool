import "@fontsource/barlow/latin-400.css";
import "@fontsource/barlow/latin-500.css";
import "@fontsource/barlow-condensed/latin-600.css";
import "@fontsource/barlow-condensed/latin-700.css";
import "./styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { PicturePrototype } from "./picture-prototype/PicturePrototype";

// PROTOTYPE, throwaway: ?variant= mounts the picture prototype instead of the app.
const prototype = !import.meta.env.PROD && new URLSearchParams(window.location.search).has("variant");

const root = document.getElementById("root");
if (!root) throw new Error("The page has no #root element");

createRoot(root).render(
  <StrictMode>
    {prototype ? <PicturePrototype /> : <App />}
  </StrictMode>,
);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}
