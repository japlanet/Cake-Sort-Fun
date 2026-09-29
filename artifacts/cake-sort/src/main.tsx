import { createRoot } from "react-dom/client";
import App from "./App";
// Fonts ship inside the game so nothing is fetched from Google and they work offline.
import "@fontsource/nunito/latin-700.css";
import "@fontsource/nunito/latin-800.css";
import "@fontsource/nunito/latin-900.css";
import "@fontsource/fredoka/latin-600.css";
import "@fontsource/fredoka/latin-700.css";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Offline play: the service worker caches the game after the first visit.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // Offline caching is an extra; the game runs fine without it.
    });
  });
}
