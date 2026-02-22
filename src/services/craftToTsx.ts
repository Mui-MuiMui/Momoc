/**
 * Converts Craft.js serialized state JSON into TSX source code and import statements.
 */

import type { MocEditorMemo } from "../shared/types.js";

interface CraftNodeData {
  type: { resolvedName: string } | string;
  props: Record<string, unknown>;
  nodes: string[];
  linkedNodes: Record<string, string>;
  parent: string | null;
  isCanvas?: boolean;
  displayName?: string;
  custom?: Record<string, unknown>;
}

interface CraftSerializedState {
  [nodeId: string]: CraftNodeData;
}

interface ComponentMapping {
  tag: string;
  importFrom?: string;
  importName?: string;
  /** Props that should be rendered as JSX attributes */
  propsMap: string[];
  /** Prop used as text children instead of `children` */
  textProp?: string;
  /** Whether this component is a container (can have JSX children) */
  isContainer: boolean;
}

const COMPONENT_MAP: Record<string, ComponentMapping> = {
  CraftContainer: {
    tag: "div",
    propsMap: ["className"],
    isContainer: true,
  },
  CraftFreeCanvas: {
    tag: "div",
    propsMap: ["className"],
    isContainer: true,
  },
  CraftDiv: {
    tag: "div",
    propsMap: ["className"],
    isContainer: true,
  },
  CraftText: {
    tag: "p",
    propsMap: ["className"],
    textProp: "text",
    isContainer: false,
  },
  CraftPlaceholderImage: {
    tag: "img",
    propsMap: ["src", "alt", "className"],
    isContainer: false,
  },
  CraftImage: {
    tag: "img",
    propsMap: ["src", "alt", "className"],
    isContainer: false,
  },
  CraftButton: {
    tag: "Button",
    importFrom: "@/components/ui/button",
    importName: "Button",
    propsMap: ["variant", "size", "disabled", "className"],
    textProp: "text",
    isContainer: false,
  },
  CraftInput: {
    tag: "Input",
    importFrom: "@/components/ui/input",
    importName: "Input",
    propsMap: ["type", "placeholder", "disabled", "className"],
    isContainer: false,
  },
  CraftCard: {
    tag: "Card",
    importFrom: "@/components/ui/card",
    importName: "Card",
    propsMap: ["className"],
    isContainer: true,
  },
  CraftLabel: {
    tag: "Label",
    importFrom: "@/components/ui/label",
    importName: "Label",
    propsMap: ["htmlFor", "className"],
    textProp: "text",
    isContainer: false,
  },
  CraftBadge: {
    tag: "Badge",
    importFrom: "@/components/ui/badge",
    importName: "Badge",
    propsMap: ["variant", "className"],
    textProp: "text",
    isContainer: false,
  },
  CraftSeparator: {
    tag: "Separator",
    importFrom: "@/components/ui/separator",
    importName: "Separator",
    propsMap: ["orientation", "className"],
    isContainer: false,
  },
  CraftTable: {
    tag: "Table",
    importFrom: "@/components/ui/table",
    importName: "Table",
    propsMap: ["className"],
    isContainer: false,
  },
  // Phase 1: Simple components
  CraftAccordion: {
    tag: "Accordion",
    importFrom: "@/components/ui/accordion",
    importName: "Accordion",
    propsMap: ["type", "className"],
    isContainer: false,
  },
  CraftAlert: {
    tag: "Alert",
    importFrom: "@/components/ui/alert",
    importName: "Alert",
    propsMap: ["variant", "className"],
    isContainer: false,
  },
  CraftAspectRatio: {
    tag: "AspectRatio",
    importFrom: "@/components/ui/aspect-ratio",
    importName: "AspectRatio",
    propsMap: ["ratio", "className"],
    isContainer: true,
  },
  CraftAvatar: {
    tag: "Avatar",
    importFrom: "@/components/ui/avatar",
    importName: "Avatar",
    propsMap: ["className"],
    isContainer: false,
  },
  CraftBreadcrumb: {
    tag: "Breadcrumb",
    importFrom: "@/components/ui/breadcrumb",
    importName: "Breadcrumb",
    propsMap: ["className"],
    isContainer: false,
  },
  CraftCheckbox: {
    tag: "Checkbox",
    importFrom: "@/components/ui/checkbox",
    importName: "Checkbox",
    propsMap: ["checked", "disabled", "className"],
    textProp: "label",
    isContainer: false,
  },
  CraftCollapsible: {
    tag: "Collapsible",
    importFrom: "@/components/ui/collapsible",
    importName: "Collapsible",
    propsMap: ["open", "className"],
    isContainer: true,
  },
  CraftPagination: {
    tag: "Pagination",
    importFrom: "@/components/ui/pagination",
    importName: "Pagination",
    propsMap: ["className"],
    isContainer: false,
  },
  CraftProgress: {
    tag: "Progress",
    importFrom: "@/components/ui/progress",
    importName: "Progress",
    propsMap: ["value", "className"],
    isContainer: false,
  },
  CraftRadioGroup: {
    tag: "RadioGroup",
    importFrom: "@/components/ui/radio-group",
    importName: "RadioGroup",
    propsMap: ["value", "className"],
    isContainer: false,
  },
  CraftScrollArea: {
    tag: "ScrollArea",
    importFrom: "@/components/ui/scroll-area",
    importName: "ScrollArea",
    propsMap: ["className"],
    isContainer: true,
  },
  CraftSkeleton: {
    tag: "Skeleton",
    importFrom: "@/components/ui/skeleton",
    importName: "Skeleton",
    propsMap: ["className"],
    isContainer: false,
  },
  CraftSlider: {
    tag: "Slider",
    importFrom: "@/components/ui/slider",
    importName: "Slider",
    propsMap: ["value", "min", "max", "step", "className"],
    isContainer: false,
  },
  CraftSwitch: {
    tag: "Switch",
    importFrom: "@/components/ui/switch",
    importName: "Switch",
    propsMap: ["checked", "disabled", "className"],
    textProp: "label",
    isContainer: false,
  },
  CraftTabs: {
    tag: "Tabs",
    importFrom: "@/components/ui/tabs",
    importName: "Tabs",
    propsMap: ["className"],
    isContainer: false,
  },
  CraftTextarea: {
    tag: "Textarea",
    importFrom: "@/components/ui/textarea",
    importName: "Textarea",
    propsMap: ["placeholder", "rows", "disabled", "className"],
    isContainer: false,
  },
  CraftToggle: {
    tag: "Toggle",
    importFrom: "@/components/ui/toggle",
    importName: "Toggle",
    propsMap: ["variant", "pressed", "className"],
    textProp: "text",
    isContainer: false,
  },
  CraftToggleGroup: {
    tag: "ToggleGroup",
    importFrom: "@/components/ui/toggle-group",
    importName: "ToggleGroup",
    propsMap: ["type", "className"],
    isContainer: false,
  },
  // Phase 2: Complex components
  CraftSelect: {
    tag: "Select",
    importFrom: "@/components/ui/select",
    importName: "Select",
    propsMap: ["placeholder", "className"],
    isContainer: false,
  },
  CraftCalendar: {
    tag: "Calendar",
    importFrom: "@/components/ui/calendar",
    importName: "Calendar",
    propsMap: ["className"],
    isContainer: false,
  },
  CraftResizable: {
    tag: "ResizablePanelGroup",
    importFrom: "@/components/ui/resizable",
    importName: "ResizablePanelGroup",
    propsMap: ["direction", "className"],
    isContainer: false,
  },
  CraftCarousel: {
    tag: "Carousel",
    importFrom: "@/components/ui/carousel",
    importName: "Carousel",
    propsMap: ["className"],
    isContainer: false,
  },
  CraftChart: {
    tag: "div",
    propsMap: ["className"],
    isContainer: false,
  },
  CraftForm: {
    tag: "form",
    propsMap: ["className"],
    isContainer: false,
  },
  // Phase 4: Overlay components (legacy standalone - render as Button for backward compat)
  CraftDialog: {
    tag: "Button",
    importFrom: "@/components/ui/button",
    importName: "Button",
    propsMap: ["variant", "className"],
    textProp: "triggerText",
    isContainer: false,
  },
  CraftAlertDialog: {
    tag: "Button",
    importFrom: "@/components/ui/button",
    importName: "Button",
    propsMap: ["className"],
    textProp: "triggerText",
    isContainer: false,
  },
  CraftSheet: {
    tag: "Button",
    importFrom: "@/components/ui/button",
    importName: "Button",
    propsMap: ["className"],
    textProp: "triggerText",
    isContainer: false,
  },
  CraftDrawer: {
    tag: "Button",
    importFrom: "@/components/ui/button",
    importName: "Button",
    propsMap: ["className"],
    textProp: "triggerText",
    isContainer: false,
  },
  CraftDropdownMenu: {
    tag: "Button",
    importFrom: "@/components/ui/button",
    importName: "Button",
    propsMap: ["className"],
    textProp: "triggerText",
    isContainer: false,
  },
  CraftContextMenu: {
    tag: "div",
    propsMap: ["className"],
    isContainer: false,
  },
  CraftPopover: {
    tag: "Button",
    importFrom: "@/components/ui/button",
    importName: "Button",
    propsMap: ["className"],
    textProp: "triggerText",
    isContainer: false,
  },
  CraftHoverCard: {
    tag: "span",
    propsMap: ["className"],
    textProp: "triggerText",
    isContainer: false,
  },
  CraftNavigationMenu: {
    tag: "nav",
    propsMap: ["className"],
    isContainer: false,
  },
  CraftMenubar: {
    tag: "div",
    propsMap: ["className"],
    isContainer: false,
  },
  CraftCommand: {
    tag: "div",
    propsMap: ["className"],
    isContainer: false,
  },
  CraftTooltip: {
    tag: "Button",
    importFrom: "@/components/ui/button",
    importName: "Button",
    propsMap: ["className"],
    textProp: "triggerText",
    isContainer: false,
  },
  CraftSonner: {
    tag: "Button",
    importFrom: "@/components/ui/button",
    importName: "Button",
    propsMap: ["className"],
    textProp: "triggerText",
    isContainer: false,
  },
};

