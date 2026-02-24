import { toPng } from "html-to-image";

/** 1x1 transparent PNG as fallback for images that fail to load */
const TRANSPARENT_PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAAlwSFlzAAAWJQAAFiUBSVIk8AAAAA0lEQVQI12P4z8BQDwAEgAF/QualzQAAAABJRU5ErkJggg==";

export async function captureViewport(
  width: number,
  height: number,
): Promise<string> {
  const el = document.querySelector("[data-momoc-viewport]");
  if (!el) throw new Error("Viewport element not found");

  // エディタUI非表示用CSSを一時注入
  const style = document.createElement("style");
  style.textContent = `
    [data-momoc-viewport] * {
      outline: none !important;
      cursor: default !important;
    }
  `;
  document.head.appendChild(style);

  try {
    const dataUrl = await toPng(el as HTMLElement, {
      width,
      height,
      pixelRatio: 1,
      imagePlaceholder: TRANSPARENT_PIXEL,
      cacheBust: true,
      filter: (node: Node) => {
        if (node instanceof HTMLElement) {
          if (node.hasAttribute("data-momoc-label")) return false;
          if (node.hasAttribute("data-momoc-handle")) return false;
        }
        return true;
      },
    });
    return dataUrl;
  } finally {
    style.remove();
  }
}
