import { useEffect, useRef, type MutableRefObject } from "react";
import { useEditor } from "@craftjs/core";
import { useEditorStore, type Memo } from "../stores/editorStore";
import { useHistoryLimit } from "../hooks/useHistoryLimit";

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
  const documentContent = useEditorStore((s) => s.documentContent);
  const setMemos = useEditorStore((s) => s.setMemos);
  const setViewportMode = useEditorStore((s) => s.setViewportMode);
  const setCustomViewportSize = useEditorStore((s) => s.setCustomViewportSize);
  const setIntent = useEditorStore((s) => s.setIntent);
  const setLayoutMode = useEditorStore((s) => s.setLayoutMode);
  const setMemosVisible = useEditorStore((s) => s.setMemosVisible);
  const setMemoLineMode = useEditorStore((s) => s.setMemoLineMode);
  const setFileLoading = useEditorStore((s) => s.setFileLoading);
  const historyLimit = useEditorStore((s) => s.historyLimit);
  useHistoryLimit(historyLimit);
  const lastDeserializedRef = useRef<string>("");
  const actionsRef = useRef(actions);
  actionsRef.current = actions;
  const queryRef = useRef(query);
  queryRef.current = query;

  useEffect(() => {
    if (!documentContent) {
      // Don't dismiss spinner here — wait for doc:load message.
      // Empty/new files are handled in App.tsx when doc:load arrives with empty content.
      return;
    }

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
        if (typeof parsed.intent === "string") setIntent(parsed.intent);
        if (parsed.layoutMode === "flow" || parsed.layoutMode === "absolute") {
          setLayoutMode(parsed.layoutMode);
        }
        if (typeof parsed.memosVisible === "boolean") {
          setMemosVisible(parsed.memosVisible);
        }
        if (parsed.memoLineMode === "all" || parsed.memoLineMode === "hover") {
          setMemoLineMode(parsed.memoLineMode);
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

      // Show spinner and suppress onNodesChange saves during deserialize
      setFileLoading(true);
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

        // Wait for React to finish rendering all components before hiding spinner.
        // deserialize() updates Craft.js state synchronously, but React renders
        // child components over multiple frames. Nest rAF calls to let the
        // browser paint incrementally before removing the overlay.
        let remaining = 5;
        const waitForRender = () => {
          if (--remaining > 0) {
            requestAnimationFrame(waitForRender);
          } else {
            setFileLoading(false);
          }
        };
        requestAnimationFrame(waitForRender);
      });
    } catch {
      // Not valid JSON - new or empty file, use default editor state
      loadingRef.current = false;
      setFileLoading(false);
    }
    // Only re-run when documentContent changes (actions is accessed via ref)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentContent, loadingRef, lastSavedRef, lastCraftStateRef, setMemos, setViewportMode, setCustomViewportSize, setIntent, setLayoutMode, setFileLoading, setMemosVisible, setMemoLineMode]);

  return null;
}