/** Overlay type to import configuration */
const OVERLAY_IMPORTS: Record<string, { from: string; names: string[] }> = {
  dialog: { from: "@/components/ui/dialog", names: ["Dialog", "DialogTrigger", "DialogContent"] },
  "alert-dialog": { from: "@/components/ui/alert-dialog", names: ["AlertDialog", "AlertDialogTrigger", "AlertDialogContent", "AlertDialogAction", "AlertDialogCancel"] },
  sheet: { from: "@/components/ui/sheet", names: ["Sheet", "SheetTrigger", "SheetContent"] },
  drawer: { from: "@/components/ui/drawer", names: ["Drawer", "DrawerTrigger", "DrawerContent"] },
  popover: { from: "@/components/ui/popover", names: ["Popover", "PopoverTrigger", "PopoverContent"] },
  "dropdown-menu": { from: "@/components/ui/dropdown-menu", names: ["DropdownMenu", "DropdownMenuTrigger", "DropdownMenuContent"] },
};

const TOOLTIP_IMPORT = { from: "@/components/ui/tooltip", names: ["TooltipProvider", "Tooltip", "TooltipTrigger", "TooltipContent"] };

const CONTEXT_MENU_IMPORT = { from: "@/components/ui/context-menu", names: ["ContextMenu", "ContextMenuTrigger", "ContextMenuContent"] };

