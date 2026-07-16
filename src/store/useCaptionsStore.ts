/**
 * src/store/useCaptionsStore.ts
 *
 * Zustand store for the learner's live-captions preference on the Audio
 * Lesson call screen (see LiveLessonBody in
 * src/app/(home)/audio-lesson.native.tsx). Persisted with AsyncStorage,
 * following the same persist pattern as useLanguageStore.ts — the app's
 * existing precedent for persisting a user preference — so the toggle
 * survives app restarts (offline-first principle, per AGENTS.md).
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

// See useLanguageStore.ts for why this no-op storage is needed during
// Node-side SSR rendering (AsyncStorage's web backend touches `window`).
const noopStorage: StateStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
};

interface CaptionsState {
  /** Whether live captions are shown during audio lesson calls. Default ON. */
  captionsEnabled: boolean;

  /** Flip the preference — used by the captions toggle chip on the call screen. */
  toggleCaptions: () => void;
}

export const useCaptionsStore = create<CaptionsState>()(
  persist(
    (set) => ({
      captionsEnabled: true,

      toggleCaptions: () => set((s) => ({ captionsEnabled: !s.captionsEnabled })),
    }),
    {
      name: "ajamlugg-captions",
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? noopStorage : AsyncStorage
      ),
      partialize: (state) => ({ captionsEnabled: state.captionsEnabled }),
    }
  )
);
