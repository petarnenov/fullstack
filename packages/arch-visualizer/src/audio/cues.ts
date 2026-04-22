import { useEffect } from "react";
import { useEventStore } from "../events/eventStore";

// Minimal WebAudio cues — short sine blip per event. Avoids a howler dep for
// the tiny amount of audio we need. Per-team pitch differentiation keeps the
// soundscape legible during a live demo.
const TEAM_FREQ: Record<string, number> = {
  platform: 660,
  billing: 440,
  accounts: 520,
  trading: 390,
  reporting: 590,
  infra: 330,
};

function beep(ctx: AudioContext, freq: number, durationMs: number, gain: number) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  g.gain.value = 0;
  osc.connect(g).connect(ctx.destination);
  const now = ctx.currentTime;
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(gain, now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
  osc.start(now);
  osc.stop(now + durationMs / 1000 + 0.05);
}

export function useAudioCues(): void {
  const events = useEventStore((s) => s.events);
  const soundOn = useEventStore((s) => s.soundOn);

  useEffect(() => {
    if (!soundOn || events.length === 0) return;
    const last = events[events.length - 1];
    const ctx = (window as unknown as { __ampAudio?: AudioContext }).__ampAudio ?? new AudioContext();
    (window as unknown as { __ampAudio?: AudioContext }).__ampAudio = ctx;
    const freq = TEAM_FREQ[(last.team as string) ?? "infra"] ?? 440;
    if (last.kind === "request") beep(ctx, freq, 80, 0.04);
    else if (last.kind === "response") beep(ctx, freq * 1.5, 100, 0.05);
    else if (last.kind === "invalidate") beep(ctx, 220, 180, 0.05);
  }, [events, soundOn]);
}
