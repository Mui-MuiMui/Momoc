import { useEffect, useRef, useCallback } from "react";
import { useEditor } from "@craftjs/core";
import { useEditorStore } from "../stores/editorStore";
import { getVsCodeApi } from "../utils/vscodeApi";

const DEBOUNCE_MS = 500;

export function useSaveManager() {
  const { query } = useEditor();
  const { setIsDirty } = useEditorStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>("");
  const initializedRef = useRef(false);

  const sendSave = useCallback(
    (serialized: string) => {
      getVsCodeApi().postMessage({
        type: "doc:save",
        payload: { content: serialized },
      });
      lastSavedRef.current = serialized;
      setIsDirty(false);
    },
    [setIsDirty],
  );

  // Immediate save (Ctrl+S)
  const saveNow = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    try {
      const serialized = query.serialize();
      sendSave(serialized);
    } catch {
      // editor not ready
    }
  }, [query, sendSave]);

  // Listen to Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        saveNow();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [saveNow]);

  // Watch for Craft.js state changes
  useEffect(() => {
    const checkInterval = setInterval(() => {
      try {
        const serialized = query.serialize();

        // Skip the very first check (initial load)
        if (!initializedRef.current) {
          initializedRef.current = true;
          lastSavedRef.current = serialized;
          return;
        }

        if (serialized !== lastSavedRef.current) {
          setIsDirty(true);

          if (timerRef.current) {
            clearTimeout(timerRef.current);
          }
          timerRef.current = setTimeout(() => {
            sendSave(serialized);
            timerRef.current = null;
          }, DEBOUNCE_MS);
        }
      } catch {
        // editor not ready
      }
    }, 300);

    return () => {
      clearInterval(checkInterval);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [query, sendSave, setIsDirty]);

  return { saveNow };
}
