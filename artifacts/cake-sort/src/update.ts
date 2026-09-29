// Offline play and keeping the installed app up to date (see public/sw.js).
//
// The service worker loads the page network-first, so a fresh launch always
// runs the newest version. But an iPad home-screen app is usually resumed,
// not relaunched, and then keeps running the old build for days. So:
//   - when the app comes back after being away for 5+ minutes, it asks the
//     website for the current page and reloads if the build changed (not
//     sooner, so a child stepping away for a moment keeps their game);
//   - the grown-ups' "Check for update" button does the same on demand.
// A build is identified by the hashed script name Vite writes into the page.
// Every step does nothing when offline, so the cached game keeps working.

declare const __BUILD_TIME__: string;

const BASE = import.meta.env.BASE_URL;
const AWAY_MS = 5 * 60 * 1000;
let registration: ServiceWorkerRegistration | null = null;

export type UpdateResult = "current" | "offline" | "reloading";

/** Register the service worker and check for a new build when the app returns. */
export function setupOfflineAndUpdates() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    // updateViaCache "none": GitHub Pages lets browsers cache sw.js for 10
    // minutes; update checks must always ask the network.
    navigator.serviceWorker
      .register(`${BASE}sw.js`, { updateViaCache: "none" })
      .then(r => { registration = r; })
      .catch(() => {
        // Offline caching is an extra; the game runs fine without it.
      });
  });
  let hiddenAt = 0;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      hiddenAt = Date.now();
      return;
    }
    registration?.update().catch(() => undefined);
    if (hiddenAt && Date.now() - hiddenAt >= AWAY_MS) void checkForUpdate();
  });
}

/** The page's main script, e.g. /Game/assets/index-8rE_HTyR.js. */
function scriptOf(html: string): string | null {
  return html.match(/<script[^>]*type="module"[^>]*src="([^"]+)"/)?.[1] ?? null;
}

/** Ask the website for its current build (null when it can't be reached). */
async function latestBuild(): Promise<string | null> {
  try {
    // The update-check marker makes the service worker pass this straight to the network.
    const res = await fetch(`${BASE}?update-check=${Date.now()}`, { cache: "no-store" });
    return res.ok ? scriptOf(await res.text()) : null;
  } catch {
    return null;
  }
}

/** Reload into a newer build if the website has one. */
export async function checkForUpdate(): Promise<UpdateResult> {
  const latest = await latestBuild();
  if (!latest) return "offline";
  const running = document.querySelector('script[type="module"][src]')?.getAttribute("src") ?? null;
  if (latest === running) return "current";
  try { await registration?.update(); } catch { /* the reload still fetches the new page */ }
  window.location.reload();
  return "reloading";
}

/** When this build was made, for the grown-ups' panel. */
export function buildLabel(): string {
  const t = new Date(__BUILD_TIME__);
  return Number.isNaN(t.getTime())
    ? ""
    : "Version from " + t.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
