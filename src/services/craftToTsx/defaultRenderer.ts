/**
 * Default rendering path for components that only need mapping + defaultProps.
 * Handles container/non-container, text content, self-closing, etc.
 */

import type { CraftNodeData, ComponentMapping, RenderContext } from "./types.js";

export function defaultRender(
  nodeId: string,
  node: CraftNodeData,
  indent: number,
  ctx: RenderContext,
  mapping: ComponentMapping,
  resolvedName: string,
): string {
  const pad = "  ".repeat(indent);
  const mocComments = ctx.buildMocComments(nodeId, pad, node.props);

  // Determine the actual tag (CraftText can be h1-h6, span, p)
  let tag = mapping.tag;
  if (resolvedName === "CraftText") {
    const tagProp = node.props?.tag as string | undefined;
    if (tagProp && tagProp !== "p") {
      tag = tagProp;
    }
  }

  // Build props string
  const propsStr = ctx.buildPropsString(resolvedName, node.props, mapping);

  // Build container classes
  let containerClass = "";
  if (resolvedName === "CraftContainer") {
    containerClass = ctx.buildContainerClasses(node.props);
  }
  if (resolvedName === "CraftFreeCanvas" || resolvedName === "CraftGroup") {
    containerClass = "relative";
  }

  // Merge className
  const userClassName = (node.props?.className as string) || "";
  const combinedClassName = ctx.mergeContainerClasses(containerClass, userClassName);
  const classNameAttr = combinedClassName ? ` className="${ctx.escapeAttr(combinedClassName)}"` : "";

  // Build dimension styles
  const styleAttr = ctx.buildStyleAttr(
    node.props,
    resolvedName === "CraftText" ? { whiteSpace: "pre-line" } : undefined,
  );

  const children = node.nodes || [];
  const textContent = mapping.textProp ? (node.props?.[mapping.textProp] as string) : undefined;

  // Toast onClick for CraftButton
  const toastText = resolvedName === "CraftButton" ? (node.props?.toastText as string | undefined) : undefined;
  let toastOnClick = "";
  if (toastText) {
    const toastPosition = (node.props?.toastPosition as string | undefined) || "bottom-right";
    if (toastPosition !== "bottom-right") {
      toastOnClick = ` onClick={() => toast("${ctx.escapeJsString(toastText)}", { position: "${toastPosition}" })}`;
    } else {
      toastOnClick = ` onClick={() => toast("${ctx.escapeJsString(toastText)}")}`;
    }
  }

  let rendered = "";

  // Self-closing for img
  if (resolvedName === "CraftImage" || resolvedName === "CraftPlaceholderImage") {
    let imgStyleAttr = styleAttr;
    if (resolvedName === "CraftImage") {
      const clickThrough = node.props?.clickThrough;
      if (clickThrough === true || clickThrough === "true") {
        imgStyleAttr = ctx.buildStyleAttr(node.props, { pointerEvents: "none" });
      }
    }
    return `${mocComments}\n${pad}<${tag}${propsStr}${classNameAttr}${imgStyleAttr} />`;
  }

  // Self-closing for Separator
  if (resolvedName === "CraftSeparator") {
    return `${mocComments}\n${pad}<${tag}${propsStr}${classNameAttr}${styleAttr} />`;
  }

  // Self-closing for Input
  if (resolvedName === "CraftInput") {
    return `${mocComments}\n${pad}<${tag}${propsStr}${classNameAttr}${styleAttr} />`;
  }

  // Self-closing for Textarea
  if (resolvedName === "CraftTextarea") {
    return `${mocComments}\n${pad}<${tag}${propsStr}${classNameAttr}${styleAttr} />`;
  }

  // Self-closing for Progress, Slider
  if (resolvedName === "CraftProgress" || resolvedName === "CraftSlider") {
    return `${mocComments}\n${pad}<${tag}${propsStr}${classNameAttr}${styleAttr} />`;
  }

  // Container with children
  if (mapping.isContainer && children.length > 0) {
    const renderedChildren = children
      .map((id) => ctx.renderNode(id, indent + 1))
      .filter(Boolean);
    rendered = `${mocComments}\n${pad}<${tag}${propsStr}${classNameAttr}${styleAttr}>\n${renderedChildren.join("\n")}\n${pad}</${tag}>`;
    return rendered;
  }

  // CraftToggle: icon を子要素として描画
  if (resolvedName === "CraftToggle") {
    const icon = node.props?.icon as string | undefined;
    const escapedText = textContent
      ? (textContent.includes("\n") ? `{"${ctx.escapeJsString(textContent)}"}` : ctx.escapeJsx(textContent))
      : "";
    const inner = icon
      ? `\n${pad}  <${icon} className="h-4 w-4" />${escapedText ? `\n${pad}  ${escapedText}` : ""}\n${pad}`
      : escapedText;
    rendered = `${mocComments}\n${pad}<${tag}${propsStr}${classNameAttr}${styleAttr}>${inner}</${tag}>`;
    return rendered;
  }

  // CraftIcon: Lucide アイコン単体描画
  if (resolvedName === "CraftIcon") {
    const icon = (node.props?.icon as string) || "Heart";
    const iconSize = (node.props?.iconSize as string) || "6";
    const clickThrough = node.props?.clickThrough;
    let iconStyleAttr = styleAttr;
    if (clickThrough === true || clickThrough === "true") {
      iconStyleAttr = ctx.buildStyleAttr(node.props, { pointerEvents: "none" });
    }
    rendered = `${mocComments}\n${pad}<span${classNameAttr}${iconStyleAttr}>\n${pad}  <${icon} className="h-${iconSize} w-${iconSize}" />\n${pad}</span>`;
    return rendered;
  }

  // CraftButton: icon モード時はアイコンを子要素として描画
  if (resolvedName === "CraftButton") {
    const buttonType = node.props?.buttonType as string | undefined;
    const icon = node.props?.icon as string | undefined;
    const iconSize = (node.props?.iconSize as string | undefined) || "4";
    if (buttonType === "icon" && icon) {
      rendered = `${mocComments}\n${pad}<${tag}${propsStr}${classNameAttr}${toastOnClick}${styleAttr}>\n${pad}  <${icon} className="h-${iconSize} w-${iconSize}" />\n${pad}</${tag}>`;
      rendered = ctx.wrapWithOverlay(rendered, node.props, pad);
      return rendered;
    }
  }

  // Text content
  if (textContent) {
    const escapedTextContent = textContent.includes("<kbd>")
      ? ctx.kbdTextToJsx(textContent)
      : textContent.includes("\n")
        ? `{"${ctx.escapeJsString(textContent)}"}`
        : ctx.escapeJsx(textContent);
    rendered = `${mocComments}\n${pad}<${tag}${propsStr}${classNameAttr}${toastOnClick}${styleAttr}>${escapedTextContent}</${tag}>`;
    if (resolvedName === "CraftButton") {
      rendered = ctx.wrapWithOverlay(rendered, node.props, pad);
    }
    return rendered;
  }

  // Empty container
  if (mapping.isContainer) {
    rendered = `${mocComments}\n${pad}<${tag}${propsStr}${classNameAttr}${styleAttr} />`;
    return rendered;
  }

  // Fallback self-closing
  rendered = `${mocComments}\n${pad}<${tag}${propsStr}${classNameAttr}${toastOnClick}${styleAttr} />`;
  if (resolvedName === "CraftButton") {
    rendered = ctx.wrapWithOverlay(rendered, node.props, pad);
  }
  return rendered;
}
