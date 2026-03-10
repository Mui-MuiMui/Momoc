/**
 * Shared utility functions for craftToTsx code generation.
 * Extracted from the original monolithic craftToTsx.ts.
 */

import type { MocEditorMemo } from "../../shared/types.js";
import type { ComponentMapping } from "./types.js";

// ---------------------------------------------------------------------------
// Escape utilities
// ---------------------------------------------------------------------------

export function escapeJsx(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/{/g, "&#123;").replace(/}/g, "&#125;");
}

export function escapeAttr(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function escapeJsString(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r");
}

// ---------------------------------------------------------------------------
// kbd text handling
// ---------------------------------------------------------------------------

const KBD_CLASS = "pointer-events-none inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground select-none";

/**
 * <kbd>...</kbd> を含む文字列を JSX フラグメント文字列に変換する。
 * 例: "Save <kbd>Ctrl</kbd>" → '<>Save <kbd className="...">Ctrl</kbd></>'
 */
export function kbdTextToJsx(text: string): string {
  const parts = text.split(/(<kbd>.*?<\/kbd>)/g);
  const jsxParts = parts.map((part) => {
    const match = part.match(/^<kbd>(.*?)<\/kbd>$/);
    if (match) {
      return `<kbd className="${KBD_CLASS}">${escapeJsx(match[1])}</kbd>`;
    }
    return escapeJsx(part);
  });
  return `<>${jsxParts.join("")}</>`;
}

// ---------------------------------------------------------------------------
// CSS size normalization
// ---------------------------------------------------------------------------

/** 単位なし数値文字列に "px" を付ける。"100" → "100px"、"50%" → "50%"（そのまま） */
export function normalizeCssSize(v: string | undefined): string | undefined {
  if (!v || v === "auto") return v;
  return /^\d+(\.\d+)?$/.test(v) ? v + "px" : v;
}

// ---------------------------------------------------------------------------
// Style attribute builder
// ---------------------------------------------------------------------------

export function buildStyleAttr(props: Record<string, unknown>, extraStyles?: Record<string, string>): string {
  const w = normalizeCssSize(props?.width as string | undefined);
  const h = normalizeCssSize(props?.height as string | undefined);
  const objectFit = props?.objectFit as string | undefined;
  const top = props?.top as string | undefined;
  const left = props?.left as string | undefined;
  const zIndex = props?.zIndex as number | undefined;
  const parts: string[] = [];
  if (extraStyles) {
    for (const [k, v] of Object.entries(extraStyles)) parts.push(`${k}: "${v}"`);
  }
  if (w && w !== "auto") parts.push(`width: "${w}"`);
  if (h && h !== "auto") parts.push(`height: "${h}"`);
  if (objectFit && objectFit !== "cover") parts.push(`objectFit: "${objectFit}"`);
  if (top || left) parts.push(`position: "absolute"`);
  if (top) parts.push(`top: "${top}"`);
  if (left) parts.push(`left: "${left}"`);
  if (zIndex) parts.push(`zIndex: ${zIndex}`);
  if (parts.length === 0) return "";
  return ` style={{ ${parts.join(", ")} }}`;
}

// ---------------------------------------------------------------------------
// Props string builder
// ---------------------------------------------------------------------------

export function buildPropsString(
  resolvedName: string,
  props: Record<string, unknown>,
  mapping: ComponentMapping,
  defaultProps: Record<string, Record<string, unknown>>,
): string {
  const defaults = defaultProps[resolvedName] || {};
  const parts: string[] = [];

  for (const key of mapping.propsMap) {
    if (key === "className") continue; // handled separately
    const val = props?.[key];
    if (val === undefined || val === null || val === "") continue;
    if (defaults[key] !== undefined && val === defaults[key]) continue;

    if (typeof val === "boolean") {
      if (val) parts.push(key);
    } else if (typeof val === "number") {
      parts.push(`${key}={${val}}`);
    } else {
      const strVal = String(val);
      if (strVal.includes("<kbd>")) {
        parts.push(`${key}={"${escapeJsString(strVal)}"}`);
      } else {
        parts.push(`${key}="${escapeAttr(strVal)}"`);
      }
    }
  }

  return parts.length > 0 ? " " + parts.join(" ") : "";
}

// ---------------------------------------------------------------------------
// Container class utilities
// ---------------------------------------------------------------------------

export function buildContainerClasses(props: Record<string, unknown>): string {
  const classes: string[] = [];
  const display = (props?.display as string) || "flex";
  classes.push(display === "grid" ? "grid" : "flex");

  if (display === "flex") {
    const dir = (props?.flexDirection as string) || "column";
    if (dir === "row") classes.push("flex-row");
    else classes.push("flex-col");
  } else {
    const cols = (props?.gridCols as number) || 3;
    classes.push(`grid-cols-${cols}`);
  }

  const gap = (props?.gap as string) || "4";
  if (gap !== "0") classes.push(`gap-${gap}`);

  return classes.join(" ");
}

/**
 * containerClass と userClassName を結合し、競合するTailwindグループは
 * userClassName 側を優先する（TailwindEditorの設定がコンポーネントpropより優先）。
 */
export function mergeContainerClasses(containerClass: string, userClassName: string): string {
  if (!containerClass || !userClassName) {
    return [containerClass, userClassName].filter(Boolean).join(" ");
  }
  const userClasses = userClassName.split(/\s+/).filter(Boolean);
  const hasUserItems   = userClasses.some(c => /^items-/.test(c));
  const hasUserJustify = userClasses.some(c => /^justify-/.test(c));
  const hasUserFlexDir = userClasses.some(c => c === "flex-row" || c === "flex-col");
  const baseFiltered = containerClass.split(/\s+/).filter(Boolean).filter(c => {
    if (hasUserItems   && /^items-/.test(c))                      return false;
    if (hasUserJustify && /^justify-/.test(c))                    return false;
    if (hasUserFlexDir && (c === "flex-row" || c === "flex-col")) return false;
    return true;
  });
  return [...baseFiltered, ...userClasses].join(" ");
}

// ---------------------------------------------------------------------------
// MOC comment builder
// ---------------------------------------------------------------------------

export function buildMocComments(
  nodeId: string,
  pad: string,
  props: Record<string, unknown>,
  memos?: MocEditorMemo[],
): string {
  const comments: string[] = [];
  comments.push(`${pad}{/* @moc-node ${nodeId} */}`);
  const role = props?.role as string | undefined;
  if (role) {
    comments.push(`${pad}{/* @moc-role "${role}" */}`);
  }
  if (memos) {
    const memo = memos.find((m) => m.targetNodeId === nodeId);
    if (memo) {
      const summary = memo.title ? (memo.body ? `${memo.title}: ${memo.body}` : memo.title) : memo.body;
      if (summary) {
        comments.push(`${pad}{/* @moc-memo "${summary}" */}`);
      }
    }
  }
  return comments.join("\n");
}

// ---------------------------------------------------------------------------
// Wrapper utilities (tooltip, contextMenu, hoverCard, overlay)
// ---------------------------------------------------------------------------

/** Wrap rendered element with tooltip if tooltipText is set */
export function wrapWithTooltip(rendered: string, props: Record<string, unknown>, pad: string, tooltipTrigger?: string): string {
  const tooltipText = props?.tooltipText as string | undefined;
  if (!tooltipText) return rendered;

  const tooltipSide = props?.tooltipSide as string | undefined;
  const sideAttr = tooltipSide ? ` side="${tooltipSide}"` : "";
  const triggerTag = tooltipTrigger === "focus"
    ? `<TooltipTrigger asChild trigger="focus">`
    : `<TooltipTrigger asChild>`;

  return [
    `${pad}<TooltipProvider>`,
    `${pad}  <Tooltip>`,
    `${pad}    ${triggerTag}`,
    rendered,
    `${pad}    </TooltipTrigger>`,
    `${pad}    <TooltipContent${sideAttr}>`,
    `${pad}      <p className="whitespace-pre-wrap">${tooltipText.includes("<kbd>") ? kbdTextToJsx(tooltipText) : tooltipText.includes("\n") ? `{"${escapeJsString(tooltipText)}"}` : escapeJsx(tooltipText)}</p>`,
    `${pad}    </TooltipContent>`,
    `${pad}  </Tooltip>`,
    `${pad}</TooltipProvider>`,
  ].join("\n");
}

/** Wrap rendered container with context menu if contextMenuMocPath is set */
export function wrapWithContextMenu(rendered: string, props: Record<string, unknown>, pad: string): string {
  const contextMenuMocPath = props?.contextMenuMocPath as string | undefined;
  if (!contextMenuMocPath) return rendered;

  const contentComment = `{/* linked: ${escapeJsx(contextMenuMocPath)} */}`;
  return [
    `${pad}<ContextMenu>`,
    `${pad}  <ContextMenuTrigger asChild>`,
    rendered,
    `${pad}  </ContextMenuTrigger>`,
    `${pad}  ${contentComment}`,
    `${pad}</ContextMenu>`,
  ].join("\n");
}

/** Wrap rendered element with HoverCard if hoverCardMocPath is set */
export function wrapWithHoverCard(rendered: string, props: Record<string, unknown>, pad: string): string {
  const hoverCardMocPath = props?.hoverCardMocPath as string | undefined;
  if (!hoverCardMocPath) return rendered;

  const side = (props?.hoverCardSide as string) || "bottom";
  const contentComment = `{/* linked: ${escapeJsx(hoverCardMocPath)} */}`;
  return [
    `${pad}<HoverCard>`,
    `${pad}  <HoverCardTrigger asChild>`,
    rendered,
    `${pad}  </HoverCardTrigger>`,
    `${pad}  <HoverCardContent side="${side}">`,
    `${pad}    ${contentComment}`,
    `${pad}  </HoverCardContent>`,
    `${pad}</HoverCard>`,
  ].join("\n");
}

/** Apply common wrappers: contextMenu → hoverCard → tooltip (if no hoverCard) */
export function applyCommonWrappers(rendered: string, props: Record<string, unknown>, pad: string, tooltipTrigger?: string): string {
  let r = wrapWithContextMenu(rendered, props, pad);
  r = wrapWithHoverCard(r, props, pad);
  const hoverCardMocPath = props?.hoverCardMocPath as string | undefined;
  if (!hoverCardMocPath) {
    r = wrapWithTooltip(r, props, pad, tooltipTrigger);
  }
  return r;
}

/** Wrap rendered element with overlay (dialog, sheet, drawer, popover, etc.) */
export function wrapWithOverlay(rendered: string, props: Record<string, unknown>, pad: string): string {
  const overlayType = props?.overlayType as string | undefined;
  if (!overlayType || overlayType === "none") return rendered;

  const linkedMocPath = props?.linkedMocPath as string | undefined;
  const contentComment = linkedMocPath
    ? `{/* linked: ${escapeJsx(linkedMocPath)} */}`
    : "{/* overlay content */}";

  const overlayWidth = props?.overlayWidth as string | undefined;
  const overlayHeight = props?.overlayHeight as string | undefined;
  const styleParts: string[] = [];
  if (overlayWidth) styleParts.push(`maxWidth: "${overlayWidth}"`);
  if (overlayHeight) styleParts.push(`maxHeight: "${overlayHeight}", overflow: "auto"`);
  const styleAttr = styleParts.length > 0 ? ` style={{ ${styleParts.join(", ")} }}` : "";

  const overlayClassName = props?.overlayClassName as string | undefined;
  const classAttr = overlayClassName ? ` className="${escapeAttr(overlayClassName)}"` : "";

  switch (overlayType) {
    case "dialog":
      return [
        `${pad}<Dialog>`,
        `${pad}  <DialogTrigger asChild>`,
        rendered,
        `${pad}  </DialogTrigger>`,
        `${pad}  <DialogContent${classAttr}${styleAttr}>`,
        `${pad}    ${contentComment}`,
        `${pad}  </DialogContent>`,
        `${pad}</Dialog>`,
      ].join("\n");
    case "alert-dialog": {
      const pattern = (props?.alertDialogPattern as string) || "cancel-continue";
      const ALERT_DIALOG_PATTERNS: Record<string, [string, string, boolean]> = {
        "cancel-continue": ["Cancel", "Continue", false],
        "continue-cancel": ["Continue", "Cancel", true],
        "yes-no":          ["Yes",    "No",      true],
        "no-yes":          ["No",     "Yes",     false],
        "ok-cancel":       ["OK",     "Cancel",  true],
        "cancel-ok":       ["Cancel", "OK",      false],
      };
      const [leftBtn, rightBtn, leftIsAction] = ALERT_DIALOG_PATTERNS[pattern] ?? ["Cancel", "Continue", false];
      const leftTag  = leftIsAction  ? "AlertDialogAction" : "AlertDialogCancel";
      const rightTag = leftIsAction  ? "AlertDialogCancel" : "AlertDialogAction";
      return [
        `${pad}<AlertDialog>`,
        `${pad}  <AlertDialogTrigger asChild>`,
        rendered,
        `${pad}  </AlertDialogTrigger>`,
        `${pad}  <AlertDialogContent${classAttr}${styleAttr}>`,
        `${pad}    ${contentComment}`,
        `${pad}    <div className="flex justify-end gap-8">`,
        `${pad}      <${leftTag}>${leftBtn}</${leftTag}>`,
        `${pad}      <${rightTag}>${rightBtn}</${rightTag}>`,
        `${pad}    </div>`,
        `${pad}  </AlertDialogContent>`,
        `${pad}</AlertDialog>`,
      ].join("\n");
    }
    case "sheet": {
      const side = (props?.sheetSide as string) || "right";
      const sideAttr = side !== "right" ? ` side="${side}"` : "";
      return [
        `${pad}<Sheet>`,
        `${pad}  <SheetTrigger asChild>`,
        rendered,
        `${pad}  </SheetTrigger>`,
        `${pad}  <SheetContent${sideAttr}${classAttr}${styleAttr}>`,
        `${pad}    ${contentComment}`,
        `${pad}  </SheetContent>`,
        `${pad}</Sheet>`,
      ].join("\n");
    }
    case "drawer":
      return [
        `${pad}<Drawer>`,
        `${pad}  <DrawerTrigger asChild>`,
        rendered,
        `${pad}  </DrawerTrigger>`,
        `${pad}  <DrawerContent${classAttr}${styleAttr}>`,
        `${pad}    ${contentComment}`,
        `${pad}  </DrawerContent>`,
        `${pad}</Drawer>`,
      ].join("\n");
    case "popover":
      return [
        `${pad}<Popover>`,
        `${pad}  <PopoverTrigger asChild>`,
        rendered,
        `${pad}  </PopoverTrigger>`,
        `${pad}  <PopoverContent${classAttr}${styleAttr}>`,
        `${pad}    ${contentComment}`,
        `${pad}  </PopoverContent>`,
        `${pad}</Popover>`,
      ].join("\n");
    case "dropdown-menu":
      return [
        `${pad}<DropdownMenu>`,
        `${pad}  <DropdownMenuTrigger asChild>`,
        rendered,
        `${pad}  </DropdownMenuTrigger>`,
        `${pad}  <DropdownMenuContent${classAttr}${styleAttr}>`,
        `${pad}    ${contentComment}`,
        `${pad}  </DropdownMenuContent>`,
        `${pad}</DropdownMenu>`,
      ].join("\n");
    default:
      return rendered;
  }
}

// ---------------------------------------------------------------------------
// Import constants (shared across generators)
// ---------------------------------------------------------------------------

/** Overlay type to import configuration */
export const OVERLAY_IMPORTS: Record<string, { from: string; names: string[] }> = {
  dialog: { from: "@/components/ui/dialog", names: ["Dialog", "DialogTrigger", "DialogContent"] },
  "alert-dialog": { from: "@/components/ui/alert-dialog", names: ["AlertDialog", "AlertDialogTrigger", "AlertDialogContent", "AlertDialogAction", "AlertDialogCancel"] },
  sheet: { from: "@/components/ui/sheet", names: ["Sheet", "SheetTrigger", "SheetContent"] },
  drawer: { from: "@/components/ui/drawer", names: ["Drawer", "DrawerTrigger", "DrawerContent"] },
  popover: { from: "@/components/ui/popover", names: ["Popover", "PopoverTrigger", "PopoverContent"] },
  "dropdown-menu": { from: "@/components/ui/dropdown-menu", names: ["DropdownMenu", "DropdownMenuTrigger", "DropdownMenuContent", "DropdownMenuItem", "DropdownMenuCheckboxItem", "DropdownMenuSeparator", "DropdownMenuLabel", "DropdownMenuShortcut"] },
  "hover-card": { from: "@/components/ui/hover-card", names: ["HoverCard", "HoverCardTrigger", "HoverCardContent"] },
};

export const TOOLTIP_IMPORT = { from: "@/components/ui/tooltip", names: ["TooltipProvider", "Tooltip", "TooltipTrigger", "TooltipContent"] };

export const CONTEXT_MENU_IMPORT = { from: "@/components/ui/context-menu", names: ["ContextMenu", "ContextMenuTrigger", "ContextMenuContent", "ContextMenuItem", "ContextMenuCheckboxItem", "ContextMenuSeparator", "ContextMenuLabel"] };

export const PAGINATION_IMPORT = {
  from: "@/components/ui/pagination",
  names: ["Pagination", "PaginationContent", "PaginationItem", "PaginationLink", "PaginationPrevious", "PaginationNext"],
};

export const DATE_PICKER_IMPORT = {
  from: "@/components/ui/date-picker",
  names: ["DatePicker"],
};

export const DATA_TABLE_IMPORT = {
  from: "@/components/ui/data-table",
  names: ["DataTable"],
};

// ---------------------------------------------------------------------------
// Resolved name helper
// ---------------------------------------------------------------------------

export function getResolvedName(node: { type: { resolvedName: string } | string }): string {
  if (typeof node.type === "string") return node.type;
  return node.type?.resolvedName || "Unknown";
}
