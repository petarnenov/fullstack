import { create } from "zustand";
import type { TelemetryEvent } from "./types";

const MAX_EVENTS = 500;

export interface EventStore {
  events: TelemetryEvent[];
  paused: boolean;
  cursor: number;
  soundOn: boolean;
  connected: boolean;

  append: (event: TelemetryEvent) => void;
  togglePaused: () => void;
  step: (delta: number) => void;
  rewind: () => void;
  toggleSound: () => void;
  setConnected: (value: boolean) => void;
}

export const useEventStore = create<EventStore>((set) => ({
  events: [],
  paused: false,
  cursor: 0,
  soundOn: false,
  connected: false,

  append: (event) =>
    set((state) => {
      if (state.paused) return state;
      const next = state.events.length >= MAX_EVENTS
        ? [...state.events.slice(state.events.length - MAX_EVENTS + 1), event]
        : [...state.events, event];
      return { events: next, cursor: next.length };
    }),

  togglePaused: () =>
    set((state) => ({
      paused: !state.paused,
      cursor: state.paused ? state.events.length : state.cursor,
    })),

  step: (delta) =>
    set((state) => {
      if (!state.paused) return state;
      const cursor = Math.max(0, Math.min(state.events.length, state.cursor + delta));
      return { cursor };
    }),

  rewind: () =>
    set((state) => ({ cursor: 0, paused: true, events: state.events })),

  toggleSound: () => set((state) => ({ soundOn: !state.soundOn })),

  setConnected: (value) => set({ connected: value }),
}));
