import { useState } from "react";
import { buildLabel, checkForUpdate } from "../update";

const MESSAGES = {
  current: "Up to date ✓",
  offline: "Can't reach the game's website. Try again when online.",
  reloading: "Updating…",
} as const;

/** Grown-ups' "Check for update": reloads into a newer version if the website has one. */
export function UpdateButton() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const check = async () => {
    setBusy(true);
    setMessage("");
    const result = await checkForUpdate();
    setMessage(MESSAGES[result]);
    if (result !== "reloading") setBusy(false);
  };

  return (
    <div>
      <button
        type="button"
        onClick={check}
        disabled={busy}
        className="w-full rounded-2xl bg-sky-100 px-4 py-3 font-black text-sky-800 disabled:opacity-70"
      >
        {busy ? "Checking…" : "Check for update"}
      </button>
      <p className="mt-1 text-center text-xs font-semibold text-gray-500" aria-live="polite">
        {message || buildLabel()}
      </p>
    </div>
  );
}