/** Default prop values to omit from generated TSX */
const DEFAULT_PROPS: Record<string, Record<string, unknown>> = {
  CraftButton: { variant: "default", size: "default", disabled: false, text: "Button",
    overlayType: "none", linkedMocPath: "", sheetSide: "right", overlayWidth: "", overlayHeight: "", overlayClassName: "", tooltipText: "", tooltipSide: "", toastText: "", toastPosition: "bottom-right" },
  CraftInput: { type: "text", disabled: false, tooltipText: "", tooltipSide: "", tooltipTrigger: "hover" },
  CraftBadge: { variant: "default", text: "Badge", tooltipText: "", tooltipSide: "" },
  CraftSeparator: { orientation: "horizontal" },
  CraftText: { tag: "p", text: "Text" },
  CraftPlaceholderImage: { alt: "Placeholder", keepAspectRatio: false },
  CraftImage: { alt: "", objectFit: "cover", keepAspectRatio: false },
  CraftLabel: { text: "Label", tooltipText: "", tooltipSide: "" },
  CraftCard: { title: "Card Title", description: "", contextMenuMocPath: "" },
  CraftContainer: {
    display: "flex", flexDirection: "column", justifyContent: "start",
    alignItems: "stretch", gap: "4", gridCols: 3, contextMenuMocPath: "",
  },
  CraftDiv: { contextMenuMocPath: "" },
  // Phase 1
  CraftAccordion: { items: "Item 1,Item 2,Item 3", type: "single", linkedMocPaths: "" },
  CraftAlert: { title: "Alert", description: "This is an alert message.", variant: "default", icon: "AlertCircle" },
  CraftAspectRatio: { ratio: 1.78 },
  CraftAvatar: { src: "", fallback: "AB" },
  CraftBreadcrumb: { items: "Home,Products,Current" },
  CraftCheckbox: { label: "Accept terms", checked: false, disabled: false, tooltipText: "", tooltipSide: "" },
  CraftCollapsible: { open: false },
  CraftPagination: { totalPages: 5, currentPage: 1 },
  CraftProgress: { value: 50 },
  CraftRadioGroup: { items: "Option A,Option B,Option C", value: "Option A" },
  CraftScrollArea: {},
  CraftSkeleton: { width: "100%", height: "20px" },
  CraftSlider: { value: 50, min: 0, max: 100, step: 1 },
  CraftSwitch: { label: "Toggle", checked: false, disabled: false },
  CraftTabs: { items: "Tab 1,Tab 2,Tab 3" },
  CraftTextarea: { disabled: false, tooltipText: "", tooltipSide: "", tooltipTrigger: "hover" },
  CraftToggle: { text: "Toggle", variant: "default", pressed: false },
  CraftToggleGroup: { items: "Bold,Italic,Underline", type: "single" },
  // Phase 2
  CraftSelect: { items: "Option 1,Option 2,Option 3", placeholder: "Select an option" },
  CraftCalendar: {},
  CraftResizable: { direction: "horizontal" },
  CraftCarousel: { items: "Slide 1,Slide 2,Slide 3" },
  CraftChart: { chartType: "bar" },
  CraftForm: {},
  // Phase 4 (legacy standalone)
  CraftDialog: { triggerText: "Open Dialog", variant: "default", linkedMocPath: "" },
  CraftAlertDialog: { triggerText: "Open Alert", linkedMocPath: "" },
  CraftSheet: { triggerText: "Open Sheet", side: "right", linkedMocPath: "" },
  CraftDrawer: { triggerText: "Open Drawer", linkedMocPath: "" },
  CraftDropdownMenu: { triggerText: "Open Menu", linkedMocPath: "" },
  CraftContextMenu: { linkedMocPath: "" },
  CraftPopover: { triggerText: "Open Popover", linkedMocPath: "" },
  CraftHoverCard: { triggerText: "Hover me", linkedMocPath: "" },
  CraftNavigationMenu: { items: "Home,About,Services,Contact", linkedMocPath: "" },
  CraftMenubar: { items: "File,Edit,View,Help", linkedMocPath: "" },
  CraftCommand: { placeholder: "Type a command or search...", items: "Calendar,Search,Settings", linkedMocPath: "" },
  CraftTooltip: { triggerText: "Hover", text: "Tooltip text" },
  CraftSonner: { triggerText: "Show Toast", text: "Event has been created." },
};

