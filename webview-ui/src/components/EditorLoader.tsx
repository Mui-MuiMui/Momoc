import { useEffect, useRef, type MutableRefObject } from "react";
import { useEditor } from "@craftjs/core";
import { useEditorStore, type Memo } from "../stores/editorStore";

interface EditorLoaderProps {
  loadingRef: MutableRefObject<boolean>;
  lastSavedRef: MutableRefObject<string>;
  lastCraftStateRef: MutableRefObject<string>;
}

/**
 * Loads saved Craft.js state + memos from the document content when the file is opened.
 * Supports both old format (raw Craft.js JSON) and new format (version: 1 wrapper).
 * Must be placed inside <Editor> to access useEditor().
 */
export function EditorLoader({
  loadingRef,
  lastSavedRef,
  lastCraftStateRef,
}: EditorLoaderProps) {
  const { actions, query } = useEditor();
  const { documentContent, setMemos, setViewportMode, setCustomViewportSize } = useEditorStore();
  const lastDeserializedRef = useRef<string>("");
  const actionsRef = useRef(actions);
  actionsRef.current = actions;
  const queryRef = useRef(query);
  queryRef.current = query;

  useEffect(() => {
    if (!documentContent) return;

    // Skip if we already deserialized this exact content
    if (documentContent === lastDeserializedRef.current) return;

    try {
      const parsed = JSON.parse(documentContent);

      let craftStateStr: string;
      let memos: Memo[] = [];

      if (parsed.version && parsed.craftState) {
        // New format: { version: 1, craftState: {...}, memos: [...], viewport: {...} }
        craftStateStr = JSON.stringify(parsed.craftState);
        memos = Array.isArray(parsed.memos) ? parsed.memos : [];
        // Restore canvas size settings
        if (parsed.viewport) {
          const v = parsed.viewport;
          if (v.mode) setViewportMode(v.mode);
          if (typeof v.width === "number" && typeof v.height === "number") {
            setCustomViewportSize(v.width, v.height);
          }
        }
      } else if (parsed.ROOT) {
        // Old format: raw Craft.js JSON (backward compat)
        craftStateStr = documentContent;
      } else {
        return;
      }

      // If craftState is unchanged, only update memos/viewport (skip deserialize)
      if (craftStateStr === lastCraftStateRef.current) {
        setMemos(memos);
        lastDeserializedRef.current = documentContent;
        return;
      }

      // Save current selection before deserialize (which calls clearEvents)
      let prevSelected: string[] = [];
      try {
        prevSelected = queryRef.current.getEvent("selected").all();
      } catch {
        // No selection or query not ready
      }

      // Suppress onNodesChange saves during deserialize
      loadingRef.current = true;
      actionsRef.current.deserialize(craftStateStr);
      setMemos(memos);
      lastCraftStateRef.current = craftStateStr;
      lastSavedRef.current = documentContent;
      lastDeserializedRef.current = documentContent;

      // Allow saves again after a tick (deserialize triggers sync events)
      requestAnimationFrame(() => {
        // Restore selection if nodes still exist
        if (prevSelected.length > 0) {
          try {
            const validIds = prevSelected.filter((id) => {
              try {
                return !!queryRef.current.node(id).get();
              } catch {
                return false;
              }
            });
            if (validIds.length > 0) {
              actionsRef.current.selectNode(validIds);
            }
          } catch {
            // Selection restore failed – not critical
          }
        }
        loadingRef.current = false;
      });
    } catch {
      // Not valid JSON - new or empty file, use default editor state
      loadingRef.current = false;
    }
    // Only re-run when documentContent changes (actions is accessed via ref)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentContent, loadingRef, lastSavedRef, lastCraftStateRef, setMemos, setViewportMode, setCustomViewportSize]);

  return null;
}
