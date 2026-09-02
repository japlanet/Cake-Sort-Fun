import { useCallback, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

/** A boolean setting remembered in localStorage. */
export function useStoredFlag(key: string, fallback: boolean): [boolean, Dispatch<SetStateAction<boolean>>] {
  const [value, setValue] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : raw !== "false";
    } catch {
      return fallback;
    }
  });
  const set = useCallback<Dispatch<SetStateAction<boolean>>>(
    update => {
      setValue(prev => {
        const next = typeof update === "function" ? update(prev) : update;
        try {
          localStorage.setItem(key, String(next));
        } catch {}
        return next;
      });
    },
    [key],
  );
  return [value, set];
}