export function craftStateToTsx(
  craftState: CraftSerializedState,
  componentName = "MockPage",
  memos?: MocEditorMemo[],
): { imports: string; tsxSource: string } {
  if (!craftState || !craftState.ROOT) {
    return { imports: "", tsxSource: `export default function ${componentName}() {\n  return <div />;\n}` };
  }

  const usedImports = new Map<string, Set<string>>();

  function addImport(from: string, name: string): void {
    if (!usedImports.has(from)) {
      usedImports.set(from, new Set());
    }
    usedImports.get(from)!.add(name);
  }

  function collectImports(nodeId: string): void {
    const node = craftState[nodeId];
    if (!node) return;

    const resolvedName = getResolvedName(node);
    const mapping = COMPONENT_MAP[resolvedName];
    if (mapping?.importFrom && mapping?.importName) {
      addImport(mapping.importFrom, mapping.importName);
    }

    // Collect lucide-react icon import for CraftAlert
    if (resolvedName === "CraftAlert") {
      const icon = (node.props?.icon as string) || "AlertCircle";
      addImport("lucide-react", icon);
    }

    // Collect accordion sub-component imports
    if (resolvedName === "CraftAccordion") {
      addImport("@/components/ui/accordion", "AccordionItem");
      addImport("@/components/ui/accordion", "AccordionTrigger");
      addImport("@/components/ui/accordion", "AccordionContent");
    }

    // Collect overlay-related imports for CraftButton
    if (resolvedName === "CraftButton") {
      const overlayType = node.props?.overlayType as string | undefined;
      if (overlayType && overlayType !== "none") {
        const overlayImport = OVERLAY_IMPORTS[overlayType];
        if (overlayImport) {
          for (const name of overlayImport.names) {
            addImport(overlayImport.from, name);
          }
        }
      }
      const toastText = node.props?.toastText as string | undefined;
      if (toastText) {
        addImport("sonner", "toast");
      }
    }

    // Collect tooltip imports for any component with tooltipText
    const tooltipText = node.props?.tooltipText as string | undefined;
    if (tooltipText) {
      for (const name of TOOLTIP_IMPORT.names) {
        addImport(TOOLTIP_IMPORT.from, name);
      }
    }

    // Collect context menu imports for containers with contextMenuMocPath
    const contextMenuMocPath = node.props?.contextMenuMocPath as string | undefined;
    if (contextMenuMocPath) {
      for (const name of CONTEXT_MENU_IMPORT.names) {
        addImport(CONTEXT_MENU_IMPORT.from, name);
      }
    }

    for (const childId of node.nodes || []) {
      collectImports(childId);
    }
    for (const linkedId of Object.values(node.linkedNodes || {})) {
      collectImports(linkedId);
    }
  }

  function buildMocComments(nodeId: string, pad: string, props: Record<string, unknown>): string {
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

  /** Wrap rendered element with tooltip if tooltipText is set */
  function wrapWithTooltip(rendered: string, props: Record<string, unknown>, pad: string, tooltipTrigger?: string): string {
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
      `${pad}      <p>${escapeJsx(tooltipText)}</p>`,
      `${pad}    </TooltipContent>`,
      `${pad}  </Tooltip>`,
      `${pad}</TooltipProvider>`,
    ].join("\n");
  }

  /** Wrap rendered element with overlay if CraftButton has overlayType set */
  function wrapWithOverlay(rendered: string, props: Record<string, unknown>, pad: string): string {
    const overlayType = props?.overlayType as string | undefined;
    if (!overlayType || overlayType === "none") return rendered;

    const linkedMocPath = props?.linkedMocPath as string | undefined;
    const contentComment = linkedMocPath
      ? `{/* linked: ${escapeJsx(linkedMocPath)} */}`
      : "{/* overlay content */}";

    // Build style attribute for overlay size
    const overlayWidth = props?.overlayWidth as string | undefined;
    const overlayHeight = props?.overlayHeight as string | undefined;
    const styleParts: string[] = [];
    if (overlayWidth) styleParts.push(`maxWidth: "${overlayWidth}"`);
    if (overlayHeight) styleParts.push(`maxHeight: "${overlayHeight}", overflow: "auto"`);
    const styleAttr = styleParts.length > 0 ? ` style={{ ${styleParts.join(", ")} }}` : "";

    // Build className attribute for overlay content styling
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
      case "alert-dialog":
        return [
          `${pad}<AlertDialog>`,
          `${pad}  <AlertDialogTrigger asChild>`,
          rendered,
          `${pad}  </AlertDialogTrigger>`,
          `${pad}  <AlertDialogContent${classAttr}${styleAttr}>`,
          `${pad}    ${contentComment}`,
          `${pad}    <AlertDialogCancel>Cancel</AlertDialogCancel>`,
          `${pad}    <AlertDialogAction>Continue</AlertDialogAction>`,
          `${pad}  </AlertDialogContent>`,
          `${pad}</AlertDialog>`,
        ].join("\n");
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

  /** Wrap rendered container with context menu if contextMenuMocPath is set */
  function wrapWithContextMenu(rendered: string, props: Record<string, unknown>, pad: string): string {
    const contextMenuMocPath = props?.contextMenuMocPath as string | undefined;
    if (!contextMenuMocPath) return rendered;

    const contentComment = `{/* linked: ${escapeJsx(contextMenuMocPath)} */}`;
    return [
      `${pad}<ContextMenu>`,
      `${pad}  <ContextMenuTrigger asChild>`,
      rendered,
      `${pad}  </ContextMenuTrigger>`,
      `${pad}  <ContextMenuContent>`,
      `${pad}    ${contentComment}`,
      `${pad}  </ContextMenuContent>`,
      `${pad}</ContextMenu>`,
    ].join("\n");
  }

  function renderNode(nodeId: string, indent: number): string {
    const node = craftState[nodeId];
    if (!node) return "";

    const resolvedName = getResolvedName(node);
    const mapping = COMPONENT_MAP[resolvedName];
    const pad = "  ".repeat(indent);

    if (!mapping) {
      // Unknown component - render as comment
      return `${pad}{/* Unknown: ${resolvedName} */}`;
    }

    const mocComments = buildMocComments(nodeId, pad, node.props);

    // Determine the actual tag (CraftText can be h1-h6, span, p)
    let tag = mapping.tag;
    if (resolvedName === "CraftText") {
      const tagProp = node.props?.tag as string | undefined;
      if (tagProp && tagProp !== "p") {
        tag = tagProp;
      }
    }

    // Build props string
    const propsStr = buildPropsString(resolvedName, node.props, mapping);

    // Build container classes for CraftContainer
    let containerClass = "";
    if (resolvedName === "CraftContainer") {
      containerClass = buildContainerClasses(node.props);
    }
    if (resolvedName === "CraftFreeCanvas") {
      containerClass = "relative";
    }

    // Merge className
    const userClassName = (node.props?.className as string) || "";
    const combinedClassName = [containerClass, userClassName].filter(Boolean).join(" ");
    const classNameAttr = combinedClassName ? ` className="${combinedClassName}"` : "";

    // Build dimension styles
    const styleAttr = buildStyleAttr(node.props);

    const children = node.nodes || [];
    const textContent = mapping.textProp ? (node.props?.[mapping.textProp] as string) : undefined;

    // Toast onClick for CraftButton
    const toastText = resolvedName === "CraftButton" ? (node.props?.toastText as string | undefined) : undefined;
    let toastOnClick = "";
    if (toastText) {
      const toastPosition = (node.props?.toastPosition as string | undefined) || "bottom-right";
      if (toastPosition !== "bottom-right") {
        toastOnClick = ` onClick={() => toast("${escapeJsString(toastText)}", { position: "${toastPosition}" })}`;
      } else {
        toastOnClick = ` onClick={() => toast("${escapeJsString(toastText)}")}`;
      }
    }

    let rendered = "";

    // Card special case: render title/description
    if (resolvedName === "CraftCard") {
      const title = (node.props?.title as string) || "";
      const desc = (node.props?.description as string) || "";
      const innerChildren = children.map((id) => renderNode(id, indent + 2)).filter(Boolean);
      const cardBody = [];
      if (title) {
        cardBody.push(`${pad}    <div className="p-6">`);
        cardBody.push(`${pad}      <h3 className="text-lg font-semibold">${escapeJsx(title)}</h3>`);
        if (desc) {
          cardBody.push(`${pad}      <p className="text-sm text-muted-foreground">${escapeJsx(desc)}</p>`);
        }
        cardBody.push(`${pad}    </div>`);
      }
      if (innerChildren.length > 0) {
        cardBody.push(`${pad}    <div className="p-6 pt-0">`);
        cardBody.push(...innerChildren.map((c) => `  ${c}`));
        cardBody.push(`${pad}    </div>`);
      }
      if (cardBody.length > 0) {
        rendered = `${mocComments}\n${pad}<${tag}${propsStr}${classNameAttr}${styleAttr}>\n${cardBody.join("\n")}\n${pad}</${tag}>`;
      } else {
        rendered = `${mocComments}\n${pad}<${tag}${propsStr}${classNameAttr}${styleAttr} />`;
      }
      rendered = wrapWithContextMenu(rendered, node.props, pad);
      rendered = wrapWithTooltip(rendered, node.props, pad);
      return rendered;
    }

    // Alert special case: render with icon, title, description
    if (resolvedName === "CraftAlert") {
      const title = (node.props?.title as string) || "";
      const desc = (node.props?.description as string) || "";
      const icon = (node.props?.icon as string) || "AlertCircle";
      const alertBody: string[] = [];
      alertBody.push(`${pad}  <${icon} className="h-4 w-4" />`);
      if (title) {
        alertBody.push(`${pad}  <h5 className="mb-1 font-medium leading-none tracking-tight">${escapeJsx(title)}</h5>`);
      }
      if (desc) {
        alertBody.push(`${pad}  <div className="text-sm [&_p]:leading-relaxed">${escapeJsx(desc)}</div>`);
      }
      rendered = `${mocComments}\n${pad}<${tag}${propsStr}${classNameAttr}${styleAttr}>\n${alertBody.join("\n")}\n${pad}</${tag}>`;
      return rendered;
    }

    // Accordion special case: render with AccordionItem/Trigger/Content
    if (resolvedName === "CraftAccordion") {
      return `${mocComments}\n${renderAccordion(node.props, tag, propsStr, classNameAttr, styleAttr, pad)}`;
    }

    // Table special case: render as static table
    if (resolvedName === "CraftTable") {
      return `${mocComments}\n${renderTable(node.props, tag, propsStr, classNameAttr, styleAttr, pad)}`;
    }

    // Self-closing for img
    if (resolvedName === "CraftImage" || resolvedName === "CraftPlaceholderImage") {
      return `${mocComments}\n${pad}<${tag}${propsStr}${classNameAttr}${styleAttr} />`;
    }

    // Self-closing for Separator
    if (resolvedName === "CraftSeparator") {
      return `${mocComments}\n${pad}<${tag}${propsStr}${classNameAttr}${styleAttr} />`;
    }

    // Self-closing for Input
    if (resolvedName === "CraftInput") {
      rendered = `${mocComments}\n${pad}<${tag}${propsStr}${classNameAttr}${styleAttr} />`;
      const inputTooltipTrigger = node.props?.tooltipTrigger as string | undefined;
      rendered = wrapWithTooltip(rendered, node.props, pad, inputTooltipTrigger);
      return rendered;
    }

    // Self-closing for Textarea
    if (resolvedName === "CraftTextarea") {
      rendered = `${mocComments}\n${pad}<${tag}${propsStr}${classNameAttr}${styleAttr} />`;
      const textareaTooltipTrigger = node.props?.tooltipTrigger as string | undefined;
      rendered = wrapWithTooltip(rendered, node.props, pad, textareaTooltipTrigger);
      return rendered;
    }

    // Self-closing for Progress, Slider, Skeleton
    if (resolvedName === "CraftProgress" || resolvedName === "CraftSlider" || resolvedName === "CraftSkeleton") {
      return `${mocComments}\n${pad}<${tag}${propsStr}${classNameAttr}${styleAttr} />`;
    }

    // Container with children
    if (mapping.isContainer && children.length > 0) {
      const renderedChildren = children
        .map((id) => renderNode(id, indent + 1))
        .filter(Boolean);
      rendered = `${mocComments}\n${pad}<${tag}${classNameAttr}${styleAttr}>\n${renderedChildren.join("\n")}\n${pad}</${tag}>`;
      rendered = wrapWithContextMenu(rendered, node.props, pad);
      return rendered;
    }

    // Text content
    if (textContent) {
      rendered = `${mocComments}\n${pad}<${tag}${propsStr}${classNameAttr}${toastOnClick}${styleAttr}>${escapeJsx(textContent)}</${tag}>`;
      // Apply wrappers for CraftButton
      if (resolvedName === "CraftButton") {
        rendered = wrapWithOverlay(rendered, node.props, pad);
        rendered = wrapWithTooltip(rendered, node.props, pad);
      }
      // Apply tooltip wrapper for Badge/Label/Checkbox
      if (resolvedName === "CraftBadge" || resolvedName === "CraftLabel" || resolvedName === "CraftCheckbox") {
        rendered = wrapWithTooltip(rendered, node.props, pad);
      }
      return rendered;
    }

    // Empty container
    if (mapping.isContainer) {
      rendered = `${mocComments}\n${pad}<${tag}${classNameAttr}${styleAttr} />`;
      rendered = wrapWithContextMenu(rendered, node.props, pad);
      return rendered;
    }

    // Fallback self-closing
    rendered = `${mocComments}\n${pad}<${tag}${propsStr}${classNameAttr}${toastOnClick}${styleAttr} />`;
    if (resolvedName === "CraftButton") {
      rendered = wrapWithOverlay(rendered, node.props, pad);
      rendered = wrapWithTooltip(rendered, node.props, pad);
    }
    return rendered;
  }

  // Collect imports from tree
  collectImports("ROOT");

  // Render the tree starting from ROOT's children (indent 3 for Fragment wrapper)
  const rootNode = craftState.ROOT;
  const rootChildren = rootNode.nodes || [];
  const renderedBody = rootChildren
    .map((id) => renderNode(id, 3))
    .filter(Boolean)
    .join("\n");

  // Build root container class
  const rootContainerClass = buildContainerClasses(rootNode.props);
  const rootUserClass = (rootNode.props?.className as string) || "";
  const rootCombinedClass = [rootContainerClass, rootUserClass].filter(Boolean).join(" ");
  const rootStyleAttr = buildStyleAttr(rootNode.props);

  // Build import statements
  const importLines: string[] = [];
  for (const [source, names] of usedImports) {
    const sortedNames = [...names].sort();
    importLines.push(`import { ${sortedNames.join(", ")} } from "${source}";`);
  }
  const imports = importLines.join("\n");

  // Build TSX source with Fragment wrapper and @moc-node ROOT comment
  let tsxSource: string;
  if (renderedBody) {
    const rootClassAttr = rootCombinedClass ? ` className="${rootCombinedClass}"` : "";
    const rootMocComments = buildMocComments("ROOT", "      ", rootNode.props);
    tsxSource = `export default function ${componentName}() {\n  return (\n    <>\n${rootMocComments}\n      <div${rootClassAttr}${rootStyleAttr}>\n${renderedBody}\n      </div>\n    </>\n  );\n}`;
  } else {
    tsxSource = `export default function ${componentName}() {\n  return <div />;\n}`;
  }

  return { imports, tsxSource };
}

function getResolvedName(node: CraftNodeData): string {
  if (typeof node.type === "string") return node.type;
  return node.type?.resolvedName || "Unknown";
}

function buildPropsString(resolvedName: string, props: Record<string, unknown>, mapping: ComponentMapping): string {
  const defaults = DEFAULT_PROPS[resolvedName] || {};
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
      parts.push(`${key}="${escapeAttr(String(val))}"`);
    }
  }

  return parts.length > 0 ? " " + parts.join(" ") : "";
}

