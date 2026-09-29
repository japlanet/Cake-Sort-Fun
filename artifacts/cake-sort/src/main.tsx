import { createRoot } from "react-dom/client";
import App from "./App";
import { setupOfflineAndUpdates } from "./update";
// Fonts ship inside the game so nothing is fetched from Google and they work offline.
import "@fontsource/nunito/latin-700.css";
import "@fontsource/nunito/latin-800.css";
import "@fontsource/nunito/latin-900.css";
import "@fontsource/fredoka/latin-600.css";
import "@fontsource/fredoka/latin-700.css";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Offline play and updates for the installed app (see update.ts).
setupOfflineAndUpdates();
