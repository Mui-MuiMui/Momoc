import { useEffect, useRef, type MutableRefObject } from "react";
import { useEditor } from "@craftjs/core";
import { useEditorStore, type Memo } from "../stores/editorStore";
import { useHistoryLimit } from "../hooks/useHistoryLimit";

interface EditorLoaderProps {
  loadingRef: MutableRefObject<boolean>;
  lastSavedRef: MutableRefObject<string>;
  lastCraftStateRef: MutableRefObject<string>;
  buildSaveContent: (craftStateStr: string) => string;
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
  buildSaveContent,
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
        memos = (Array.isArray(parsed.memos) ? parsed.memos : []).map((m: Memo & { targetNodeId?: string }) => ({
          ...m,
          targetNodeIds: m.targetNodeIds ?? (m.targetNodeId ? [m.targetNodeId] : []),
        }));
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
      // Use buildSaveContent so the format matches what scheduleSave produces.
      // Previously documentContent was used directly, causing format mismatches
      // (missing memosVisible/memoLineMode keys) that defeated the no-change check
      // and triggered unnecessary saves.
      lastSavedRef.current = buildSaveContent(craftStateStr);
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
        // Wait for React to finish rendering all components before allowing
        // saves and hiding spinner. deserialize() updates Craft.js state
        // synchronously, but React renders child components over multiple
        // frames. Keep loadingRef true until rendering settles to prevent
        // post-deserialize onNodesChange from triggering unnecessary saves
        // (especially on slow machines where rendering takes longer).
        let remaining = 5;
        const waitForRender = () => {
          if (--remaining > 0) {
            requestAnimationFrame(waitForRender);
          } else {
            loadingRef.current = false;
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
  }, [documentContent, loadingRef, lastSavedRef, lastCraftStateRef, buildSaveContent, setMemos, setViewportMode, setCustomViewportSize, setIntent, setLayoutMode, setFileLoading, setMemosVisible, setMemoLineMode]);

  return null;
}