function buildContainerClasses(props: Record<string, unknown>): string {
  const classes: string[] = [];
  const display = (props?.display as string) || "flex";
  classes.push(display === "grid" ? "grid" : "flex");

  if (display === "flex") {
    const dir = (props?.flexDirection as string) || "column";
    if (dir === "row") classes.push("flex-row");
    else classes.push("flex-col");

    const justify = (props?.justifyContent as string) || "start";
    const justifyMap: Record<string, string> = {
      start: "justify-start", center: "justify-center", end: "justify-end",
      between: "justify-between", around: "justify-around", evenly: "justify-evenly",
    };
    if (justifyMap[justify] && justify !== "start") classes.push(justifyMap[justify]);

    const align = (props?.alignItems as string) || "stretch";
    const alignMap: Record<string, string> = {
      start: "items-start", center: "items-center", end: "items-end",
      stretch: "items-stretch", baseline: "items-baseline",
    };
    if (alignMap[align] && align !== "stretch") classes.push(alignMap[align]);
  } else {
    const cols = (props?.gridCols as number) || 3;
    classes.push(`grid-cols-${cols}`);
  }

  const gap = (props?.gap as string) || "4";
  if (gap !== "0") classes.push(`gap-${gap}`);

  return classes.join(" ");
}

function buildStyleAttr(props: Record<string, unknown>): string {
  const w = props?.width as string | undefined;
  const h = props?.height as string | undefined;
  const objectFit = props?.objectFit as string | undefined;
  const parts: string[] = [];
  if (w && w !== "auto") parts.push(`width: "${w}"`);
  if (h && h !== "auto") parts.push(`height: "${h}"`);
  if (objectFit && objectFit !== "cover") parts.push(`objectFit: "${objectFit}"`);
  if (parts.length === 0) return "";
  return ` style={{ ${parts.join(", ")} }}`;
}

