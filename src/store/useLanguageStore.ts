/**
 * src/store/useLanguageStore.ts
 *
 * Zustand store for the user's selected Ajami language.
 *
 * Why persist with AsyncStorage?
 *   - The selection should survive app restarts (offline-first principle).
 *   - AsyncStorage is the project-standard local storage layer (see AGENTS.md).
 *
 * Why isHydrated?
 *   - AsyncStorage reads are async. We expose `isHydrated` so the routing
 *     guard can show a spinner instead of flashing the wrong screen while
 *     the store loads from disk.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { LanguageId } from "@/types/learning";

// ─── State & Actions ──────────────────────────────────────────────────────────

interface LanguageState {
  /** The language the user has chosen, or null if not yet selected. */
  selectedLanguageId: LanguageId | null;

  /**
   * True once the persisted value has been read from AsyncStorage.
   * Guards should wait for this before making routing decisions.
   */
  isHydrated: boolean;

  /** Persist the user's language choice. */
  setLanguage: (id: LanguageId) => void;

  /** Clear the selection — used by the dev reset button on the home screen. */
  clearLanguage: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      selectedLanguageId: null,
      isHydrated: false,

      setLanguage: (id) => set({ selectedLanguageId: id }),

      clearLanguage: () => set({ selectedLanguageId: null }),
    }),
    {
      name: "ajamlugg-language",                        // AsyncStorage key
      storage: createJSONStorage(() => AsyncStorage),

      // Called when the store has finished reading from AsyncStorage.
      // Setting isHydrated here gives routing guards a reliable signal.
      onRehydrateStorage: () => (state) => {
        if (state) state.isHydrated = true;
      },
    }
  )
);
