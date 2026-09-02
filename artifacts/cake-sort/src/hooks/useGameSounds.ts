import { useCallback, useRef } from "react";

type AudioContextCtor = typeof AudioContext;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
  if (!Ctor) return null;
  return new Ctor();
}

export function useGameSounds(enabled: boolean) {
  const contextRef = useRef<AudioContext | null>(null);

  const playTone = useCallback(
    (frequency: number, duration: number, startDelay = 0, type: OscillatorType = "sine", volume = 0.05) => {
      if (!enabled) return;
      try {
        const context = contextRef.current ?? getAudioContext();
        if (!context) return;
        contextRef.current = context;
        void context.resume();

        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const startAt = context.currentTime + startDelay;

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, startAt);
        gain.gain.setValueAtTime(0.0001, startAt);
        gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(startAt);
        oscillator.stop(startAt + duration + 0.02);
      } catch {
        // Audio is an enhancement; never let it break play.
      }
    },
    [enabled],
  );

  const playPlace = useCallback(() => playTone(440, 0.09), [playTone]);
  const playSlide = useCallback(() => {
    playTone(560, 0.08, 0, "triangle", 0.035);
    playTone(760, 0.1, 0.06, "triangle", 0.035);
  }, [playTone]);
  const playServe = useCallback(() => {
    playTone(659, 0.12);
    playTone(784, 0.12, 0.09);
    playTone(1047, 0.22, 0.18);
  }, [playTone]);
  const playHelper = useCallback(() => {
    playTone(523, 0.1, 0, "triangle");
    playTone(659, 0.1, 0.08, "triangle");
    playTone(784, 0.1, 0.16, "triangle");
    playTone(1047, 0.25, 0.24, "triangle");
  }, [playTone]);
  const playComplete = useCallback(() => {
    playTone(523, 0.14);
    playTone(659, 0.14, 0.1);
    playTone(784, 0.14, 0.2);
    playTone(1047, 0.35, 0.3);
  }, [playTone]);
  const playNope = useCallback(() => playTone(190, 0.14, 0, "triangle"), [playTone]);

  return { playPlace, playSlide, playServe, playHelper, playComplete, playNope };
}
