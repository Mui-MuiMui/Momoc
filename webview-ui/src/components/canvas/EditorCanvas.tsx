import { useCallback, useEffect, useRef } from "react";
import { Frame, Element } from "@craftjs/core";
import { useTranslation } from "react-i18next";
import { useEditorStore } from "../../stores/editorStore";
import { CraftContainer } from "../../crafts/layout/CraftContainer";
import { MemoAddButton, MemoStickers } from "../memo/MemoOverlay";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { useVscodeMessage } from "../../hooks/useVscodeMessage";
import { captureViewport } from "../../utils/captureImage";
import { getVsCodeApi } from "../../utils/vscodeApi";

const VIEWPORT_WIDTHS: Record<string, number> = {
  desktop: 1280,
  tablet: 768,
  mobile: 375,
};

const VIEWPORT_HEIGHTS: Record<string, number> = {
  desktop: 800,
  tablet: 1024,
  mobile: 812,
};

const ZOOM_STEP = 0.1;
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 2;

export function EditorCanvas() {
  const { t } = useTranslation();
  const {
    themeMode,
    viewportMode,
    customViewportWidth,
    customViewportHeight,
    zoom,
    setZoom,
  } = useEditorStore();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollContentRef = useRef<HTMLDivElement>(null);
  const isSpaceHeld = useRef(false);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  const viewportWidth =
    viewportMode === "custom"
      ? customViewportWidth
      : VIEWPORT_WIDTHS[viewportMode] || 1280;

  const viewportHeight =
    viewportMode === "custom"
      ? customViewportHeight
      : VIEWPORT_HEIGHTS[viewportMode] || 800;

  const handleZoomIn = useCallback(() => {
    setZoom(Math.min(ZOOM_MAX, Math.round((zoom + ZOOM_STEP) * 100) / 100));
  }, [zoom, setZoom]);

  const handleZoomOut = useCallback(() => {
    setZoom(Math.max(ZOOM_MIN, Math.round((zoom - ZOOM_STEP) * 100) / 100));
  }, [zoom, setZoom]);

  const handleZoomReset = useCallback(() => {
    setZoom(1);
  }, [setZoom]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
        const newZoom = Math.round((zoom + delta) * 100) / 100;
        setZoom(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, newZoom)));
      }
    },
    [zoom, setZoom],
  );

  // Space+Drag panning — all cursor changes via DOM to avoid re-renders
  const setCursor = useCallback((cursor: string) => {
    const el = scrollContainerRef.current;
    if (el) el.style.cursor = cursor;
  }, []);

  // Capture-phase document listeners to block Craft.js during pan
  const panHandlers = useRef<{
    move: ((e: MouseEvent) => void) | null;
    up: ((e: MouseEvent) => void) | null;
  }>({ move: null, up: null });

  const stopPan = useCallback(() => {
    isPanning.current = false;
    setCursor(isSpaceHeld.current ? "grab" : "");
    if (panHandlers.current.move) {
      document.removeEventListener("mousemove", panHandlers.current.move, true);
      panHandlers.current.move = null;
    }
    if (panHandlers.current.up) {
      document.removeEventListener("mouseup", panHandlers.current.up, true);
      panHandlers.current.up = null;
    }
  }, [setCursor]);

  // Temporarily expand scrollable area so scrollTop/scrollLeft have room
  const expandContent = useCallback(() => {
    const content = scrollContentRef.current;
    const container = scrollContainerRef.current;
    if (!content || !container) return;
    const h = container.clientHeight;
    // Add large top padding & matching minHeight so we can scroll in both directions
    content.style.paddingTop = `${h}px`;
    content.style.minHeight = `${h * 3}px`;
    // Shift scroll to keep viewport visually in place
    container.scrollTop += h - 80; // compensate for old 80px → new h padding
  }, []);

  const shrinkContent = useCallback(() => {
    const content = scrollContentRef.current;
    const container = scrollContainerRef.current;
    if (!content || !container) return;
    const h = container.clientHeight;
    const prevScrollTop = container.scrollTop;
    // ショートハンド padding:80px は paddingTop 上書き時に分解されるため
    // "" ではなく明示的に元の値を復元する
    content.style.paddingTop = "80px";
    const newScrollTop = Math.max(0, prevScrollTop - (h - 80));
    // パン後の位置で余白が維持される高さを確保
    const requiredMinHeight = newScrollTop + h;
    content.style.minHeight = requiredMinHeight > h ? `${requiredMinHeight}px` : "100%";
    container.scrollTop = newScrollTop;
  }, []);

  // All pan events use native capture-phase listeners to intercept
  // BEFORE Craft.js (which uses React delegation / document listeners)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (!isSpaceHeld.current) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      isPanning.current = true;
      panStart.current = {
        x: e.clientX,
        y: e.clientY,
        scrollLeft: container.scrollLeft,
        scrollTop: container.scrollTop,
      };
      setCursor("grabbing");

      const onMove = (ev: MouseEvent) => {
        ev.preventDefault();
        ev.stopImmediatePropagation();
        const dx = ev.clientX - panStart.current.x;
        const dy = ev.clientY - panStart.current.y;
        container.scrollLeft = panStart.current.scrollLeft - dx;
        container.scrollTop = panStart.current.scrollTop - dy;
      };
      const onUp = (ev: MouseEvent) => {
        ev.stopImmediatePropagation();
        stopPan();
      };
      panHandlers.current = { move: onMove, up: onUp };
      document.addEventListener("mousemove", onMove, true);
      document.addEventListener("mouseup", onUp, true);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat && !isSpaceHeld.current) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        e.preventDefault();
        e.stopImmediatePropagation();
        isSpaceHeld.current = true;
        // Block browser page-down & expand scrollable area
        container.style.overflow = "hidden";
        expandContent();
        if (!isPanning.current) setCursor("grab");
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        isSpaceHeld.current = false;
        if (isPanning.current) stopPan();
        shrinkContent();
        container.style.overflow = "";
        setCursor("");
      }
    };

    container.addEventListener("mousedown", handleMouseDown, true);
    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyUp, true);
    return () => {
      container.removeEventListener("mousedown", handleMouseDown, true);
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyUp, true);
      stopPan();
    };
  }, [setCursor, stopPan, expandContent, shrinkContent]);

  useVscodeMessage(
    useCallback(
      (msg) => {
        if (msg.type === "capture:start") {
          captureViewport(viewportWidth, viewportHeight)
            .then((dataUrl) => {
              getVsCodeApi().postMessage({
                type: "capture:complete",
                payload: { dataUrl },
              });
            })
            .catch((err) => {
              getVsCodeApi().postMessage({
                type: "capture:error",
                payload: { error: String(err) },
              });
            });
        }
      },
      [viewportWidth, viewportHeight],
    ),
  );

  return (
    <div data-mocker-canvas className="relative flex-1">
      {/* Scrollable canvas area */}
      <div
        ref={scrollContainerRef}
        className="absolute inset-0 overflow-auto bg-[var(--vscode-editor-background,#1e1e1e)]"
        onWheel={handleWheel}
      >
        <div
          ref={scrollContentRef}
          className="relative"
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "80px",
            minHeight: "100%",
            width: "max-content",
            minWidth: "100%",
          }}
        >
          {/* Memo stickers - scroll with canvas */}
          <MemoStickers scrollContentRef={scrollContentRef} />

          {/* Zoom wrapper */}
          <div
            style={{
              width: viewportWidth * zoom,
              minHeight: viewportHeight * zoom,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: viewportWidth,
                minHeight: viewportHeight,
                transform: `scale(${zoom})`,
                transformOrigin: "top left",
              }}
              className="relative bg-white shadow-lg transition-shadow"
            >
              {/* Size label */}
              <div className="absolute -top-5 left-0 text-[10px] text-[var(--vscode-descriptionForeground,#888)] font-mono">
                {viewportWidth} x {viewportHeight}
                {zoom !== 1 && ` (${Math.round(zoom * 100)}%)`}
              </div>
              <div data-mocker-viewport className={themeMode === "dark" ? "dark" : ""}>
                <div className="min-h-full bg-background text-foreground">
                  <Frame>
                    <Element
                      is={CraftContainer}
                      canvas
                      display="flex"
                      flexDirection="column"
                      className="min-h-screen"
                    >
                    </Element>
                  </Frame>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed overlays (outside scroll container) */}
      <MemoAddButton />

      {/* Zoom controls - fixed bottom-right, inset to avoid scrollbar overlap */}
      <div className="pointer-events-none absolute bottom-4 right-5 z-50">
        <div className="pointer-events-auto flex items-center gap-1 rounded-md border border-[var(--vscode-panel-border,#454545)] bg-[var(--vscode-editor-background,#1e1e1e)] p-1 shadow-lg">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoom <= ZOOM_MIN}
            title={t("canvas.zoomOut")}
            className="flex h-6 w-6 items-center justify-center rounded text-[var(--vscode-foreground,#ccc)] hover:bg-[var(--vscode-toolbar-hoverBackground,#383838)] disabled:opacity-30"
          >
            <ZoomOut size={14} />
          </button>
          <button
            type="button"
            onClick={handleZoomReset}
            title={t("canvas.zoomReset")}
            className="min-w-[40px] px-1 text-center text-[10px] font-mono text-[var(--vscode-foreground,#ccc)] hover:bg-[var(--vscode-toolbar-hoverBackground,#383838)] rounded"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoom >= ZOOM_MAX}
            title={t("canvas.zoomIn")}
            className="flex h-6 w-6 items-center justify-center rounded text-[var(--vscode-foreground,#ccc)] hover:bg-[var(--vscode-toolbar-hoverBackground,#383838)] disabled:opacity-30"
          >
            <ZoomIn size={14} />
          </button>
          <button
            type="button"
            onClick={handleZoomReset}
            title={t("canvas.zoomFit")}
            className="flex h-6 w-6 items-center justify-center rounded text-[var(--vscode-foreground,#ccc)] hover:bg-[var(--vscode-toolbar-hoverBackground,#383838)]"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
