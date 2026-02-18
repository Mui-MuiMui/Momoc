import { useNode, useEditor } from "@craftjs/core";
import { useCallback, useEffect, useRef } from "react";

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
    connectors: { connect, drag },
    isCanvas,
    parent,
  } = useNode((node) => ({
    isActive: node.events.selected,
    isHover: node.events.hovered,
    dom: node.dom,
    name: node.data.displayName || node.data.name || "Element",
    isCanvas: node.data.isCanvas,
    parent: node.data.parent,
  }));

  const { actions } = useEditor();
  const labelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dom) return;

    // Base styles for all nodes - subtle dashed border for containers
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

    // Minimum dimensions so empty containers are visible
    if (isCanvas) {
      if (!dom.style.minHeight || dom.style.minHeight === "0px") {
        dom.style.minHeight = "40px";
      }
      if (!dom.style.minWidth || dom.style.minWidth === "0px") {
        dom.style.minWidth = "40px";
      }
    }
  }, [dom, isActive, isHover, isCanvas]);

  // Show a label badge on active/hover
  useEffect(() => {
    if (!dom) return;

    // Remove previous label if any
    const existingLabel = dom.querySelector("[data-mocker-label]");
    if (existingLabel) {
      existingLabel.remove();
    }

    if (isActive || isHover) {
      const label = document.createElement("div");
      label.setAttribute("data-mocker-label", "true");
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
      dom.style.position = dom.style.position === "static" ? "relative" : dom.style.position || "relative";
      dom.appendChild(label);
    }

    return () => {
      if (dom) {
        const label = dom.querySelector("[data-mocker-label]");
        if (label) label.remove();
      }
    };
  }, [dom, isActive, isHover, name]);

  return <>{render}</>;
}