function renderTable(
  props: Record<string, unknown>,
  tag: string,
  propsStr: string,
  classNameAttr: string,
  styleAttr: string,
  pad: string,
): string {
  const columns = ((props?.columns as string) || "Name,Email,Role").split(",").map((s) => s.trim());
  const rowsStr = (props?.rows as string) || "";
  const rows = rowsStr ? rowsStr.split(";").map((r) => r.split(",").map((c) => c.trim())) : [];
  const hasHeader = props?.hasHeader !== false;

  const lines: string[] = [];
  lines.push(`${pad}<${tag}${propsStr}${classNameAttr}${styleAttr}>`);

  if (hasHeader) {
    lines.push(`${pad}  <thead>`);
    lines.push(`${pad}    <tr>`);
    for (const col of columns) {
      lines.push(`${pad}      <th>${escapeJsx(col)}</th>`);
    }
    lines.push(`${pad}    </tr>`);
    lines.push(`${pad}  </thead>`);
  }

  if (rows.length > 0) {
    lines.push(`${pad}  <tbody>`);
    for (const row of rows) {
      lines.push(`${pad}    <tr>`);
      for (const cell of row) {
        lines.push(`${pad}      <td>${escapeJsx(cell)}</td>`);
      }
      lines.push(`${pad}    </tr>`);
    }
    lines.push(`${pad}  </tbody>`);
  }

  lines.push(`${pad}</${tag}>`);
  return lines.join("\n");
}

