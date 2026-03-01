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
  TableCellSlot: {
    tag: "TableCell",
    propsMap: [],
    isContainer: true,
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
    propsMap: ["ratio", "width", "height", "className"],
    isContainer: true,
  },
  CraftAvatar: {
    tag: "Avatar",
    importFrom: "@/components/ui/avatar",
    importName: "Avatar",
    propsMap: ["src", "fallback", "size", "className", "tooltipText", "tooltipSide"],
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
    propsMap: ["checked", "disabled", "checkedColor", "uncheckedColor", "className"],
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
  CollapsibleSlot: {
    tag: "div",
    propsMap: [],
    isContainer: true,
  },
  TabContentSlot: {
    tag: "div",
    propsMap: [],
    isContainer: true,
  },
  NavMenuSlot: {
    tag: "div",
    propsMap: [],
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
    propsMap: ["value", "min", "max", "step", "fillClassName", "trackClassName", "className", "tooltipText", "tooltipSide"],
    isContainer: false,
  },
  CraftSwitch: {
    tag: "Switch",
    importFrom: "@/components/ui/switch",
    importName: "Switch",
    propsMap: ["checked", "disabled", "description", "invalid", "size", "variant", "checkedClassName", "uncheckedClassName", "cardBorderColor", "cardBgColor", "descriptionColor", "labelColor", "className", "tooltipText", "tooltipSide"],
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
    propsMap: ["variant", "pressed", "size", "disabled", "className"],
    textProp: "text",
    isContainer: false,
  },
  CraftToggleGroup: {
    tag: "ToggleGroup",
    importFrom: "@/components/ui/toggle-group",
    importName: "ToggleGroup",
    propsMap: ["type", "variant", "size", "disabled", "orientation", "className"],
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
    propsMap: ["className", "todayBgClass", "todayTextClass"],
    isContainer: false,
  },
  CraftResizable: {
    tag: "ResizablePanelGroup",
    importFrom: "@/components/ui/resizable",
    importName: "ResizablePanelGroup",
    propsMap: ["className"],
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
    isContainer: true,
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
  CraftCombobox: {
    tag: "Popover",
    importFrom: "@/components/ui/popover",
    importName: "Popover",
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

const CONTEXT_MENU_IMPORT = { from: "@/components/ui/context-menu", names: ["ContextMenu", "ContextMenuTrigger", "ContextMenuContent", "ContextMenuItem", "ContextMenuCheckboxItem", "ContextMenuSeparator", "ContextMenuLabel"] };

/** Default ContextMenu data (matches DEFAULT_CONTEXTMENU_DATA in CraftContextMenu.tsx) */
const DEFAULT_CONTEXTMENU_DATA_STR = JSON.stringify([
  { label: "", items: [{ type: "item", label: "Open", shortcut: "Ctrl+O" }, { type: "item", label: "Edit" }, { type: "separator" }, { type: "checkbox", label: "Show Details", checked: false }, { type: "separator" }, { type: "item", label: "Delete" }] },
]);

/** Default Menubar data (matches DEFAULT_MENUBAR_DATA in CraftMenubar.tsx) */
const DEFAULT_MENUBAR_DATA_STR = JSON.stringify([
  { label: "File", items: [{ type: "item", label: "New File", shortcut: "Ctrl+N" }, { type: "item", label: "Open...", shortcut: "Ctrl+O" }, { type: "separator" }, { type: "checkbox", label: "Auto Save", checked: false }, { type: "separator" }, { type: "item", label: "Exit" }] },
  { label: "Edit", items: [{ type: "item", label: "Undo", shortcut: "Ctrl+Z" }, { type: "item", label: "Redo", shortcut: "Ctrl+Y" }, { type: "separator" }, { type: "item", label: "Cut", shortcut: "Ctrl+X" }, { type: "item", label: "Copy", shortcut: "Ctrl+C" }, { type: "item", label: "Paste", shortcut: "Ctrl+V" }] },
  { label: "View", items: [{ type: "checkbox", label: "Word Wrap", checked: false }, { type: "separator" }, { type: "item", label: "Zoom In", shortcut: "Ctrl++" }, { type: "item", label: "Zoom Out", shortcut: "Ctrl+-" }] },
  { label: "Help", items: [{ type: "item", label: "Documentation" }, { type: "item", label: "About" }] },
]);

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
  CraftCard: { title: "Card Title", description: "", contextMenuMocPath: "", linkedMocPath: "" },
  CraftContainer: {
    display: "flex", flexDirection: "column", justifyContent: "start",
    alignItems: "stretch", gap: "4", gridCols: 3, contextMenuMocPath: "", linkedMocPath: "",
  },
  CraftDiv: { contextMenuMocPath: "" },
  // Phase 1
  CraftAccordion: { items: "Item 1,Item 2,Item 3", type: "single", linkedMocPaths: "" },
  CraftAlert: { title: "Alert", description: "This is an alert message.", variant: "default", icon: "AlertCircle" },
  CraftAspectRatio: { ratio: 1.78, width: "auto", height: "auto" },
  CraftAvatar: { src: "", fallback: "AB", size: "default", width: "auto", height: "auto", tooltipText: "", tooltipSide: "" },
  CraftBreadcrumb: { items: "Home,Products,Current" },
  CraftCheckbox: { label: "Accept terms", checked: false, disabled: false, tooltipText: "", tooltipSide: "" },
  CraftCollapsible: { open: false, triggerStyle: "chevron", linkedMocPath: "" },
  CraftPagination: { totalPages: 5, currentPage: 1 },
  CraftProgress: { value: 50 },
  CraftRadioGroup: { items: "Option A,Option B,Option C", value: "Option A", orientation: "vertical", variant: "default", descriptions: "", cardBorderColor: "", cardBgColor: "", descriptionColor: "", tooltipText: "", tooltipSide: "" },
  CraftScrollArea: {},
  CraftSkeleton: { width: "100%", height: "20px" },
  CraftSlider: { value: 50, min: 0, max: 100, step: 1, fillClassName: "", trackClassName: "", tooltipText: "", tooltipSide: "" },
  CraftSwitch: { label: "Toggle", checked: false, disabled: false, description: "", invalid: false, size: "default", variant: "default", checkedClassName: "", uncheckedClassName: "", cardBorderColor: "", cardBgColor: "", descriptionColor: "", labelColor: "", tooltipText: "", tooltipSide: "" },
  CraftTabs: { items: "Tab 1,Tab 2,Tab 3" },
  CraftTextarea: { disabled: false, tooltipText: "", tooltipSide: "", tooltipTrigger: "hover" },
  CraftToggle: { text: "Toggle", variant: "default", pressed: false, size: "default", disabled: false, icon: "", tooltipText: "", tooltipSide: "" },
  CraftToggleGroup: { items: "Bold,Italic,Underline", type: "single", variant: "default", size: "default", disabled: false, gap: "1", orientation: "horizontal", tooltipText: "", tooltipSide: "", descriptions: "", cardBorderColor: "", cardBgColor: "", descriptionColor: "" },
  // Phase 2
  CraftSelect: { items: "Option 1,Option 2,Option 3", placeholder: "Select an option", tooltipText: "", tooltipSide: "" },
  CraftCalendar: { todayBgClass: "", todayTextClass: "" },
  CraftResizable: { panelMeta: '{"direction":"horizontal","nextKey":2,"panels":[{"key":0,"size":50},{"key":1,"size":50}]}', withHandle: true },
  CraftCarousel: { items: "Slide 1,Slide 2,Slide 3" },
  CraftChart: { chartType: "bar" },
  CraftForm: {},
  // Phase 4 (legacy standalone)
  CraftDialog: { triggerText: "Open Dialog", variant: "default", linkedMocPath: "" },
  CraftAlertDialog: { triggerText: "Open Alert", linkedMocPath: "" },
  CraftSheet: { triggerText: "Open Sheet", side: "right", linkedMocPath: "" },
  CraftDrawer: { triggerText: "Open Drawer", linkedMocPath: "" },
  CraftDropdownMenu: { triggerText: "Open Menu", linkedMocPath: "" },
  CraftContextMenu: { menuData: DEFAULT_CONTEXTMENU_DATA_STR },
  CraftPopover: { triggerText: "Open Popover", linkedMocPath: "" },
  CraftHoverCard: { triggerText: "Hover me", linkedMocPath: "" },
  CraftNavigationMenu: {},
  CraftMenubar: { menuData: DEFAULT_MENUBAR_DATA_STR },
  CraftCommand: { placeholder: "Type a command or search...", items: "Calendar,Search,Settings", linkedMocPath: "" },
  CraftCombobox: { placeholder: "Select an option...", items: "Apple,Banana,Cherry", linkedMocPath: "", tooltipText: "", tooltipSide: "", tooltipTrigger: "hover" },
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

    // Collect lucide-react icon import for CraftToggle
    if (resolvedName === "CraftToggle") {
      const icon = node.props?.icon as string | undefined;
      if (icon) addImport("lucide-react", icon);
    }

    // Collect toggle-group sub-component imports
    if (resolvedName === "CraftToggleGroup") {
      addImport("@/components/ui/toggle-group", "ToggleGroupItem");
    }

    // Collect accordion sub-component imports
    if (resolvedName === "CraftAccordion") {
      addImport("@/components/ui/accordion", "AccordionItem");
      addImport("@/components/ui/accordion", "AccordionTrigger");
      addImport("@/components/ui/accordion", "AccordionContent");
    }

    // Collect collapsible sub-component imports
    if (resolvedName === "CraftCollapsible") {
      addImport("@/components/ui/collapsible", "CollapsibleTrigger");
      addImport("@/components/ui/collapsible", "CollapsibleContent");
    }

    // Collect radio group sub-component imports
    if (resolvedName === "CraftRadioGroup") {
      addImport("@/components/ui/radio-group", "RadioGroupItem");
      addImport("@/components/ui/label", "Label");
    }

    // Collect select sub-component imports
    if (resolvedName === "CraftSelect") {
      addImport("@/components/ui/select", "SelectTrigger");
      addImport("@/components/ui/select", "SelectContent");
      addImport("@/components/ui/select", "SelectItem");
      addImport("@/components/ui/select", "SelectValue");
    }

    // Collect combobox sub-component imports
    if (resolvedName === "CraftCombobox") {
      addImport("@/components/ui/popover", "PopoverContent");
      addImport("@/components/ui/popover", "PopoverTrigger");
      addImport("@/components/ui/button", "Button");
      addImport("@/components/ui/command", "Command");
      addImport("@/components/ui/command", "CommandEmpty");
      addImport("@/components/ui/command", "CommandGroup");
      addImport("@/components/ui/command", "CommandInput");
      addImport("@/components/ui/command", "CommandItem");
      addImport("@/components/ui/command", "CommandList");
      addImport("lucide-react", "Check");
      addImport("lucide-react", "ChevronsUpDown");
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

    // Collect tooltip imports for CraftTabs with any tab tooltip set
    if (resolvedName === "CraftTabs") {
      try {
        const tabMetaRaw = node.props?.tabMeta as string | undefined;
        const tabMeta = JSON.parse(tabMetaRaw || "{}");
        const tabTooltips = tabMeta.tooltips as Record<string, string> | undefined;
        if (tabTooltips && Object.values(tabTooltips).some((t) => !!t)) {
          for (const name of TOOLTIP_IMPORT.names) {
            addImport(TOOLTIP_IMPORT.from, name);
          }
        }
      } catch {
        // ignore
      }
    }

    // Collect context menu imports for containers with contextMenuMocPath
    const contextMenuMocPath = node.props?.contextMenuMocPath as string | undefined;
    if (contextMenuMocPath) {
      for (const name of CONTEXT_MENU_IMPORT.names) {
        addImport(CONTEXT_MENU_IMPORT.from, name);
      }
    }

    // CraftContextMenu: add only item-level sub-component imports (no wrapper/trigger)
    if (resolvedName === "CraftContextMenu") {
      for (const name of ["ContextMenuItem", "ContextMenuCheckboxItem", "ContextMenuSeparator", "ContextMenuLabel"]) {
        addImport(CONTEXT_MENU_IMPORT.from, name);
      }
      return;
    }

    // CraftTable: add table sub-component imports and traverse cell slot linkedNodes
    if (resolvedName === "CraftTable") {
      addImport("@/components/ui/table", "TableHeader");
      addImport("@/components/ui/table", "TableBody");
      addImport("@/components/ui/table", "TableRow");
      addImport("@/components/ui/table", "TableHead");
      addImport("@/components/ui/table", "TableCell");
      for (const linkedId of Object.values(node.linkedNodes || {})) {
        collectImports(linkedId);
      }
      return;
    }

    // CraftTabs: add tab sub-component imports and traverse linkedNodes
    if (resolvedName === "CraftTabs") {
      addImport("@/components/ui/tabs", "TabsList");
      addImport("@/components/ui/tabs", "TabsTrigger");
      addImport("@/components/ui/tabs", "TabsContent");
      // Collect icon imports from tabMeta
      try {
        const meta = JSON.parse((node.props?.tabMeta as string) || "{}");
        if (typeof meta.icons === "object" && meta.icons !== null) {
          for (const icon of Object.values(meta.icons)) {
            if (icon && typeof icon === "string") addImport("lucide-react", icon);
          }
        }
      } catch {
        // ignore parse errors
      }
      for (const linkedId of Object.values(node.linkedNodes || {})) {
        collectImports(linkedId);
      }
      return;
    }

    // CraftNavigationMenu: traverse linkedNodes (slot children)
    if (resolvedName === "CraftNavigationMenu") {
      for (const linkedId of Object.values(node.linkedNodes || {})) {
        collectImports(linkedId);
      }
      return;
    }

    // CraftResizable: add panel sub-component imports and traverse linkedNodes
    if (resolvedName === "CraftResizable") {
      addImport("@/components/ui/resizable", "ResizablePanelGroup");
      addImport("@/components/ui/resizable", "ResizablePanel");
      addImport("@/components/ui/resizable", "ResizableHandle");
      for (const linkedId of Object.values(node.linkedNodes || {})) {
        collectImports(linkedId);
      }
      return;
    }

    // CraftCollapsible: content slot is only rendered when linkedMocPath is not set
    if (resolvedName === "CraftCollapsible") {
      const hasLinkedMoc = !!(node.props?.linkedMocPath as string);
      const headerSlotId = node.linkedNodes?.header;
      if (headerSlotId) collectImports(headerSlotId);
      if (!hasLinkedMoc) {
        const contentSlotId = node.linkedNodes?.content;
        if (contentSlotId) collectImports(contentSlotId);
      }
      return;
    }

    // CraftContainer: children are not rendered when linkedMocPath is set
    if (resolvedName === "CraftContainer" && (node.props?.linkedMocPath as string)) {
      return;
    }

    // CraftCard: children are not rendered when linkedMocPath is set
    if (resolvedName === "CraftCard" && (node.props?.linkedMocPath as string)) {
      return;
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
      `${pad}      <p className="whitespace-pre-wrap">${tooltipText.includes("\n") ? `{"${escapeJsString(tooltipText)}"}` : escapeJsx(tooltipText)}</p>`,
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
    const styleAttr = buildStyleAttr(
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
      const linkedMocPath = (node.props?.linkedMocPath as string) || "";
      const innerChildren = children.map((id) => renderNode(id, indent + 2)).filter(Boolean);
      const cardBody = [];
      if (title) {
        const escapedTitle = title.includes("\n") ? `{"${escapeJsString(title)}"}` : escapeJsx(title);
        const escapedDesc = desc.includes("\n") ? `{"${escapeJsString(desc)}"}` : escapeJsx(desc);
        cardBody.push(`${pad}    <div className="p-6">`);
        cardBody.push(`${pad}      <h3 className="text-lg font-semibold whitespace-pre-line">${escapedTitle}</h3>`);
        if (desc) {
          cardBody.push(`${pad}      <p className="text-sm text-muted-foreground whitespace-pre-line">${escapedDesc}</p>`);
        }
        cardBody.push(`${pad}    </div>`);
      }
      if (linkedMocPath) {
        cardBody.push(`${pad}    <div className="p-6 pt-0">`);
        cardBody.push(`${pad}      {/* linked: ${escapeJsx(linkedMocPath)} */}`);
        cardBody.push(`${pad}    </div>`);
      } else if (innerChildren.length > 0) {
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
        const escapedTitle = title.includes("\n") ? `{"${escapeJsString(title)}"}` : escapeJsx(title);
        alertBody.push(`${pad}  <h5 className="mb-1 font-medium leading-none tracking-tight whitespace-pre-line">${escapedTitle}</h5>`);
      }
      if (desc) {
        const escapedDesc = desc.includes("\n") ? `{"${escapeJsString(desc)}"}` : escapeJsx(desc);
        alertBody.push(`${pad}  <div className="text-sm [&_p]:leading-relaxed whitespace-pre-line">${escapedDesc}</div>`);
      }
      rendered = `${mocComments}\n${pad}<${tag}${propsStr}${classNameAttr}${styleAttr}>\n${alertBody.join("\n")}\n${pad}</${tag}>`;
      return rendered;
    }

    // Accordion special case: render with AccordionItem/Trigger/Content
    if (resolvedName === "CraftAccordion") {
      return `${mocComments}\n${renderAccordion(node.props, tag, propsStr, classNameAttr, styleAttr, pad)}`;
    }

    // Collapsible special case: render with linkedNodes header/content zones + CollapsibleTrigger/Content
    if (resolvedName === "CraftCollapsible") {
      const open = !!(node.props?.open);
      const triggerStyle = (node.props?.triggerStyle as string) || "chevron";
      const linkedMocPath = (node.props?.linkedMocPath as string) || "";
      const outerBorderColor = (node.props?.outerBorderColor as string) || "";
      const dividerBorderColor = (node.props?.dividerBorderColor as string) || "";
      const triggerBorderColor = (node.props?.triggerBorderColor as string) || "";
      const outerShadow = (node.props?.outerShadow as string) || "";
      const contentShadow = (node.props?.contentShadow as string) || "";
      const triggerShadow = (node.props?.triggerShadow as string) || "";

      // Resolve header children from linkedNodes
      const headerSlotId = node.linkedNodes?.header;
      const headerSlotNode = headerSlotId ? craftState[headerSlotId] : null;
      const headerChildren = (headerSlotNode?.nodes || []).map((id) => renderNode(id, indent + 2)).filter(Boolean);

      // Resolve content children from linkedNodes
      const contentSlotId = node.linkedNodes?.content;
      const contentSlotNode = contentSlotId ? craftState[contentSlotId] : null;
      const contentChildren = (contentSlotNode?.nodes || []).map((id) => renderNode(id, indent + 4)).filter(Boolean);

      const TRIGGER_SVGS: Record<string, string> = {
        chevron: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="m6 9 6 6 6-6"/></svg>`,
        "plus-minus": `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M5 12h14"/><path d="M12 5v14"/></svg>`,
        arrow: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="m9 18 6-6-6-6"/></svg>`,
      };

      // Build outer className: always include "rounded-md border" so outerBorderColor is visible
      const userClassName = (node.props?.className as string) || "";
      const outerCls = ["rounded-md border", outerBorderColor, outerShadow, userClassName].filter(Boolean).join(" ");
      const outerClassAttr = ` className="${escapeAttr(outerCls)}"`;

      // Build trigger className
      const triggerCls = ["rounded-md border p-1 hover:bg-accent", triggerBorderColor, triggerShadow].filter(Boolean).join(" ");

      // Build divider className
      const dividerCls = ["border-t px-4 py-2 text-sm", dividerBorderColor, contentShadow].filter(Boolean).join(" ");

      const lines: string[] = [];
      lines.push(`${pad}<Collapsible defaultOpen={${open}}${outerClassAttr}${styleAttr}>`);
      lines.push(`${pad}  <div className="flex items-center justify-between space-x-4 px-4 py-2">`);
      if (headerChildren.length > 0) {
        lines.push(...headerChildren);
      }
      if (triggerStyle !== "none") {
        const svg = TRIGGER_SVGS[triggerStyle] || TRIGGER_SVGS.chevron;
        lines.push(`${pad}    <CollapsibleTrigger className="${escapeAttr(triggerCls)}" data-variant="${triggerStyle}">`);
        lines.push(`${pad}      ${svg}`);
        lines.push(`${pad}    </CollapsibleTrigger>`);
      }
      lines.push(`${pad}  </div>`);
      lines.push(`${pad}  <CollapsibleContent>`);
      lines.push(`${pad}    <div className="${escapeAttr(dividerCls)}">`);
      if (linkedMocPath) {
        lines.push(`${pad}      {/* linked: ${escapeJsx(linkedMocPath)} */}`);
      } else if (contentChildren.length > 0) {
        lines.push(...contentChildren);
      } else {
        lines.push(`${pad}      <p>Collapsible content.</p>`);
      }
      lines.push(`${pad}    </div>`);
      lines.push(`${pad}  </CollapsibleContent>`);
      lines.push(`${pad}</Collapsible>`);
      return `${mocComments}\n${lines.join("\n")}`;
    }

    // Select special case: render with SelectTrigger/Content/Item (tooltip handled internally)
    if (resolvedName === "CraftSelect") {
      rendered = `${mocComments}\n${renderSelect(node.props, tag, propsStr, classNameAttr, styleAttr, pad)}`;
      return rendered;
    }

    // Combobox special case: render with Popover + Command structure
    if (resolvedName === "CraftCombobox") {
      rendered = `${mocComments}\n${renderCombobox(node.props, styleAttr, pad)}`;
      const comboboxTooltipTrigger = node.props?.tooltipTrigger as string | undefined;
      rendered = wrapWithTooltip(rendered, node.props, pad, comboboxTooltipTrigger);
      return rendered;
    }

    // RadioGroup special case: render with RadioGroupItem + Label
    if (resolvedName === "CraftRadioGroup") {
      rendered = `${mocComments}\n${renderRadioGroup(node.props, tag, propsStr, classNameAttr, styleAttr, pad)}`;
      rendered = wrapWithTooltip(rendered, node.props, pad);
      return rendered;
    }

    // Tabs special case: render as LinkedNodes tabs
    if (resolvedName === "CraftTabs") {
      return `${mocComments}\n${renderTabs(node, craftState, indent, renderNode)}`;
    }

    // NavigationMenu special case: render nav bar with hover dropdown slots
    if (resolvedName === "CraftNavigationMenu") {
      return `${mocComments}\n${renderNavigationMenu(node, craftState, indent, renderNode)}`;
    }

    // Menubar special case: render from JSON menuData
    if (resolvedName === "CraftMenubar") {
      return `${mocComments}\n${renderMenubar(node, indent)}`;
    }

    // ContextMenu special case: render from JSON menuData
    if (resolvedName === "CraftContextMenu") {
      return `${mocComments}\n${renderContextMenu(node, indent)}`;
    }

    // Table special case: render as LinkedNodes table
    if (resolvedName === "CraftTable") {
      return `${mocComments}\n${renderTable(node, craftState, indent, renderNode)}`;
    }

    // Resizable special case: render as LinkedNodes resizable panels
    if (resolvedName === "CraftResizable") {
      return `${mocComments}\n${renderResizable(node, craftState, indent, renderNode)}`;
    }

    // CraftContainer with linkedMocPath: render as div with linked comment (no children)
    if (resolvedName === "CraftContainer") {
      const linkedMocPath = (node.props?.linkedMocPath as string) || "";
      if (linkedMocPath) {
        rendered = `${mocComments}\n${pad}<div${classNameAttr}${styleAttr}>\n${pad}  {/* linked: ${escapeJsx(linkedMocPath)} */}\n${pad}</div>`;
        rendered = wrapWithContextMenu(rendered, node.props, pad);
        return rendered;
      }
    }

    // ToggleGroup special case: render items as ToggleGroupItem children
    if (resolvedName === "CraftToggleGroup") {
      rendered = `${mocComments}\n${renderToggleGroup(node.props, tag, propsStr, styleAttr, pad)}`;
      rendered = wrapWithTooltip(rendered, node.props, pad);
      return rendered;
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
      let rendered = `${mocComments}\n${pad}<${tag}${propsStr}${classNameAttr}${styleAttr} />`;
      if (resolvedName === "CraftSlider") {
        rendered = wrapWithTooltip(rendered, node.props, pad);
      }
      return rendered;
    }

    // Container with children
    if (mapping.isContainer && children.length > 0) {
      const renderedChildren = children
        .map((id) => renderNode(id, indent + 1))
        .filter(Boolean);
      rendered = `${mocComments}\n${pad}<${tag}${propsStr}${classNameAttr}${styleAttr}>\n${renderedChildren.join("\n")}\n${pad}</${tag}>`;
      rendered = wrapWithContextMenu(rendered, node.props, pad);
      return rendered;
    }

    // CraftToggle: icon を子要素として描画
    if (resolvedName === "CraftToggle") {
      const icon = node.props?.icon as string | undefined;
      const escapedText = textContent
        ? (textContent.includes("\n") ? `{"${escapeJsString(textContent)}"}` : escapeJsx(textContent))
        : "";
      const inner = icon
        ? `\n${pad}  <${icon} className="h-4 w-4" />${escapedText ? `\n${pad}  ${escapedText}` : ""}\n${pad}`
        : escapedText;
      rendered = `${mocComments}\n${pad}<${tag}${propsStr}${classNameAttr}${styleAttr}>${inner}</${tag}>`;
      rendered = wrapWithTooltip(rendered, node.props, pad);
      return rendered;
    }

    // Text content
    if (textContent) {
      const escapedTextContent = textContent.includes("\n")
        ? `{"${escapeJsString(textContent)}"}`
        : escapeJsx(textContent);
      rendered = `${mocComments}\n${pad}<${tag}${propsStr}${classNameAttr}${toastOnClick}${styleAttr}>${escapedTextContent}</${tag}>`;
      // Apply wrappers for CraftButton
      if (resolvedName === "CraftButton") {
        rendered = wrapWithOverlay(rendered, node.props, pad);
        rendered = wrapWithTooltip(rendered, node.props, pad);
      }
      // Apply tooltip wrapper for Badge/Label/Checkbox/Switch
      if (resolvedName === "CraftBadge" || resolvedName === "CraftLabel" || resolvedName === "CraftCheckbox" || resolvedName === "CraftSwitch") {
        rendered = wrapWithTooltip(rendered, node.props, pad);
      }
      return rendered;
    }

    // Empty container
    if (mapping.isContainer) {
      rendered = `${mocComments}\n${pad}<${tag}${propsStr}${classNameAttr}${styleAttr} />`;
      rendered = wrapWithContextMenu(rendered, node.props, pad);
      return rendered;
    }

    // Fallback self-closing
    rendered = `${mocComments}\n${pad}<${tag}${propsStr}${classNameAttr}${toastOnClick}${styleAttr} />`;
    if (resolvedName === "CraftButton") {
      rendered = wrapWithOverlay(rendered, node.props, pad);
      rendered = wrapWithTooltip(rendered, node.props, pad);
    }
    if (resolvedName === "CraftSwitch" || resolvedName === "CraftAvatar") {
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

/** 単位なし数値文字列に "px" を付ける。"100" → "100px"、"50%" → "50%"（そのまま） */
function normalizeCssSize(v: string | undefined): string | undefined {
  if (!v || v === "auto") return v;
  return /^\d+(\.\d+)?$/.test(v) ? v + "px" : v;
}

function buildStyleAttr(props: Record<string, unknown>, extraStyles?: Record<string, string>): string {
  const w = normalizeCssSize(props?.width as string | undefined);
  const h = normalizeCssSize(props?.height as string | undefined);
  const objectFit = props?.objectFit as string | undefined;
  const top = props?.top as string | undefined;
  const left = props?.left as string | undefined;
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
  if (parts.length === 0) return "";
  return ` style={{ ${parts.join(", ")} }}`;
}

function renderTable(
  node: CraftNodeData,
  craftState: CraftSerializedState,
  indent: number,
  renderNodeFn: (nodeId: string, indent: number) => string,
): string {
  const pad = "  ".repeat(indent);

  // Parse tableMeta
  let rowMap: number[] = [0, 1, 2];
  let colMap: number[] = [0, 1, 2];
  let colWidths: Record<string, string> = {};
  try {
    const meta = JSON.parse((node.props?.tableMeta as string) || "{}");
    if (Array.isArray(meta.rowMap)) rowMap = meta.rowMap;
    if (Array.isArray(meta.colMap)) colMap = meta.colMap;
    if (typeof meta.colWidths === "object" && meta.colWidths !== null) colWidths = meta.colWidths;
  } catch {
    // use defaults
  }

  // Build className and style attributes
  const className = (node.props?.className as string) || "";
  const classNameAttr = className ? ` className="${escapeAttr(className)}"` : "";
  const styleAttr = buildStyleAttr(node.props);

  // Compute hidden cells due to colspan/rowspan
  const hiddenCells = new Set<string>();
  for (let logR = 0; logR < rowMap.length; logR++) {
    for (let logC = 0; logC < colMap.length; logC++) {
      const physR = rowMap[logR];
      const physC = colMap[logC];
      const slotId = node.linkedNodes?.[`cell_${physR}_${physC}`];
      if (!slotId || hiddenCells.has(`${logR}_${logC}`)) continue;
      const slotNode = craftState[slotId];
      const colspan = (slotNode?.props?.colspan as number) || 1;
      const rowspan = (slotNode?.props?.rowspan as number) || 1;
      for (let dr = 0; dr < rowspan; dr++) {
        for (let dc = 0; dc < colspan; dc++) {
          if (dr === 0 && dc === 0) continue;
          if (logR + dr < rowMap.length && logC + dc < colMap.length) {
            hiddenCells.add(`${logR + dr}_${logC + dc}`);
          }
        }
      }
    }
  }

  // Determine how many leading rows are all-header (→ <TableHeader>)
  let headerRowCount = 0;
  for (let logR = 0; logR < rowMap.length; logR++) {
    let allHeader = true;
    for (let logC = 0; logC < colMap.length; logC++) {
      if (hiddenCells.has(`${logR}_${logC}`)) continue;
      const physR = rowMap[logR];
      const physC = colMap[logC];
      const slotId = node.linkedNodes?.[`cell_${physR}_${physC}`];
      if (!slotId) { allHeader = false; break; }
      const slotNode = craftState[slotId];
      if (!slotNode?.props?.isHeader) { allHeader = false; break; }
    }
    if (allHeader) headerRowCount++;
    else break;
  }

  const lines: string[] = [];
  lines.push(`${pad}<Table${classNameAttr}${styleAttr}>`);

  const tableBorderWidth = (node.props?.borderWidth as string) || "1";
  const tableBorderColor = (node.props?.borderColor as string) || "";
  const tableBwClass = tableBorderWidth === "0" ? "border-0"
    : tableBorderWidth === "2" ? "border-2"
    : tableBorderWidth === "4" ? "border-4"
    : "border";
  const tableBorderClass = [tableBwClass, tableBorderColor || "border-border"].filter(Boolean).join(" ");

  function renderRow(logR: number, rowIndent: number): void {
    const rowPad = "  ".repeat(rowIndent);
    const physR = rowMap[logR];
    lines.push(`${rowPad}<TableRow>`);
    for (let logC = 0; logC < colMap.length; logC++) {
      if (hiddenCells.has(`${logR}_${logC}`)) continue;
      const physC = colMap[logC];
      const cellKey = `cell_${physR}_${physC}`;
      const slotId = node.linkedNodes?.[cellKey];
      const slotNode = slotId ? craftState[slotId] : null;
      const isHeader = !!(slotNode?.props?.isHeader);
      const colspan = (slotNode?.props?.colspan as number) || 1;
      const rowspan = (slotNode?.props?.rowspan as number) || 1;
      const bgClass = (slotNode?.props?.bgClass as string) || "";
      const borderClass = (slotNode?.props?.borderClass as string) || "";
      const cellWidth = (slotNode?.props?.width as string) || "";
      const cellHeight = (slotNode?.props?.height as string) || "";
      const cellAlign = (slotNode?.props?.align as string) || "left";
      const colWidth = colWidths[String(physC)] || "";
      const cellTag = isHeader ? "TableHead" : "TableCell";
      const colSpanAttr = colspan > 1 ? ` colSpan={${colspan}}` : "";
      const rowSpanAttr = rowspan > 1 ? ` rowSpan={${rowspan}}` : "";
      // alignCls must go on an inner div, NOT on the td (display:flex on td breaks rowspan/colspan)
      const alignCls = cellAlign === "right" ? "flex flex-col items-end"
        : cellAlign === "center" ? "flex flex-col items-center"
        : "";
      const cellCls = [bgClass, borderClass, tableBorderClass].filter(Boolean).join(" ");
      const classAttr = cellCls ? ` className="${escapeAttr(cellCls)}"` : "";
      const stylePartsCell: string[] = [];
      const rawEffectiveWidth = (cellWidth && cellWidth !== "auto") ? cellWidth
        : (colWidth && colWidth !== "auto") ? colWidth
        : "";
      const effectiveWidth = normalizeCssSize(rawEffectiveWidth || undefined) || "";
      if (effectiveWidth) stylePartsCell.push(`width: "${effectiveWidth}"`);
      const normalizedCellHeight = normalizeCssSize(cellHeight || undefined);
      if (normalizedCellHeight && normalizedCellHeight !== "auto") stylePartsCell.push(`height: "${normalizedCellHeight}"`);
      const cellStyleAttr = stylePartsCell.length > 0 ? ` style={{ ${stylePartsCell.join(", ")} }}` : "";
      const slotChildren = slotNode
        ? (slotNode.nodes || []).map((childId) => renderNodeFn(childId, rowIndent + 3)).filter(Boolean)
        : [];
      if (slotChildren.length > 0) {
        lines.push(`${rowPad}  <${cellTag}${colSpanAttr}${rowSpanAttr}${classAttr}${cellStyleAttr}>`);
        if (alignCls) {
          lines.push(`${rowPad}    <div className="${alignCls}">`);
          for (const child of slotChildren) lines.push(child);
          lines.push(`${rowPad}    </div>`);
        } else {
          for (const child of slotChildren) lines.push(child);
        }
        lines.push(`${rowPad}  </${cellTag}>`);
      } else {
        lines.push(`${rowPad}  <${cellTag}${colSpanAttr}${rowSpanAttr}${classAttr}${cellStyleAttr} />`);
      }
    }
    lines.push(`${rowPad}</TableRow>`);
  }

  if (headerRowCount > 0) {
    lines.push(`${pad}  <TableHeader>`);
    for (let logR = 0; logR < headerRowCount; logR++) {
      renderRow(logR, indent + 2);
    }
    lines.push(`${pad}  </TableHeader>`);
  }

  const bodyRowCount = rowMap.length - headerRowCount;
  if (bodyRowCount > 0) {
    lines.push(`${pad}  <TableBody>`);
    for (let logR = headerRowCount; logR < rowMap.length; logR++) {
      renderRow(logR, indent + 2);
    }
    lines.push(`${pad}  </TableBody>`);
  }

  lines.push(`${pad}</Table>`);
  return lines.join("\n");
}

function renderNavigationMenu(
  node: CraftNodeData,
  craftState: CraftSerializedState,
  indent: number,
  renderNodeFn: (nodeId: string, indent: number) => string,
): string {
  const pad = "  ".repeat(indent);
  const items = ((node.props?.items as string) || "Getting Started,Components,Documentation")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const className = (node.props?.className as string) || "";
  const styleAttr = buildStyleAttr(node.props);
  const navCls = ["relative flex items-center", className].filter(Boolean).join(" ");

  const buttonBgClass = (node.props?.buttonBgClass as string) || "";
  const hoverBgClass = (node.props?.hoverBgClass as string) || "";
  const hoverTextClass = (node.props?.hoverTextClass as string) || "";
  const buttonBorderClass = (node.props?.buttonBorderClass as string) || "";
  const buttonBorderWidth = (node.props?.buttonBorderWidth as string) || "";
  const buttonShadowClass = (node.props?.buttonShadowClass as string) || "";
  const btnBwClass = buttonBorderWidth === "0" ? "border-0"
    : buttonBorderWidth === "2" ? "border-2"
    : buttonBorderWidth === "4" ? "border-4"
    : buttonBorderWidth === "8" ? "border-8"
    : buttonBorderWidth === "1" ? "border"
    : "";

  const btnCls = [
    "inline-flex h-9 w-max items-center justify-center gap-1 rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none",
    buttonBgClass || "bg-background",
    btnBwClass,
    buttonBorderClass,
    buttonShadowClass,
    hoverBgClass ? `hover:${hoverBgClass}` : "hover:bg-accent",
    hoverTextClass ? `hover:${hoverTextClass}` : "hover:text-accent-foreground",
  ].filter(Boolean).join(" ");

  const lines: string[] = [];
  lines.push(`${pad}<nav className="${escapeAttr(navCls)}"${styleAttr}>`);
  lines.push(`${pad}  <ul className="flex list-none items-center gap-1">`);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const slotId = node.linkedNodes?.[`menu_${i}`];
    const slotNode = slotId ? craftState[slotId] : null;
    const slotChildren = slotNode
      ? (slotNode.nodes || []).map((childId) => renderNodeFn(childId, indent + 5)).filter(Boolean)
      : [];

    lines.push(`${pad}    <li className="relative group">`);
    lines.push(`${pad}      <button className="${escapeAttr(btnCls)}">`);
    lines.push(`${pad}        ${escapeJsx(item)}`);
    lines.push(`${pad}        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1 h-3 w-3 opacity-50"><path d="m6 9 6 6 6-6" /></svg>`);
    lines.push(`${pad}      </button>`);
    if (slotChildren.length > 0) {
      lines.push(`${pad}      <div className="hidden group-hover:block absolute top-full left-0 mt-1 z-50 bg-popover border rounded-md shadow-md p-2">`);
      for (const child of slotChildren) lines.push(child);
      lines.push(`${pad}      </div>`);
    } else {
      lines.push(`${pad}      <div className="hidden group-hover:block absolute top-full left-0 mt-1 z-50 bg-popover border rounded-md shadow-md p-2 min-w-[160px] min-h-[60px]" />`);
    }
    lines.push(`${pad}    </li>`);
  }

  lines.push(`${pad}  </ul>`);
  lines.push(`${pad}</nav>`);

  return lines.join("\n");
}

interface MenuItemDef {
  type: "item" | "checkbox" | "separator";
  label?: string;
  shortcut?: string;
  checked?: boolean;
}

interface TopLevelMenuDef {
  label: string;
  items: MenuItemDef[];
}

function renderContextMenu(node: CraftNodeData, indent: number): string {
  const pad = "  ".repeat(indent);
  let menus: TopLevelMenuDef[] = [];
  try {
    const parsed = JSON.parse((node.props?.menuData as string) || "[]");
    if (Array.isArray(parsed)) menus = parsed as TopLevelMenuDef[];
  } catch {
    menus = [];
  }

  const className = (node.props?.className as string) || "";
  const styleAttr = buildStyleAttr(node.props);

  // Panel styling
  const panelBgClass = (node.props?.panelBgClass as string) || "";
  const panelTextClass = (node.props?.panelTextClass as string) || "";
  const panelBorderClass = (node.props?.panelBorderClass as string) || "";
  const panelBorderWidth = (node.props?.panelBorderWidth as string) || "";
  const panelShadowClass = (node.props?.panelShadowClass as string) || "";
  const shortcutTextClass = (node.props?.shortcutTextClass as string) || "";
  const shortcutCls = shortcutTextClass || "text-muted-foreground";

  const panelBwClass = panelBorderWidth === "0" ? "border-0"
    : panelBorderWidth === "2" ? "border-2"
    : panelBorderWidth === "4" ? "border-4"
    : panelBorderWidth === "8" ? "border-8"
    : panelBorderWidth === "1" ? "border" : "border";

  const panelCls = [
    "rounded-md p-1",
    panelBgClass || "bg-popover",
    panelBwClass,
    panelBorderClass,
    panelShadowClass || "shadow-md",
    panelTextClass,
    className,
  ].filter(Boolean).join(" ");

  // CraftContextMenu renders as a styled panel div containing menu items.
  // The panel applies all styling props (bg, border, shadow, width, height).
  // When used as contextMenuMocPath content, the developer places these items
  // inside their container's <ContextMenuContent>.
  const lines: string[] = [];
  lines.push(`${pad}<div className="${escapeAttr(panelCls)}"${styleAttr}>`);

  for (let sectionIdx = 0; sectionIdx < menus.length; sectionIdx++) {
    const menu = menus[sectionIdx];
    if (sectionIdx > 0) {
      lines.push(`${pad}  <ContextMenuSeparator />`);
    }
    if (menu.label) {
      lines.push(`${pad}  <ContextMenuLabel>${escapeJsx(menu.label)}</ContextMenuLabel>`);
    }
    for (const item of (menu.items || [])) {
      if (item.type === "separator") {
        lines.push(`${pad}  <ContextMenuSeparator />`);
      } else if (item.type === "checkbox") {
        const checkedAttr = item.checked ? " checked" : "";
        lines.push(`${pad}  <ContextMenuCheckboxItem${checkedAttr}>`);
        lines.push(`${pad}    ${escapeJsx(item.label || "")}`);
        if (item.shortcut) lines.push(`${pad}    <span className="ml-auto text-xs tracking-widest ${escapeAttr(shortcutCls)}">${escapeJsx(item.shortcut)}</span>`);
        lines.push(`${pad}  </ContextMenuCheckboxItem>`);
      } else {
        lines.push(`${pad}  <ContextMenuItem>`);
        lines.push(`${pad}    ${escapeJsx(item.label || "")}`);
        if (item.shortcut) lines.push(`${pad}    <span className="ml-auto text-xs tracking-widest ${escapeAttr(shortcutCls)}">${escapeJsx(item.shortcut)}</span>`);
        lines.push(`${pad}  </ContextMenuItem>`);
      }
    }
  }

  lines.push(`${pad}</div>`);
  return lines.join("\n");
}

function renderMenubar(node: CraftNodeData, indent: number): string {
  const pad = "  ".repeat(indent);
  let menus: TopLevelMenuDef[] = [];
  try {
    const parsed = JSON.parse((node.props?.menuData as string) || "[]");
    if (Array.isArray(parsed)) menus = parsed as TopLevelMenuDef[];
  } catch {
    menus = [];
  }
  const className = (node.props?.className as string) || "";
  const styleAttr = buildStyleAttr(node.props);
  const barCls = ["flex h-9 items-center space-x-1 rounded-md border bg-background p-1", className]
    .filter(Boolean).join(" ");

  // Button styling
  const buttonBgClass = (node.props?.buttonBgClass as string) || "";
  const buttonTextClass = (node.props?.buttonTextClass as string) || "";
  const buttonBorderClass = (node.props?.buttonBorderClass as string) || "";
  const buttonBorderWidth = (node.props?.buttonBorderWidth as string) || "";
  const buttonShadowClass = (node.props?.buttonShadowClass as string) || "";
  const hoverBgClass = (node.props?.hoverBgClass as string) || "";
  const hoverTextClass = (node.props?.hoverTextClass as string) || "";
  const btnBwClass = buttonBorderWidth === "0" ? "border-0"
    : buttonBorderWidth === "2" ? "border-2"
    : buttonBorderWidth === "4" ? "border-4"
    : buttonBorderWidth === "8" ? "border-8"
    : buttonBorderWidth === "1" ? "border" : "";
  const btnCls = [
    "flex cursor-default select-none items-center rounded-sm px-3 py-1 text-sm font-medium outline-none",
    buttonBgClass, buttonTextClass, btnBwClass, buttonBorderClass, buttonShadowClass,
    hoverBgClass ? `hover:${hoverBgClass}` : "hover:bg-accent",
    hoverTextClass ? `hover:${hoverTextClass}` : "hover:text-accent-foreground",
  ].filter(Boolean).join(" ");

  // Dropdown styling
  const dropdownBgClass = (node.props?.dropdownBgClass as string) || "";
  const dropdownTextClass = (node.props?.dropdownTextClass as string) || "";
  const dropdownBorderClass = (node.props?.dropdownBorderClass as string) || "";
  const dropdownBorderWidth = (node.props?.dropdownBorderWidth as string) || "";
  const dropdownShadowClass = (node.props?.dropdownShadowClass as string) || "";
  const shortcutTextClass = (node.props?.shortcutTextClass as string) || "";
  const dropBwClass = dropdownBorderWidth === "0" ? "border-0"
    : dropdownBorderWidth === "2" ? "border-2"
    : dropdownBorderWidth === "4" ? "border-4"
    : dropdownBorderWidth === "8" ? "border-8"
    : "border";
  const dropCls = [
    "hidden group-hover:block absolute top-full left-0 z-50 mt-1 min-w-[160px] rounded-md p-1",
    dropdownBgClass || "bg-popover",
    dropBwClass, dropdownBorderClass,
    dropdownShadowClass || "shadow-md",
    dropdownTextClass,
  ].filter(Boolean).join(" ");
  const shortcutCls = shortcutTextClass || "text-muted-foreground";

  const lines: string[] = [];
  lines.push(`${pad}<div className="${escapeAttr(barCls)}"${styleAttr}>`);

  for (const menu of menus) {
    lines.push(`${pad}  <div className="relative group">`);
    lines.push(`${pad}    <button type="button" className="${escapeAttr(btnCls)}">`);
    lines.push(`${pad}      ${escapeJsx(menu.label || "")}`);
    lines.push(`${pad}    </button>`);
    lines.push(`${pad}    <div className="${escapeAttr(dropCls)}">`);
    for (const item of (menu.items || [])) {
      if (item.type === "separator") {
        lines.push(`${pad}      <div className="my-1 h-px bg-border" />`);
      } else if (item.type === "checkbox") {
        lines.push(`${pad}      <div className="flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent">`);
        lines.push(`${pad}        <span className="mr-2 w-4 text-center text-xs">${item.checked ? "✓" : ""}</span>`);
        lines.push(`${pad}        <span className="flex-1">${escapeJsx(item.label || "")}</span>`);
        if (item.shortcut) lines.push(`${pad}        <span className="ml-auto text-xs tracking-widest ${escapeAttr(shortcutCls)}">${escapeJsx(item.shortcut)}</span>`);
        lines.push(`${pad}      </div>`);
      } else {
        lines.push(`${pad}      <div className="flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent">`);
        lines.push(`${pad}        <span className="flex-1">${escapeJsx(item.label || "")}</span>`);
        if (item.shortcut) lines.push(`${pad}        <span className="ml-auto text-xs tracking-widest ${escapeAttr(shortcutCls)}">${escapeJsx(item.shortcut)}</span>`);
        lines.push(`${pad}      </div>`);
      }
    }
    lines.push(`${pad}    </div>`);
    lines.push(`${pad}  </div>`);
  }

  lines.push(`${pad}</div>`);
  return lines.join("\n");
}

function renderTabs(
  node: CraftNodeData,
  craftState: CraftSerializedState,
  indent: number,
  renderNodeFn: (nodeId: string, indent: number) => string,
): string {
  const pad = "  ".repeat(indent);

  // Parse tabMeta
  let keys: number[] = [0, 1, 2];
  let labels: Record<string, string> = { "0": "Tab 1", "1": "Tab 2", "2": "Tab 3" };
  let icons: Record<string, string> = {};
  let tooltips: Record<string, string> = {};
  try {
    const meta = JSON.parse((node.props?.tabMeta as string) || "{}");
    if (Array.isArray(meta.keys)) keys = meta.keys;
    if (typeof meta.labels === "object" && meta.labels !== null) labels = meta.labels;
    if (typeof meta.icons === "object" && meta.icons !== null) icons = meta.icons;
    if (typeof meta.tooltips === "object" && meta.tooltips !== null) tooltips = meta.tooltips;
  } catch {
    // use defaults
  }

  const orientation = (node.props?.orientation as string) || "horizontal";
  const isVertical = orientation === "vertical";
  const tabListBgClass = (node.props?.tabListBgClass as string) || "";
  const tabActiveBgClass = (node.props?.tabActiveBgClass as string) || "";
  const contentBgClass = (node.props?.contentBgClass as string) || "";
  const outerBorderColor = (node.props?.outerBorderColor as string) || "";
  const contentBorderColor = (node.props?.contentBorderColor as string) || "";
  const outerShadow = (node.props?.outerShadow as string) || "";
  const contentShadow = (node.props?.contentShadow as string) || "";
  const userClassName = (node.props?.className as string) || "";

  const styleAttr = buildStyleAttr(node.props);

  // Build outer wrapper className
  const outerCls = [isVertical ? "flex flex-row" : "flex flex-col", outerBorderColor, outerShadow, userClassName]
    .filter(Boolean)
    .join(" ");
  const outerClassAttr = outerCls ? ` className="${escapeAttr(outerCls)}"` : "";

  // Build TabsList className
  const tabListBase = isVertical
    ? "flex flex-col items-stretch bg-muted p-1 rounded-md"
    : "inline-flex items-center bg-muted p-1 rounded-md w-full";
  const tabListCls = [tabListBase, tabListBgClass].filter(Boolean).join(" ");

  // Build TabsContent className
  const contentCls = [contentBgClass, contentBorderColor, contentShadow].filter(Boolean).join(" ");

  // Use first key as default active value
  const defaultValue = keys.length > 0 ? `tab-${keys[0]}` : "tab-0";

  const lines: string[] = [];
  const orientationAttr = isVertical ? ` orientation="vertical"` : "";
  lines.push(`${pad}<Tabs defaultValue="${defaultValue}"${orientationAttr}${outerClassAttr}${styleAttr}>`);
  lines.push(`${pad}  <TabsList className="${escapeAttr(tabListCls)}">`);

  for (const key of keys) {
    const label = labels[String(key)] ?? `Tab ${key}`;
    const icon = icons[String(key)] ?? "";
    const tooltip = tooltips[String(key)] ?? "";
    const iconJsx = icon ? `<${icon} className="h-4 w-4" /> ` : "";
    const triggerClassAttr = tabActiveBgClass
      ? ` className="${escapeAttr(`data-[state=active]:${tabActiveBgClass}`)}"`
      : "";
    if (tooltip) {
      lines.push(`${pad}    <TooltipProvider>`);
      lines.push(`${pad}      <Tooltip>`);
      lines.push(`${pad}        <TooltipTrigger asChild>`);
      lines.push(`${pad}          <TabsTrigger value="tab-${key}"${triggerClassAttr}>${iconJsx}${escapeJsx(label)}</TabsTrigger>`);
      lines.push(`${pad}        </TooltipTrigger>`);
      lines.push(`${pad}        <TooltipContent>`);
      lines.push(`${pad}          <p>${escapeJsx(tooltip)}</p>`);
      lines.push(`${pad}        </TooltipContent>`);
      lines.push(`${pad}      </Tooltip>`);
      lines.push(`${pad}    </TooltipProvider>`);
    } else {
      lines.push(`${pad}    <TabsTrigger value="tab-${key}"${triggerClassAttr}>${iconJsx}${escapeJsx(label)}</TabsTrigger>`);
    }
  }

  lines.push(`${pad}  </TabsList>`);

  for (const key of keys) {
    const slotId = node.linkedNodes?.[`tab_${key}`];
    const slotNode = slotId ? craftState[slotId] : null;
    const slotChildren = slotNode
      ? (slotNode.nodes || []).map((childId) => renderNodeFn(childId, indent + 3)).filter(Boolean)
      : [];

    const contentClassAttr = contentCls ? ` className="${escapeAttr(contentCls)}"` : "";
    if (slotChildren.length > 0) {
      lines.push(`${pad}  <TabsContent value="tab-${key}"${contentClassAttr}>`);
      for (const child of slotChildren) lines.push(child);
      lines.push(`${pad}  </TabsContent>`);
    } else {
      lines.push(`${pad}  <TabsContent value="tab-${key}"${contentClassAttr} />`);
    }
  }

  lines.push(`${pad}</Tabs>`);
  return lines.join("\n");
}

function renderResizable(
  node: CraftNodeData,
  craftState: CraftSerializedState,
  indent: number,
  renderNodeFn: (nodeId: string, indent: number) => string,
): string {
  const pad = "  ".repeat(indent);

  // Parse panelMeta
  let direction: "horizontal" | "vertical" = "horizontal";
  let panels: Array<{ key: number; size: number | string }> = [{ key: 0, size: 50 }, { key: 1, size: 50 }];
  try {
    const meta = JSON.parse((node.props?.panelMeta as string) || "{}");
    if (meta.direction === "vertical") direction = "vertical";
    if (Array.isArray(meta.panels)) panels = meta.panels;
  } catch {
    // use defaults
  }

  const withHandle = node.props?.withHandle !== false;
  const userClassName = (node.props?.className as string) || "";
  const borderColor = (node.props?.borderColor as string) || "";
  const separatorColor = (node.props?.separatorColor as string) || "";
  const separatorSize = (node.props?.separatorSize as string) || "4";
  const borderRadius = (node.props?.borderRadius as string) || "rounded-lg";
  const shadow = (node.props?.shadow as string) || "";

  // Outer wrapper: owns border/color/size/shadow
  const outerClasses = ["flex border overflow-hidden", borderRadius, borderColor, shadow, userClassName]
    .filter(Boolean).join(" ");
  const styleAttr = buildStyleAttr(node.props);

  const dirAttr = direction === "vertical" ? ` direction="vertical"` : ` direction="horizontal"`;
  const handleClassAttr = separatorColor ? ` className="${escapeAttr(separatorColor)}"` : "";
  const handleSizeStyleVal = direction === "vertical"
    ? `{{ height: '${separatorSize}px' }}`
    : `{{ width: '${separatorSize}px' }}`;
  const handleStyleAttr = ` style=${handleSizeStyleVal}`;

  const lines: string[] = [];
  lines.push(`${pad}<div className="${escapeAttr(outerClasses)}"${styleAttr}>`);
  lines.push(`${pad}  <ResizablePanelGroup${dirAttr} className="flex-1">`);

  panels.forEach((panel, idx) => {
    const slotId = node.linkedNodes?.[`panel_${panel.key}`];
    const slotNode = slotId ? craftState[slotId] : null;
    const slotChildren = slotNode
      ? (slotNode.nodes || []).map((childId) => renderNodeFn(childId, indent + 3)).filter(Boolean)
      : [];

    // Determine panel size rendering: absolute unit → style flex, numeric/% → defaultSize
    const isAbsolute = typeof panel.size === "string" && /\d+(px|rem|em|vw|vh)$/.test(panel.size.trim());
    const panelSizeAttr = isAbsolute
      ? ` style={{ flex: "0 0 ${panel.size}" }}`
      : ` defaultSize={${typeof panel.size === "string" ? parseFloat(panel.size) : panel.size}}`;

    if (slotChildren.length > 0) {
      lines.push(`${pad}    <ResizablePanel${panelSizeAttr}>`);
      for (const child of slotChildren) lines.push(child);
      lines.push(`${pad}    </ResizablePanel>`);
    } else {
      lines.push(`${pad}    <ResizablePanel${panelSizeAttr} />`);
    }

    if (idx < panels.length - 1) {
      lines.push(`${pad}    <ResizableHandle${withHandle ? " withHandle" : ""}${handleClassAttr}${handleStyleAttr} />`);
    }
  });

  lines.push(`${pad}  </ResizablePanelGroup>`);
  lines.push(`${pad}</div>`);
  return lines.join("\n");
}

function renderRadioGroup(
  props: Record<string, unknown>,
  tag: string,
  propsStr: string,
  classNameAttr: string,
  styleAttr: string,
  pad: string,
): string {
  const items = ((props?.items as string) || "Option A,Option B,Option C").split(",").map((s) => s.trim());
  const orientation = (props?.orientation as string) || "vertical";
  const variant = (props?.variant as string) || "default";
  const descriptionsRaw = (props?.descriptions as string) || "";
  const descList = descriptionsRaw ? descriptionsRaw.split(",").map((s) => s.trim()) : [];
  const cardBorderColor = (props?.cardBorderColor as string) || "";
  const cardBgColor = (props?.cardBgColor as string) || "";
  const descriptionColor = (props?.descriptionColor as string) || "";
  const isCard = variant === "card";

  // Build inline style strings for card and description
  const cardStyleParts: string[] = [];
  if (cardBorderColor) cardStyleParts.push(`borderColor: "${cardBorderColor}"`);
  if (cardBgColor) cardStyleParts.push(`backgroundColor: "${cardBgColor}"`);
  const cardStyleAttr = cardStyleParts.length > 0 ? ` style={{ ${cardStyleParts.join(", ")} }}` : "";
  const descStyleAttr = descriptionColor ? ` style={{ color: "${descriptionColor}" }}` : "";

  // Merge horizontal className into classNameAttr
  let finalClassNameAttr = classNameAttr;
  if (orientation === "horizontal") {
    // Extract existing className or create new one
    const existingMatch = classNameAttr.match(/className="([^"]*)"/);
    if (existingMatch) {
      finalClassNameAttr = ` className="${existingMatch[1]} flex flex-row gap-4"`;
    } else {
      finalClassNameAttr = ` className="flex flex-row gap-4"`;
    }
  }

  const lines: string[] = [];
  lines.push(`${pad}<${tag}${propsStr}${finalClassNameAttr}${styleAttr}>`);
  for (let i = 0; i < items.length; i++) {
    const label = items[i];
    const id = `r-${i + 1}`;
    const desc = descList[i] || "";
    const hasDesc = desc !== "";

    if (isCard) {
      const cardCls = "flex items-center gap-4 rounded-lg border p-4 cursor-pointer [&:has([data-state=checked])]:border-primary";
      lines.push(`${pad}  <label htmlFor="${id}" className="${cardCls}"${cardStyleAttr}>`);
      lines.push(`${pad}    <RadioGroupItem value="${escapeAttr(label)}" id="${id}" />`);
      if (hasDesc) {
        lines.push(`${pad}    <div className="grid gap-1.5 leading-none">`);
        lines.push(`${pad}      <span className="font-medium">${escapeJsx(label)}</span>`);
        lines.push(`${pad}      <p className="text-sm text-muted-foreground"${descStyleAttr}>${escapeJsx(desc)}</p>`);
        lines.push(`${pad}    </div>`);
      } else {
        lines.push(`${pad}    <span className="font-medium">${escapeJsx(label)}</span>`);
      }
      lines.push(`${pad}  </label>`);
    } else if (hasDesc) {
      lines.push(`${pad}  <div className="flex items-start space-x-2">`);
      lines.push(`${pad}    <RadioGroupItem value="${escapeAttr(label)}" id="${id}" />`);
      lines.push(`${pad}    <div className="grid gap-1.5 leading-none">`);
      lines.push(`${pad}      <Label htmlFor="${id}">${escapeJsx(label)}</Label>`);
      lines.push(`${pad}      <p className="text-sm text-muted-foreground"${descStyleAttr}>${escapeJsx(desc)}</p>`);
      lines.push(`${pad}    </div>`);
      lines.push(`${pad}  </div>`);
    } else {
      lines.push(`${pad}  <div className="flex items-center space-x-2">`);
      lines.push(`${pad}    <RadioGroupItem value="${escapeAttr(label)}" id="${id}" />`);
      lines.push(`${pad}    <Label htmlFor="${id}">${escapeJsx(label)}</Label>`);
      lines.push(`${pad}  </div>`);
    }
  }
  lines.push(`${pad}</${tag}>`);
  return lines.join("\n");
}

function renderToggleGroup(
  props: Record<string, unknown>,
  tag: string,
  propsStr: string,
  styleAttr: string,
  pad: string,
): string {
  const items = ((props?.items as string) || "Bold,Italic,Underline")
    .split(",").map((s) => s.trim()).filter(Boolean);
  const descriptionsRaw = (props?.descriptions as string) || "";
  const descList = descriptionsRaw ? descriptionsRaw.split(",").map((s) => s.trim()) : [];
  const cardBorderColor = (props?.cardBorderColor as string) || "";
  const cardBgColor = (props?.cardBgColor as string) || "";
  const descriptionColor = (props?.descriptionColor as string) || "";

  const gap = (props?.gap as string) || "1";
  const userClassName = (props?.className as string) || "";
  const gapClass = gap ? `gap-${gap}` : "";
  const combinedCls = [gapClass, userClassName].filter(Boolean).join(" ");
  const tgClassAttr = combinedCls ? ` className="${combinedCls}"` : "";

  const itemStyleParts: string[] = [];
  if (cardBorderColor) itemStyleParts.push(`borderColor: "${cardBorderColor}"`);
  if (cardBgColor) itemStyleParts.push(`backgroundColor: "${cardBgColor}"`);
  const itemStyleAttr = itemStyleParts.length > 0 ? ` style={{ ${itemStyleParts.join(", ")} }}` : "";
  const descStyleAttr = descriptionColor ? ` style={{ color: "${descriptionColor}" }}` : "";

  const lines: string[] = [];
  lines.push(`${pad}<ToggleGroup${propsStr}${tgClassAttr}${styleAttr}>`);

  for (let i = 0; i < items.length; i++) {
    const label = items[i];
    const desc = descList[i] || "";

    if (desc) {
      lines.push(`${pad}  <ToggleGroupItem value="${escapeAttr(label)}"${itemStyleAttr}>`);
      lines.push(`${pad}    <div className="flex flex-col items-center gap-0.5">`);
      lines.push(`${pad}      <span>${escapeJsx(label)}</span>`);
      lines.push(`${pad}      <span className="text-xs text-muted-foreground"${descStyleAttr}>${escapeJsx(desc)}</span>`);
      lines.push(`${pad}    </div>`);
      lines.push(`${pad}  </ToggleGroupItem>`);
    } else if (itemStyleAttr) {
      lines.push(`${pad}  <ToggleGroupItem value="${escapeAttr(label)}"${itemStyleAttr}>${escapeJsx(label)}</ToggleGroupItem>`);
    } else {
      lines.push(`${pad}  <ToggleGroupItem value="${escapeAttr(label)}">${escapeJsx(label)}</ToggleGroupItem>`);
    }
  }

  lines.push(`${pad}</ToggleGroup>`);
  return lines.join("\n");
}

function renderSelect(
  props: Record<string, unknown>,
  tag: string,
  propsStr: string,
  classNameAttr: string,
  styleAttr: string,
  pad: string,
): string {
  const items = ((props?.items as string) || "Option 1,Option 2,Option 3").split(",").map((s) => s.trim());
  const placeholder = (props?.placeholder as string) || "Select an option";
  const tooltipText = props?.tooltipText as string | undefined;
  const tooltipSide = props?.tooltipSide as string | undefined;
  const sideAttr = tooltipSide ? ` side="${tooltipSide}"` : "";

  const lines: string[] = [];
  lines.push(`${pad}<${tag}>`);
  if (tooltipText) {
    lines.push(`${pad}  <TooltipProvider>`);
    lines.push(`${pad}    <Tooltip>`);
    lines.push(`${pad}      <TooltipTrigger asChild>`);
    lines.push(`${pad}        <SelectTrigger${classNameAttr}${styleAttr}>`);
    lines.push(`${pad}          <SelectValue placeholder="${escapeAttr(placeholder)}" />`);
    lines.push(`${pad}        </SelectTrigger>`);
    lines.push(`${pad}      </TooltipTrigger>`);
    lines.push(`${pad}      <TooltipContent${sideAttr}>`);
    lines.push(`${pad}        <p>${escapeJsx(tooltipText)}</p>`);
    lines.push(`${pad}      </TooltipContent>`);
    lines.push(`${pad}    </Tooltip>`);
    lines.push(`${pad}  </TooltipProvider>`);
  } else {
    lines.push(`${pad}  <SelectTrigger${classNameAttr}${styleAttr}>`);
    lines.push(`${pad}    <SelectValue placeholder="${escapeAttr(placeholder)}" />`);
    lines.push(`${pad}  </SelectTrigger>`);
  }
  lines.push(`${pad}  <SelectContent>`);
  for (const item of items) {
    lines.push(`${pad}    <SelectItem value="${escapeAttr(item)}">${escapeJsx(item)}</SelectItem>`);
  }
  lines.push(`${pad}  </SelectContent>`);
  lines.push(`${pad}</${tag}>`);
  return lines.join("\n");
}

function renderCombobox(
  props: Record<string, unknown>,
  styleAttr: string,
  pad: string,
): string {
  const items = ((props?.items as string) || "Apple,Banana,Cherry").split(",").map((s) => s.trim());
  const placeholder = (props?.placeholder as string) || "Select an option...";
  const linkedMocPath = (props?.linkedMocPath as string) || "";

  const lines: string[] = [];
  lines.push(`${pad}<Popover>`);
  lines.push(`${pad}  <PopoverTrigger asChild>`);
  lines.push(`${pad}    <Button variant="outline" role="combobox" className="w-full justify-between"${styleAttr}>`);
  lines.push(`${pad}      ${escapeJsx(placeholder)}`);
  lines.push(`${pad}      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />`);
  lines.push(`${pad}    </Button>`);
  lines.push(`${pad}  </PopoverTrigger>`);
  lines.push(`${pad}  <PopoverContent className="p-0">`);
  lines.push(`${pad}    <Command>`);
  lines.push(`${pad}      <CommandInput placeholder="Search..." />`);
  lines.push(`${pad}      <CommandList>`);
  lines.push(`${pad}        <CommandEmpty>No results found.</CommandEmpty>`);
  lines.push(`${pad}        <CommandGroup>`);
  if (linkedMocPath) {
    lines.push(`${pad}          {/* linked: ${escapeJsx(linkedMocPath)} */}`);
  } else {
    for (const item of items) {
      lines.push(`${pad}          <CommandItem value="${escapeAttr(item)}">`);
      lines.push(`${pad}            <Check className="mr-2 h-4 w-4 opacity-0" />`);
      lines.push(`${pad}            ${escapeJsx(item)}`);
      lines.push(`${pad}          </CommandItem>`);
    }
  }
  lines.push(`${pad}        </CommandGroup>`);
  lines.push(`${pad}      </CommandList>`);
  lines.push(`${pad}    </Command>`);
  lines.push(`${pad}  </PopoverContent>`);
  lines.push(`${pad}</Popover>`);
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
