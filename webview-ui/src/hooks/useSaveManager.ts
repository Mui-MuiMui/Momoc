import { useEffect, useRef, useCallback } from "react";
import { useEditor } from "@craftjs/core";
import { useEditorStore } from "../stores/editorStore";
import { getVsCodeApi } from "../utils/vscodeApi";

const DEBOUNCE_MS = 800;
const POLL_MS = 400;

/**
 * Watches Craft.js state changes and auto-saves to the extension host.
 * Uses refs to avoid useEffect dependency issues that would cancel debounce timers.
 */
export function useSaveManager() {
  const { query } = useEditor();
  const { setIsDirty } = useEditorStore();

  // Stable refs to avoid effect re-creation
  const queryRef = useRef(query);
  queryRef.current = query;

  const setIsDirtyRef = useRef(setIsDirty);
  setIsDirtyRef.current = setIsDirty;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>("");
  const initializedRef = useRef(false);

  const doSave = useCallback((serialized: string) => {
    getVsCodeApi().postMessage({
      type: "doc:save",
      payload: { content: serialized },
    });
    lastSavedRef.current = serialized;
    setIsDirtyRef.current(false);
  }, []);

  // Immediate save (Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        try {
          const serialized = queryRef.current.serialize();
          doSave(serialized);
        } catch {
          // editor not ready
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [doSave]);

  // Poll for Craft.js state changes - runs ONCE, uses refs for latest values
  useEffect(() => {
    const checkInterval = setInterval(() => {
      try {
        const serialized = queryRef.current.serialize();

        // Capture initial state on first poll
        if (!initializedRef.current) {
          initializedRef.current = true;
          lastSavedRef.current = serialized;
          return;
        }

        if (serialized !== lastSavedRef.current) {
          setIsDirtyRef.current(true);

          // Debounce: reset timer on each change
          if (timerRef.current) {
            clearTimeout(timerRef.current);
          }
          timerRef.current = setTimeout(() => {
            // Re-read current state at save time (might have changed during debounce)
            try {
              const latest = queryRef.current.serialize();
              doSave(latest);
            } catch {
              // editor not ready
            }
            timerRef.current = null;
          }, DEBOUNCE_MS);
        }
      } catch {
        // editor not ready
      }
    }, POLL_MS);

    return () => {
      clearInterval(checkInterval);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
    // Empty deps: this effect runs once. Refs provide access to latest values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