function renderAccordion(
  props: Record<string, unknown>,
  tag: string,
  propsStr: string,
  classNameAttr: string,
  styleAttr: string,
  pad: string,
): string {
  const items = ((props?.items as string) || "Item 1,Item 2,Item 3").split(",").map((s) => s.trim());
  const linkedMocPaths = ((props?.linkedMocPaths as string) || "").split(",").map((s) => s.trim());
  const type = (props?.type as string) || "single";
  const collapsibleAttr = type === "single" ? " collapsible" : "";

  const lines: string[] = [];
  lines.push(`${pad}<${tag}${propsStr}${classNameAttr}${styleAttr}${collapsibleAttr}>`);

  for (let i = 0; i < items.length; i++) {
    const label = items[i];
    const mocPath = linkedMocPaths[i] || "";
    const value = `item-${i + 1}`;
    lines.push(`${pad}  <AccordionItem value="${value}">`);
    lines.push(`${pad}    <AccordionTrigger>${escapeJsx(label)}</AccordionTrigger>`);
    lines.push(`${pad}    <AccordionContent>`);
    if (mocPath) {
      lines.push(`${pad}      {/* linked: ${escapeJsx(mocPath)} */}`);
    } else {
      lines.push(`${pad}      <p>${escapeJsx(label)} content</p>`);
    }
    lines.push(`${pad}    </AccordionContent>`);
    lines.push(`${pad}  </AccordionItem>`);
  }

  lines.push(`${pad}</${tag}>`);
  return lines.join("\n");
}

function escapeJsx(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/{/g, "&#123;").replace(/}/g, "&#125;");
}

function escapeAttr(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeJsString(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r");
}
