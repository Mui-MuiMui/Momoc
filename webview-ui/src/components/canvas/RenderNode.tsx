import { useNode, useEditor } from "@craftjs/core";
import { useEffect, useRef, useCallback } from "react";
import { useEditorStore } from "../../stores/editorStore";

type HandlePosition = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "right" | "bottom";

const HANDLE_SIZE = 8;

const cursorMap: Record<HandlePosition, string> = {
  "top-left": "nwse-resize",
  "top-right": "nesw-resize",
  "bottom-left": "nesw-resize",
  "bottom-right": "nwse-resize",
  right: "ew-resize",
  bottom: "ns-resize",
};

export function RenderNode({
  render,
}: {
  render: React.ReactElement;
}) {
  const { id } = useNode();
  const {
    isActive,
    isHover,
    dom,
    name,
    isCanvas,
    keepAspectRatio,
    nodeTop,
    nodeLeft,
  } = useNode((node) => ({
    isActive: node.events.selected,
    isHover: node.events.hovered,
    dom: node.dom,
    name: node.data.displayName || node.data.name || "Element",
    isCanvas: node.data.isCanvas,
    keepAspectRatio: !!(node.data.props as Record<string, unknown>)?.keepAspectRatio,
    nodeTop: (node.data.props as Record<string, unknown>)?.top as string | undefined,
    nodeLeft: (node.data.props as Record<string, unknown>)?.left as string | undefined,
  }));

  const layoutMode = useEditorStore((s) => s.layoutMode);

  const { actions: editorActions } = useEditor();
  const handlesRef = useRef<HTMLDivElement[]>([]);
  const resizeStateRef = useRef<{
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    handle: HandlePosition;
  } | null>(null);

  // Outline styles
  useEffect(() => {
    if (!dom) return;

    if (isCanvas) {
      dom.style.outline = isActive
        ? "2px solid #2196f3"
        : isHover
          ? "1px dashed #64b5f6"
          : "1px dashed rgba(150,150,150,0.3)";
    } else {
      dom.style.outline = isActive
        ? "2px solid #2196f3"
        : isHover
          ? "1px solid #64b5f6"
          : "none";
    }

    dom.style.outlineOffset = "-1px";
    dom.style.position = dom.style.position || "relative";
    dom.style.cursor = "pointer";

    if (isCanvas) {
      if (!dom.style.minHeight || dom.style.minHeight === "0px") {
        dom.style.minHeight = "40px";
      }
      if (!dom.style.minWidth || dom.style.minWidth === "0px") {
        dom.style.minWidth = "40px";
      }
    }
  }, [dom, isActive, isHover, isCanvas]);

  // Apply absolute positioning when layoutMode === "absolute"
  useEffect(() => {
    if (!dom) return;
    if (layoutMode === "absolute") {
      dom.style.position = "absolute";
      dom.style.top = nodeTop || "0px";
      dom.style.left = nodeLeft || "0px";
    } else {
      dom.style.position = "";
      dom.style.top = "";
      dom.style.left = "";
    }
  }, [dom, layoutMode, nodeTop, nodeLeft]);

  // Drag-to-move in absolute mode (active node only)
  useEffect(() => {
    if (!dom || !isActive || layoutMode !== "absolute") return;

    const onMouseDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest("[data-momoc-handle]")) return;
      e.preventDefault();
      e.stopPropagation();

      const startX = e.clientX;
      const startY = e.clientY;
      const startTop = parseInt(dom.style.top || "0", 10);
      const startLeft = parseInt(dom.style.left || "0", 10);

      const onMove = (ev: MouseEvent) => {
        dom.style.top = `${startTop + ev.clientY - startY}px`;
        dom.style.left = `${startLeft + ev.clientX - startX}px`;
      };
      const onUp = (ev: MouseEvent) => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        const newTop = `${startTop + ev.clientY - startY}px`;
        const newLeft = `${startLeft + ev.clientX - startX}px`;
        editorActions.setProp(id, (props: Record<string, unknown>) => {
          props.top = newTop;
          props.left = newLeft;
        });
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    };

    dom.addEventListener("mousedown", onMouseDown);
    return () => dom.removeEventListener("mousedown", onMouseDown);
  }, [dom, isActive, layoutMode, editorActions, id]);

  // Label badge
  useEffect(() => {
    if (!dom) return;

    const existingLabel = dom.querySelector("[data-momoc-label]");
    if (existingLabel) existingLabel.remove();

    if (isActive || isHover) {
      const label = document.createElement("div");
      label.setAttribute("data-momoc-label", "true");
      label.style.cssText = `
        position: absolute;
        top: -20px;
        left: 0;
        background: ${isActive ? "#2196f3" : "#64b5f6"};
        color: white;
        font-size: 10px;
        padding: 1px 6px;
        border-radius: 2px 2px 0 0;
        pointer-events: none;
        z-index: 1000;
        white-space: nowrap;
        font-family: system-ui, sans-serif;
        line-height: 16px;
      `;
      label.textContent = name;
      dom.style.position =
        dom.style.position === "static" ? "relative" : dom.style.position || "relative";
      dom.appendChild(label);
    }

    return () => {
      if (dom) {
        const label = dom.querySelector("[data-momoc-label]");
        if (label) label.remove();
      }
    };
  }, [dom, isActive, isHover, name]);

  // Commit resize to Craft.js props
  const commitResize = useCallback(
    (newWidth: number, newHeight: number, handle: HandlePosition) => {
      const widthOnly = handle === "right" && !keepAspectRatio;
      const heightOnly = handle === "bottom" && !keepAspectRatio;
      editorActions.setProp(id, (props: Record<string, unknown>) => {
        if (!heightOnly) props.width = `${Math.round(newWidth)}px`;
        if (!widthOnly) props.height = `${Math.round(newHeight)}px`;
      });
    },
    [id, editorActions, keepAspectRatio],
  );

  // Calculate new dimensions for a resize operation
  const calcResize = useCallback(
    (
      state: { startWidth: number; startHeight: number; handle: HandlePosition },
      dx: number,
      dy: number,
      lock: boolean,
    ): { w: number; h: number } => {
      let w = state.startWidth;
      let h = state.startHeight;
      const ratio = state.startWidth / state.startHeight;

      switch (state.handle) {
        case "right":
          w = Math.max(20, state.startWidth + dx);
          if (lock) h = Math.max(20, w / ratio);
          break;
        case "bottom":
          h = Math.max(20, state.startHeight + dy);
          if (lock) w = Math.max(20, h * ratio);
          break;
        case "bottom-right":
          w = Math.max(20, state.startWidth + dx);
          if (lock) { h = Math.max(20, w / ratio); }
          else { h = Math.max(20, state.startHeight + dy); }
          break;
        case "bottom-left":
          w = Math.max(20, state.startWidth - dx);
          if (lock) { h = Math.max(20, w / ratio); }
          else { h = Math.max(20, state.startHeight + dy); }
          break;
        case "top-right":
          w = Math.max(20, state.startWidth + dx);
          if (lock) { h = Math.max(20, w / ratio); }
          else { h = Math.max(20, state.startHeight - dy); }
          break;
        case "top-left":
          w = Math.max(20, state.startWidth - dx);
          if (lock) { h = Math.max(20, w / ratio); }
          else { h = Math.max(20, state.startHeight - dy); }
          break;
      }
      return { w, h };
    },
    [],
  );

  // Resize handlers
  const onMouseDown = useCallback(
    (handle: HandlePosition, e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!dom) return;

      const rect = dom.getBoundingClientRect();
      resizeStateRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startWidth: rect.width,
        startHeight: rect.height,
        handle,
      };

      const onMouseMove = (ev: MouseEvent) => {
        const state = resizeStateRef.current;
        if (!state || !dom) return;
        const dx = ev.clientX - state.startX;
        const dy = ev.clientY - state.startY;
        const { w, h } = calcResize(state, dx, dy, keepAspectRatio);
        const widthOnly = state.handle === "right" && !keepAspectRatio;
        const heightOnly = state.handle === "bottom" && !keepAspectRatio;
        if (!heightOnly) dom.style.width = `${w}px`;
        if (!widthOnly) dom.style.height = `${h}px`;
      };

      const onMouseUp = (ev: MouseEvent) => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        const state = resizeStateRef.current;
        if (!state || !dom) return;
        const dx = ev.clientX - state.startX;
        const dy = ev.clientY - state.startY;
        const { w, h } = calcResize(state, dx, dy, keepAspectRatio);
        commitResize(w, h, state.handle);
        resizeStateRef.current = null;
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [dom, commitResize, calcResize, keepAspectRatio],
  );

  // Create/remove resize handles
  useEffect(() => {
    if (!dom) return;

    // Clean up old handles
    handlesRef.current.forEach((h) => h.remove());
    handlesRef.current = [];

    if (!isActive) return;

    dom.style.position =
      dom.style.position === "static" ? "relative" : dom.style.position || "relative";

    const handles: HandlePosition[] = [
      "top-left",
      "top-right",
      "bottom-left",
      "bottom-right",
      "right",
      "bottom",
    ];

    handles.forEach((pos) => {
      const handle = document.createElement("div");
      handle.setAttribute("data-momoc-handle", pos);
      handle.style.cssText = `
        position: absolute;
        width: ${HANDLE_SIZE}px;
        height: ${HANDLE_SIZE}px;
        background: #2196f3;
        border: 1px solid white;
        z-index: 1001;
        cursor: ${cursorMap[pos]};
        border-radius: 1px;
        pointer-events: auto;
      `;

      const half = HANDLE_SIZE / 2;
      switch (pos) {
        case "top-left":
          handle.style.top = `${-half}px`;
          handle.style.left = `${-half}px`;
          break;
        case "top-right":
          handle.style.top = `${-half}px`;
          handle.style.right = `${-half}px`;
          break;
        case "bottom-left":
          handle.style.bottom = `${-half}px`;
          handle.style.left = `${-half}px`;
          break;
        case "bottom-right":
          handle.style.bottom = `${-half}px`;
          handle.style.right = `${-half}px`;
          break;
        case "right":
          handle.style.top = "50%";
          handle.style.right = `${-half}px`;
          handle.style.transform = "translateY(-50%)";
          break;
        case "bottom":
          handle.style.bottom = `${-half}px`;
          handle.style.left = "50%";
          handle.style.transform = "translateX(-50%)";
          break;
      }

      handle.addEventListener("mousedown", (e) => onMouseDown(pos, e));
      dom.appendChild(handle);
      handlesRef.current.push(handle);
    });

    return () => {
      handlesRef.current.forEach((h) => h.remove());
      handlesRef.current = [];
    };
  }, [dom, isActive, onMouseDown]);

  return <>{render}</>;
}
