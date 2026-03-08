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
  SlideContentSlot: {
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
    tag: "nav",
    propsMap: ["className"],
    isContainer: false,
  },
  CraftDatePicker: {
    tag: "div",
    propsMap: ["className"],
    isContainer: false,
  },
  CraftDataTable: {
    tag: "div",
    propsMap: ["className"],
    isContainer: false,
  },
  DataTableSlot: {
    tag: "div",
    propsMap: [],
    isContainer: true,
  },
  CraftProgress: {
    tag: "Progress",
    importFrom: "@/components/ui/progress",
    importName: "Progress",
    propsMap: ["value", "className", "indicatorClass"],
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
  CraftButtonGroup: {
    tag: "ButtonGroup",
    importFrom: "@/components/ui/button-group",
    importName: "ButtonGroup",
    propsMap: ["orientation", "variant", "size", "className"],
    isContainer: false,
  },
  CraftDropdownMenu: {
    tag: "div",
    propsMap: [],
    isContainer: false,
  },
  CraftContextMenu: {
    tag: "div",
    propsMap: ["className"],
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
  CraftSidebar: {
    tag: "nav",
    propsMap: [],
    isContainer: false,
  },
  SidebarHeaderSlot: {
    tag: "div",
    propsMap: [],
    isContainer: true,
  },
  SidebarFooterSlot: {
    tag: "div",
    propsMap: [],
    isContainer: true,
  },
  SidebarInsetSlot: {
    tag: "div",
    propsMap: [],
    isContainer: true,
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
  // Typography: special rendering (no shadcn import needed)
  CraftTypography: {
    tag: "p",
    propsMap: [],
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
  "dropdown-menu": { from: "@/components/ui/dropdown-menu", names: ["DropdownMenu", "DropdownMenuTrigger", "DropdownMenuContent", "DropdownMenuItem", "DropdownMenuCheckboxItem", "DropdownMenuSeparator", "DropdownMenuLabel", "DropdownMenuShortcut"] },
  "hover-card": { from: "@/components/ui/hover-card", names: ["HoverCard", "HoverCardTrigger", "HoverCardContent"] },
};

const TOOLTIP_IMPORT = { from: "@/components/ui/tooltip", names: ["TooltipProvider", "Tooltip", "TooltipTrigger", "TooltipContent"] };

const CONTEXT_MENU_IMPORT = { from: "@/components/ui/context-menu", names: ["ContextMenu", "ContextMenuTrigger", "ContextMenuContent", "ContextMenuItem", "ContextMenuCheckboxItem", "ContextMenuSeparator", "ContextMenuLabel"] };

const PAGINATION_IMPORT = {
  from: "@/components/ui/pagination",
  names: ["Pagination", "PaginationContent", "PaginationItem", "PaginationLink", "PaginationPrevious", "PaginationNext"],
};

const DATE_PICKER_IMPORT = {
  from: "@/components/ui/date-picker",
  names: ["DatePicker"],
};

const DATA_TABLE_IMPORT = {
  from: "@/components/ui/data-table",
  names: ["DataTable"],
};

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

/** Default DropdownMenu data (matches DEFAULT_DROPDOWN_DATA in CraftDropdownMenu.tsx) */
const DEFAULT_DROPDOWN_DATA_STR = JSON.stringify([
  { label: "", items: [{ type: "item", label: "Profile" }, { type: "item", label: "Settings" }, { type: "separator" }, { type: "checkbox", label: "Notifications", checked: false }, { type: "separator" }, { type: "item", label: "Log out" }] },
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
  CraftBreadcrumb: { items: "Home,Products,Current", maxVisible: "0" },
  CraftCheckbox: { label: "Accept terms", checked: false, disabled: false, tooltipText: "", tooltipSide: "" },
  CraftCollapsible: { open: false, triggerStyle: "chevron", linkedMocPath: "" },
  CraftPagination: { totalPages: 5, currentPage: 1 },
  CraftProgress: { value: 50, indicatorClass: "" },
  CraftRadioGroup: { items: "Option A,Option B,Option C", value: "Option A", orientation: "vertical", variant: "default", descriptions: "", cardBorderColor: "", cardBgColor: "", descriptionColor: "", tooltipText: "", tooltipSide: "" },
  CraftScrollArea: {},
  CraftSlider: { value: 50, min: 0, max: 100, step: 1, fillClassName: "", trackClassName: "", tooltipText: "", tooltipSide: "" },
  CraftSwitch: { label: "Toggle", checked: false, disabled: false, description: "", invalid: false, size: "default", variant: "default", checkedClassName: "", uncheckedClassName: "", cardBorderColor: "", cardBgColor: "", descriptionColor: "", labelColor: "", tooltipText: "", tooltipSide: "" },
  CraftTabs: { items: "Tab 1,Tab 2,Tab 3" },
  CraftTextarea: { disabled: false, tooltipText: "", tooltipSide: "", tooltipTrigger: "hover" },
  CraftToggle: { text: "Toggle", variant: "default", pressed: false, size: "default", disabled: false, icon: "", tooltipText: "", tooltipSide: "" },
  CraftToggleGroup: { items: "Bold,Italic,Underline", type: "single", variant: "default", size: "default", disabled: false, gap: "1", orientation: "horizontal", tooltipText: "", tooltipSide: "", descriptions: "", cardBorderColor: "", cardBgColor: "", descriptionColor: "" },
  // Phase 2
  CraftSelect: { items: "Option 1,Option 2,Option 3", placeholder: "Select an option", tooltipText: "", tooltipSide: "", contentWidth: "" },
  CraftCalendar: { todayBgClass: "", todayTextClass: "" },
  CraftDatePicker: { mode: "date", dateFormat: "yyyy/MM/dd", placeholder: "日付を選択...", editable: false, disabled: false,
    calendarBorderClass: "", calendarShadowClass: "", todayBgClass: "", todayTextClass: "", todayBorderClass: "", todayShadowClass: "",
    selectedBgClass: "", selectedTextClass: "", selectedBorderClass: "", selectedShadowClass: "", buttonBgClass: "", hoverBgClass: "" },
  CraftDataTable: { filterType: "none", pageable: false, pageSize: "10", selectable: false, columnToggle: false, stickyHeader: false, pinnedLeft: "0",
    headerBgClass: "", hoverRowClass: "", selectedRowClass: "", headerTextClass: "", headerHoverTextClass: "", headerBorderClass: "", tableBorderClass: "" },
  CraftResizable: { panelMeta: '{"direction":"horizontal","nextKey":2,"panels":[{"key":0,"size":50},{"key":1,"size":50}]}', withHandle: true },
  CraftCarousel: { slideMeta: '{"keys":[0,1,2],"nextKey":3,"labels":{"0":"Slide 1","1":"Slide 2","2":"Slide 3"}}', loop: false, showArrows: true },
  CraftButtonGroup: { orientation: "horizontal", variant: "outline", size: "default", tooltipText: "", tooltipSide: "", tooltipTrigger: "hover", hoverCardMocPath: "", hoverCardSide: "bottom", hoverCardTrigger: "hover", contextMenuMocPath: "" },
  CraftDropdownMenu: { triggerText: "Open Menu", menuData: DEFAULT_DROPDOWN_DATA_STR },
  CraftContextMenu: { menuData: DEFAULT_CONTEXTMENU_DATA_STR },
  CraftHoverCard: { triggerText: "Hover me", linkedMocPath: "", cardBorderRadius: "rounded-md" },
  CraftNavigationMenu: {},
  CraftMenubar: { menuData: DEFAULT_MENUBAR_DATA_STR },
  CraftCommand: { placeholder: "Type a command or search...", items: "Calendar,Search,Settings", linkedMocPath: "" },
  CraftCombobox: { placeholder: "Select an option...", items: "Apple,Banana,Cherry", linkedMocPath: "", tooltipText: "", tooltipSide: "", tooltipTrigger: "hover", contentWidth: "" },
  CraftTooltip: { triggerText: "Hover", text: "Tooltip text" },
  CraftTypography: { variant: "h1", text: "Heading 1", items: "List item 1,List item 2,List item 3" },
  CraftSidebar: {
    sidebarData: JSON.stringify({
      items: [
        { key: 0, type: "group-label", label: "Main" },
        { key: 1, type: "item", label: "Dashboard", icon: "LayoutDashboard", active: true },
        { key: 2, type: "item", label: "Inbox", icon: "Inbox", badge: "5", badgeBgClass: "bg-primary", badgeTextClass: "text-primary-foreground" },
        { key: 3, type: "item", label: "Settings", icon: "Settings" },
        { key: 4, type: "separator" },
        { key: 5, type: "group-label", label: "Other" },
        { key: 6, type: "item", label: "Help", icon: "HelpCircle" },
      ],
      nextKey: 7,
    }),
    side: "left",
    collapsible: "icon",
    sidebarWidth: "240px",
  },
};

export function craftStateToTsx(
  craftState: CraftSerializedState,
  componentName = "MockPage",
  memos?: MocEditorMemo[],
): { imports: string; tsxSource: string } {
  try {
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

    // Collect breadcrumb sub-component imports
    if (resolvedName === "CraftBreadcrumb") {
      addImport("@/components/ui/breadcrumb", "BreadcrumbList");
      addImport("@/components/ui/breadcrumb", "BreadcrumbItem");
      addImport("@/components/ui/breadcrumb", "BreadcrumbLink");
      addImport("@/components/ui/breadcrumb", "BreadcrumbPage");
      addImport("@/components/ui/breadcrumb", "BreadcrumbSeparator");
      addImport("@/components/ui/breadcrumb", "BreadcrumbEllipsis");
      addImport("@/components/ui/dropdown-menu", "DropdownMenu");
      addImport("@/components/ui/dropdown-menu", "DropdownMenuTrigger");
      addImport("@/components/ui/dropdown-menu", "DropdownMenuContent");
      addImport("@/components/ui/dropdown-menu", "DropdownMenuItem");
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

    // Collect command sub-component imports
    if (resolvedName === "CraftCommand") {
      addImport("@/components/ui/command", "Command");
      addImport("@/components/ui/command", "CommandEmpty");
      addImport("@/components/ui/command", "CommandGroup");
      addImport("@/components/ui/command", "CommandInput");
      addImport("@/components/ui/command", "CommandItem");
      addImport("@/components/ui/command", "CommandList");
      addImport("@/components/ui/command", "CommandSeparator");
      addImport("lucide-react", "Search");
      // Collect icons from commandData
      try {
        const defs = JSON.parse((node.props?.commandData as string) || "[]");
        function collectIcons(arr: unknown[]): void {
          for (const def of arr) {
            const d = def as Record<string, unknown>;
            if (d.type === "item" && typeof d.icon === "string" && d.icon) {
              addImport("lucide-react", d.icon);
            }
            if (d.type === "group" && Array.isArray(d.items)) {
              collectIcons(d.items as unknown[]);
            }
          }
        }
        if (Array.isArray(defs)) collectIcons(defs);
      } catch {
        // ignore
      }
    }

    // Collect combobox sub-component imports
    if (resolvedName === "CraftCombobox") {
      addImport("@/components/ui/popover", "Popover");
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

    // Collect imports for CraftButtonGroup buttonData
    if (resolvedName === "CraftButtonGroup") {
      addImport("@/components/ui/button", "Button");
      try {
        const btns = JSON.parse((node.props?.buttonData as string) || "[]") as Array<Record<string, unknown>>;
        for (const btn of btns) {
          const ot = btn.overlayType as string | undefined;
          if (ot && ot !== "none") {
            const oi = OVERLAY_IMPORTS[ot];
            if (oi) for (const n of oi.names) addImport(oi.from, n);
          }
          if (btn.toastText) addImport("sonner", "toast");
        }
      } catch { /* ignore */ }
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

    // Collect hover-card imports for containers with hoverCardMocPath
    const hoverCardMocPathProp = node.props?.hoverCardMocPath as string | undefined;
    if (hoverCardMocPathProp) {
      const hcImport = OVERLAY_IMPORTS["hover-card"];
      for (const name of hcImport.names) {
        addImport(hcImport.from, name);
      }
    }

    // CraftContextMenu: exports <ContextMenuContent> + item-level components
    if (resolvedName === "CraftContextMenu") {
      for (const name of ["ContextMenuContent", "ContextMenuItem", "ContextMenuCheckboxItem", "ContextMenuSeparator", "ContextMenuLabel"]) {
        addImport(CONTEXT_MENU_IMPORT.from, name);
      }
      return;
    }

    // CraftDropdownMenu: full dropdown-menu structure
    if (resolvedName === "CraftDropdownMenu") {
      for (const name of OVERLAY_IMPORTS["dropdown-menu"].names) {
        addImport(OVERLAY_IMPORTS["dropdown-menu"].from, name);
      }
      return;
    }

    // CraftHoverCard: add hover-card imports when linkedMocPath is set
    if (resolvedName === "CraftHoverCard") {
      const linkedMocPath = node.props?.linkedMocPath as string | undefined;
      if (linkedMocPath) {
        const hcImport = OVERLAY_IMPORTS["hover-card"];
        for (const name of hcImport.names) {
          addImport(hcImport.from, name);
        }
      }
      return;
    }

    // CraftPagination: add pagination sub-component imports
    if (resolvedName === "CraftPagination") {
      for (const name of PAGINATION_IMPORT.names) {
        addImport(PAGINATION_IMPORT.from, name);
      }
      return;
    }

    // CraftDatePicker: add date-picker import
    if (resolvedName === "CraftDatePicker") {
      addImport(DATE_PICKER_IMPORT.from, "DatePicker");
      return;
    }

    // CraftDataTable: add data-table import and traverse slot linkedNodes
    if (resolvedName === "CraftDataTable") {
      addImport(DATA_TABLE_IMPORT.from, "DataTable");
      for (const linkedId of Object.values(node.linkedNodes || {})) {
        collectImports(linkedId);
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

    // CraftCarousel: add carousel sub-component imports and traverse linkedNodes
    if (resolvedName === "CraftCarousel") {
      addImport("@/components/ui/carousel", "CarouselContent");
      addImport("@/components/ui/carousel", "CarouselItem");
      addImport("@/components/ui/carousel", "CarouselPrevious");
      addImport("@/components/ui/carousel", "CarouselNext");
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

    // CraftSidebar: collect icon imports from sidebarData and traverse linkedNodes
    if (resolvedName === "CraftSidebar") {
      try {
        const meta = JSON.parse((node.props?.sidebarData as string) || "{}");
        if (Array.isArray(meta.items)) {
          function collectSidebarIcons(items: SidebarNavItemDef[]) {
            for (const item of items) {
              if (item.type === "item" && typeof item.icon === "string" && item.icon) {
                addImport("lucide-react", item.icon);
              }
              if (item.children) collectSidebarIcons(item.children);
            }
          }
          collectSidebarIcons(meta.items as SidebarNavItemDef[]);
        }
      } catch {
        // ignore parse errors
      }
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
      `${pad}      <p className="whitespace-pre-wrap">${tooltipText.includes("<kbd>") ? kbdTextToJsx(tooltipText) : tooltipText.includes("\n") ? `{"${escapeJsString(tooltipText)}"}` : escapeJsx(tooltipText)}</p>`,
      `${pad}    </TooltipContent>`,
      `${pad}  </Tooltip>`,
      `${pad}</TooltipProvider>`,
    ].join("\n");
  }

  // wrapWithOverlay は module scope に移動 (renderButtonGroup からも呼び出し可能)

  /** Wrap rendered container with context menu if contextMenuMocPath is set */
  function wrapWithContextMenu(rendered: string, props: Record<string, unknown>, pad: string): string {
    const contextMenuMocPath = props?.contextMenuMocPath as string | undefined;
    if (!contextMenuMocPath) return rendered;

    // The linked .moc (CraftContextMenu) exports <ContextMenuContent> itself,
    // so we place the linked placeholder directly at the ContextMenu level.
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
  function wrapWithHoverCard(rendered: string, props: Record<string, unknown>, pad: string): string {
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

  function renderNode(nodeId: string, indent: number): string {
    const node = craftState[nodeId];
    if (!node) return "";

    const resolvedName = getResolvedName(node);
    const mapping = COMPONENT_MAP[resolvedName];
    const pad = "  ".repeat(indent);

    // Common interaction wrappers applied to all components
    const tooltipTrigger = (node.props?.tooltipTrigger as string) || "hover";
    const hoverCardMocPath = node.props?.hoverCardMocPath as string | undefined;
    const applyCommonWrappers = (s: string): string => {
      let r = wrapWithContextMenu(s, node.props, pad);
      r = wrapWithHoverCard(r, node.props, pad);
      // HoverCard が設定されている場合は Tooltip をスキップ（HoverCard 優先）
      if (!hoverCardMocPath) {
        r = wrapWithTooltip(r, node.props, pad, tooltipTrigger);
      }
      return r;
    };

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
    const combinedClassName = mergeContainerClasses(containerClass, userClassName);
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
        const escapedTitle = title.includes("<kbd>") ? kbdTextToJsx(title) : title.includes("\n") ? `{"${escapeJsString(title)}"}` : escapeJsx(title);
        const escapedDesc = desc.includes("<kbd>") ? kbdTextToJsx(desc) : desc.includes("\n") ? `{"${escapeJsString(desc)}"}` : escapeJsx(desc);
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
      return applyCommonWrappers(rendered);
    }

    // Alert special case: render with icon, title, description
    if (resolvedName === "CraftAlert") {
      const title = (node.props?.title as string) || "";
      const desc = (node.props?.description as string) || "";
      const icon = (node.props?.icon as string) || "AlertCircle";
      const alertBody: string[] = [];
      alertBody.push(`${pad}  <${icon} className="h-4 w-4" />`);
      if (title) {
        const escapedTitle = title.includes("<kbd>") ? kbdTextToJsx(title) : title.includes("\n") ? `{"${escapeJsString(title)}"}` : escapeJsx(title);
        alertBody.push(`${pad}  <h5 className="mb-1 font-medium leading-none tracking-tight whitespace-pre-line">${escapedTitle}</h5>`);
      }
      if (desc) {
        const escapedDesc = desc.includes("<kbd>") ? kbdTextToJsx(desc) : desc.includes("\n") ? `{"${escapeJsString(desc)}"}` : escapeJsx(desc);
        alertBody.push(`${pad}  <div className="text-sm [&_p]:leading-relaxed whitespace-pre-line">${escapedDesc}</div>`);
      }
      rendered = `${mocComments}\n${pad}<${tag}${propsStr}${classNameAttr}${styleAttr}>\n${alertBody.join("\n")}\n${pad}</${tag}>`;
      return applyCommonWrappers(rendered);
    }

    // Typography special case: render as plain HTML tag with Tailwind classes
    if (resolvedName === "CraftTypography") {
      return applyCommonWrappers(`${mocComments}\n${renderTypography(node.props, classNameAttr, styleAttr, pad)}`);
    }

    // Accordion special case: render with AccordionItem/Trigger/Content
    if (resolvedName === "CraftAccordion") {
      return applyCommonWrappers(`${mocComments}\n${renderAccordion(node.props, tag, propsStr, classNameAttr, styleAttr, pad)}`);
    }

    // Breadcrumb special case: render with BreadcrumbList/Item/Link/Page/Separator/Ellipsis
    if (resolvedName === "CraftBreadcrumb") {
      return applyCommonWrappers(`${mocComments}\n${renderBreadcrumb(node.props, classNameAttr, styleAttr, pad)}`);
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
      return applyCommonWrappers(`${mocComments}\n${lines.join("\n")}`);
    }

    // Select special case: render with SelectTrigger/Content/Item
    if (resolvedName === "CraftSelect") {
      rendered = `${mocComments}\n${renderSelect(node.props, tag, propsStr, classNameAttr, styleAttr, pad)}`;
      return applyCommonWrappers(rendered);
    }

    // Command special case
    if (resolvedName === "CraftCommand") {
      rendered = `${mocComments}\n${renderCommand(node.props, classNameAttr, styleAttr, pad)}`;
      return applyCommonWrappers(rendered);
    }

    // Combobox special case: render with Popover + Command structure
    if (resolvedName === "CraftCombobox") {
      rendered = `${mocComments}\n${renderCombobox(node.props, classNameAttr, styleAttr, pad)}`;
      return applyCommonWrappers(rendered);
    }

    // RadioGroup special case: render with RadioGroupItem + Label
    if (resolvedName === "CraftRadioGroup") {
      rendered = `${mocComments}\n${renderRadioGroup(node.props, tag, propsStr, classNameAttr, styleAttr, pad)}`;
      return applyCommonWrappers(rendered);
    }

    // Tabs special case: render as LinkedNodes tabs
    if (resolvedName === "CraftTabs") {
      return applyCommonWrappers(`${mocComments}\n${renderTabs(node, craftState, indent, renderNode)}`);
    }

    // Carousel special case: render as LinkedNodes carousel
    if (resolvedName === "CraftCarousel") {
      return applyCommonWrappers(`${mocComments}\n${renderCarousel(node, craftState, indent, renderNode)}`);
    }

    // NavigationMenu special case: render nav bar with hover dropdown slots
    if (resolvedName === "CraftNavigationMenu") {
      return applyCommonWrappers(`${mocComments}\n${renderNavigationMenu(node, craftState, indent, renderNode)}`);
    }

    // Menubar special case: render from JSON menuData
    if (resolvedName === "CraftMenubar") {
      return applyCommonWrappers(`${mocComments}\n${renderMenubar(node, indent)}`);
    }

    // Sidebar special case: render sidebar layout with linked slots
    if (resolvedName === "CraftSidebar") {
      return applyCommonWrappers(`${mocComments}\n${renderSidebar(node, craftState, indent, renderNode)}`);
    }

    // ContextMenu special case: render from JSON menuData (applyCommonWrappers 対象外)
    if (resolvedName === "CraftContextMenu") {
      return `${mocComments}\n${renderContextMenu(node, indent)}`;
    }

    // DropdownMenu special case: render from JSON menuData
    if (resolvedName === "CraftDropdownMenu") {
      return applyCommonWrappers(`${mocComments}\n${renderDropdownMenu(node, indent)}`);
    }

    // HoverCard special case: wrap trigger span with HoverCard if linkedMocPath is set
    if (resolvedName === "CraftHoverCard") {
      const linkedMocPath = node.props?.linkedMocPath as string | undefined;
      if (linkedMocPath) {
        const triggerText = (node.props?.triggerText as string) || "Hover me";
        const side = (node.props?.hoverCardSide as string) || "bottom";
        const userCls = (node.props?.className as string) || "";
        const triggerCls = ["text-sm font-medium underline underline-offset-4 cursor-pointer", userCls].filter(Boolean).join(" ");
        const triggerSpan = `${pad}  <span className="${triggerCls}"${styleAttr}>${escapeJsx(triggerText)}</span>`;
        const contentComment = `{/* linked: ${escapeJsx(linkedMocPath)} */}`;
        const hoverCardTsx = [
          `${pad}<HoverCard>`,
          `${pad}  <HoverCardTrigger asChild>`,
          triggerSpan,
          `${pad}  </HoverCardTrigger>`,
          `${pad}  <HoverCardContent side="${side}">`,
          `${pad}    ${contentComment}`,
          `${pad}  </HoverCardContent>`,
          `${pad}</HoverCard>`,
        ].join("\n");
        return applyCommonWrappers(`${mocComments}\n${hoverCardTsx}`);
      }
    }

    // Pagination special case: render full pagination structure
    if (resolvedName === "CraftPagination") {
      return applyCommonWrappers(`${mocComments}\n${renderPagination(node, indent)}`);
    }

    // DatePicker special case
    if (resolvedName === "CraftDatePicker") {
      return applyCommonWrappers(`${mocComments}\n${renderDatePicker(node, indent)}`);
    }

    // DataTable special case
    if (resolvedName === "CraftDataTable") {
      return applyCommonWrappers(`${mocComments}\n${renderDataTable(node, craftState, indent, renderNode)}`);
    }

    // Table special case: render as LinkedNodes table
    if (resolvedName === "CraftTable") {
      return applyCommonWrappers(`${mocComments}\n${renderTable(node, craftState, indent, renderNode)}`);
    }

    // Resizable special case: render as LinkedNodes resizable panels
    if (resolvedName === "CraftResizable") {
      return applyCommonWrappers(`${mocComments}\n${renderResizable(node, craftState, indent, renderNode)}`);
    }

    // CraftContainer with linkedMocPath: render as div with linked comment (no children)
    if (resolvedName === "CraftContainer") {
      const linkedMocPath = (node.props?.linkedMocPath as string) || "";
      if (linkedMocPath) {
        rendered = `${mocComments}\n${pad}<div${classNameAttr}${styleAttr}>\n${pad}  {/* linked: ${escapeJsx(linkedMocPath)} */}\n${pad}</div>`;
        return applyCommonWrappers(rendered);
      }
    }

    // ToggleGroup special case: render items as ToggleGroupItem children
    if (resolvedName === "CraftToggleGroup") {
      rendered = `${mocComments}\n${renderToggleGroup(node.props, tag, propsStr, styleAttr, pad)}`;
      return applyCommonWrappers(rendered);
    }

    // ButtonGroup special case: render buttons from buttonData JSON
    if (resolvedName === "CraftButtonGroup") {
      return applyCommonWrappers(`${mocComments}\n${renderButtonGroup(node.props, propsStr, styleAttr, pad)}`);
    }

    // Self-closing for img
    if (resolvedName === "CraftImage" || resolvedName === "CraftPlaceholderImage") {
      return applyCommonWrappers(`${mocComments}\n${pad}<${tag}${propsStr}${classNameAttr}${styleAttr} />`);
    }

    // Self-closing for Separator
    if (resolvedName === "CraftSeparator") {
      return applyCommonWrappers(`${mocComments}\n${pad}<${tag}${propsStr}${classNameAttr}${styleAttr} />`);
    }

    // Self-closing for Input
    if (resolvedName === "CraftInput") {
      rendered = `${mocComments}\n${pad}<${tag}${propsStr}${classNameAttr}${styleAttr} />`;
      return applyCommonWrappers(rendered);
    }

    // Self-closing for Textarea
    if (resolvedName === "CraftTextarea") {
      rendered = `${mocComments}\n${pad}<${tag}${propsStr}${classNameAttr}${styleAttr} />`;
      return applyCommonWrappers(rendered);
    }

    // Self-closing for Progress, Slider
    if (resolvedName === "CraftProgress" || resolvedName === "CraftSlider") {
      return applyCommonWrappers(`${mocComments}\n${pad}<${tag}${propsStr}${classNameAttr}${styleAttr} />`);
    }

    // Container with children
    if (mapping.isContainer && children.length > 0) {
      const renderedChildren = children
        .map((id) => renderNode(id, indent + 1))
        .filter(Boolean);
      rendered = `${mocComments}\n${pad}<${tag}${propsStr}${classNameAttr}${styleAttr}>\n${renderedChildren.join("\n")}\n${pad}</${tag}>`;
      return applyCommonWrappers(rendered);
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
      return applyCommonWrappers(rendered);
    }

    // Text content
    if (textContent) {
      const escapedTextContent = textContent.includes("<kbd>")
        ? kbdTextToJsx(textContent)
        : textContent.includes("\n")
          ? `{"${escapeJsString(textContent)}"}`
          : escapeJsx(textContent);
      rendered = `${mocComments}\n${pad}<${tag}${propsStr}${classNameAttr}${toastOnClick}${styleAttr}>${escapedTextContent}</${tag}>`;
      // Apply overlay wrapper for CraftButton (must be inside tooltip)
      if (resolvedName === "CraftButton") {
        rendered = wrapWithOverlay(rendered, node.props, pad);
      }
      return applyCommonWrappers(rendered);
    }

    // Empty container
    if (mapping.isContainer) {
      rendered = `${mocComments}\n${pad}<${tag}${propsStr}${classNameAttr}${styleAttr} />`;
      return applyCommonWrappers(rendered);
    }

    // Fallback self-closing
    rendered = `${mocComments}\n${pad}<${tag}${propsStr}${classNameAttr}${toastOnClick}${styleAttr} />`;
    // Apply overlay wrapper for CraftButton (must be inside tooltip)
    if (resolvedName === "CraftButton") {
      rendered = wrapWithOverlay(rendered, node.props, pad);
    }
    return applyCommonWrappers(rendered);
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
  const rootCombinedClass = mergeContainerClasses(rootContainerClass, rootUserClass);
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
  } catch (err) {
    throw new Error(`craftStateToTsx failed: ${err}`);
  }
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

/**
 * containerClass と userClassName を結合し、競合するTailwindグループは
 * userClassName 側を優先する（TailwindEditorの設定がコンポーネントpropより優先）。
 */
function mergeContainerClasses(containerClass: string, userClassName: string): string {
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

  const stickyHeaderNum = parseInt((node.props?.stickyHeader as string) || "0") || 0;
  const pinnedLeftNum = parseInt((node.props?.pinnedLeft as string) || "0") || 0;

  // Compute total column width for minWidth (enables scroll when Table width < total col widths)
  const totalColWidth = colMap.reduce((sum, physC) => {
    const w = colWidths[String(physC)] || "";
    if (!w || w === "auto") return sum;
    const num = parseFloat(w);
    return isNaN(num) ? sum : sum + num;
  }, 0);

  // Compute cumulative left offset for pinned columns
  function calcPinnedLeftOffset(upToLogC: number): number {
    let left = 0;
    for (let i = 0; i < upToLogC; i++) {
      const physC = colMap[i];
      const w = colWidths[String(physC)] || "auto";
      if (w !== "auto") {
        const num = parseFloat(w);
        if (!isNaN(num)) left += num;
      }
    }
    return left;
  }

  const tableBorderWidth = (node.props?.borderWidth as string) || "1";
  const tableBorderColor = (node.props?.borderColor as string) || "";
  const borderColorCls = tableBorderColor || "border-border";
  const bwSuffix = tableBorderWidth === "0" ? "-0"
    : tableBorderWidth === "2" ? "-2"
    : tableBorderWidth === "4" ? "-4"
    : "";
  // border-separate pattern: cell gets right+bottom, table gets top+left outer border
  const tableBorderClass = tableBorderWidth === "0"
    ? "border-r-0 border-b-0"
    : `border-r${bwSuffix} border-b${bwSuffix} ${borderColorCls}`;
  const tableOuterBorderClass = tableBorderWidth === "0"
    ? ""
    : `border-t${bwSuffix} border-l${bwSuffix} ${borderColorCls}`;

  const extraStyles: Record<string, string> = { borderSpacing: "0" };
  if (totalColWidth > 0) extraStyles.minWidth = `${totalColWidth}px`;
  const styleAttrWithMin = buildStyleAttr(node.props, extraStyles);

  // Combine user className with outer border class (top+left)
  const outerBorderAttr = tableOuterBorderClass
    ? ` className="${escapeAttr([tableOuterBorderClass, className].filter(Boolean).join(" "))}"`
    : classNameAttr;

  const lines: string[] = [];
  lines.push(`${pad}<Table${outerBorderAttr}${styleAttrWithMin}>`);

  function renderRow(logR: number, rowIndent: number, isStickyRow = false): void {
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
      const slotClassName = (slotNode?.props?.className as string) || "";
      const colWidth = colWidths[String(physC)] || "";
      const cellTag = isHeader ? "TableHead" : "TableCell";
      const colSpanAttr = colspan > 1 ? ` colSpan={${colspan}}` : "";
      const rowSpanAttr = rowspan > 1 ? ` rowSpan={${rowspan}}` : "";
      // inner div uses flex (flex-row) so items-* controls vertical alignment and justify-* controls horizontal
      // h-full works because td has height:1px (1px trick makes h-full expand to full td height)
      const innerDivCls = ["flex h-full p-1", slotClassName].filter(Boolean).join(" ");
      const isPinned = logC < pinnedLeftNum;
      // bg-background is a fallback for pinned cells only when no bgClass is set (prevents transparent sticky cells)
      const pinnedBg = isPinned && !bgClass ? "bg-background" : "";
      const stickyBg = isStickyRow && !bgClass ? "bg-background" : "";
      const cellCls = [bgClass, borderClass, tableBorderClass, pinnedBg, stickyBg].filter(Boolean).join(" ");
      const classAttr = cellCls ? ` className="${escapeAttr(cellCls)}"` : "";
      const stylePartsCell: string[] = [];
      const rawEffectiveWidth = (cellWidth && cellWidth !== "auto") ? cellWidth
        : (colWidth && colWidth !== "auto") ? colWidth
        : "";
      const effectiveWidth = normalizeCssSize(rawEffectiveWidth || undefined) || "";
      if (effectiveWidth) stylePartsCell.push(`width: "${effectiveWidth}"`);
      const normalizedCellHeight = normalizeCssSize(cellHeight || undefined);
      // 1px trick: td height:1px allows inner div h-full to expand to actual td height
      stylePartsCell.push(`height: "${(normalizedCellHeight && normalizedCellHeight !== "auto") ? normalizedCellHeight : "1px"}"`)
      if (isStickyRow && isPinned) {
        // corner cell: sticky both top and left
        stylePartsCell.push(`position: "sticky"`);
        stylePartsCell.push(`top: 0`);
        stylePartsCell.push(`left: ${calcPinnedLeftOffset(logC)}`);
        stylePartsCell.push(`zIndex: 3`);
      } else if (isStickyRow) {
        stylePartsCell.push(`position: "sticky"`);
        stylePartsCell.push(`top: 0`);
        stylePartsCell.push(`zIndex: 2`);
      } else if (isPinned) {
        stylePartsCell.push(`position: "sticky"`);
        stylePartsCell.push(`left: ${calcPinnedLeftOffset(logC)}`);
        stylePartsCell.push(`zIndex: 1`);
      }
      const cellStyleAttr = stylePartsCell.length > 0 ? ` style={{ ${stylePartsCell.join(", ")} }}` : "";
      const slotChildren = slotNode
        ? (slotNode.nodes || []).map((childId) => renderNodeFn(childId, rowIndent + 3)).filter(Boolean)
        : [];
      if (slotChildren.length > 0) {
        lines.push(`${rowPad}  <${cellTag}${colSpanAttr}${rowSpanAttr}${classAttr}${cellStyleAttr}>`);
        lines.push(`${rowPad}    <div className="${escapeAttr(innerDivCls)}">`);
        for (const child of slotChildren) lines.push(child);
        lines.push(`${rowPad}    </div>`);
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
      renderRow(logR, indent + 2, logR < stickyHeaderNum);
    }
    lines.push(`${pad}  </TableHeader>`);
  }

  const bodyRowCount = rowMap.length - headerRowCount;
  if (bodyRowCount > 0) {
    lines.push(`${pad}  <TableBody>`);
    for (let logR = headerRowCount; logR < rowMap.length; logR++) {
      renderRow(logR, indent + 2, logR < stickyHeaderNum);
    }
    lines.push(`${pad}  </TableBody>`);
  }

  lines.push(`${pad}</Table>`);
  return lines.join("\n");
}

function renderDataTable(
  node: CraftNodeData,
  craftState: CraftSerializedState,
  indent: number,
  renderNodeFn: (nodeId: string, indent: number) => string,
): string {
  const pad = "  ".repeat(indent);

  // Parse column defs
  let cols: Array<{ key: string; label?: string; type?: string; sortable?: boolean; width?: string }> = [];
  try {
    const rawDefs = (node.props?.columnDefs as string) || "";
    const parsed = JSON.parse(rawDefs);
    if (Array.isArray(parsed)) cols = parsed;
  } catch {
    cols = [
      { key: "name", label: "Name", sortable: true },
      { key: "status", label: "Status", sortable: true },
      { key: "email", label: "Email" },
      { key: "actions", type: "actions" },
    ];
  }

  // Parse CSV data
  let dataRows: Array<Record<string, string>> = [];
  try {
    const rawCsv = (node.props?.csvData as string) || "";
    const lines = rawCsv.trim().split("\n");
    if (lines.length >= 2) {
      const headers = lines[0].split(",").map((h) => h.trim());
      dataRows = lines.slice(1).map((line) => {
        const vals = line.split(",").map((v) => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, i) => { row[h] = vals[i] ?? ""; });
        return row;
      });
    }
  } catch {
    // leave empty
  }

  const className = (node.props?.className as string) || "";
  const styleAttr = buildStyleAttr(node.props);
  const classNameAttr = className ? ` className="${escapeAttr(className)}"` : "";

  const filterType = (node.props?.filterType as string) || "none";
  const pageable = !!(node.props?.pageable);
  const pageSize = parseInt((node.props?.pageSize as string) || "10") || 10;
  const selectable = !!(node.props?.selectable);
  const columnToggle = !!(node.props?.columnToggle);
  const stickyHeader = !!(node.props?.stickyHeader);
  const pinnedLeft = parseInt((node.props?.pinnedLeft as string) || "0") || 0;

  const lines: string[] = [];

  // Generate columns array inline
  const colItems: string[] = [];
  for (const col of cols) {
    if (col.type === "actions") {
      let buttonsJsx: string;
      const actionButtons = (col as { actionButtons?: Array<{ label?: string; className?: string }> }).actionButtons;
      if (actionButtons && actionButtons.length > 0) {
        const btns = actionButtons.map((btn) => {
          const btnClassName = `inline-flex items-center rounded px-2 py-1 text-xs${btn.className ? ` ${btn.className}` : " hover:bg-accent"}`;
          return `<button type="button" className="${escapeAttr(btnClassName)}">${escapeJsString(btn.label || "···")}</button>`;
        });
        buttonsJsx = `<div className="flex items-center gap-1">${btns.join("")}</div>`;
      } else {
        buttonsJsx = `<button type="button" className="h-8 w-8 rounded-md hover:bg-accent">···</button>`;
      }
      colItems.push(
        `{ id: "${escapeJsString(col.key)}", header: "${escapeJsString(col.label ?? "")}", cell: () => ${buttonsJsx} }`,
      );
    } else if (col.type === "slot") {
      // Resolve slot children from linkedNodes
      const slotNodeId = node.linkedNodes?.[`dt_slot_${col.key}`];
      const slotNode = slotNodeId ? craftState[slotNodeId] : null;
      const slotChildren = (slotNode?.nodes || []).map((childId) => renderNodeFn(childId, 0)).filter(Boolean);
      const slotContent = slotChildren.length > 0
        ? slotChildren.join(" ")
        : `{/* slot: ${escapeJsString(col.key)} */}`;
      colItems.push(
        `{ id: "${escapeJsString(col.key)}", header: "${escapeJsString(col.label ?? col.key)}", cell: () => <div className="min-h-[32px] flex items-center">${slotContent}</div> }`,
      );
    } else {
      const parts: string[] = [`accessorKey: "${escapeJsString(col.key)}"`, `header: "${escapeJsString(col.label ?? col.key)}"`];
      if (col.sortable) parts.push("enableSorting: true");
      if (col.width) {
        const numVal = parseInt(String(col.width));
        if (!isNaN(numVal) && !String(col.width).includes("%")) {
          parts.push(`size: ${numVal}`);
        }
      }
      colItems.push(`{ ${parts.join(", ")} }`);
    }
  }

  // Build prop attributes for DataTable
  const dtProps: string[] = [];
  dtProps.push(`columns={[${colItems.join(", ")}]}`);
  dtProps.push(`data={[${dataRows.map((row) => `{ ${Object.entries(row).map(([k, v]) => `${k}: "${escapeJsString(v)}"`).join(", ")} }`).join(", ")}]}`);
  if (filterType !== "none") dtProps.push(`filterType="${filterType}"`);
  if (pageable) dtProps.push("pageable");
  if (pageable && pageSize !== 10) dtProps.push(`pageSize={${pageSize}}`);
  if (selectable) dtProps.push("selectable");
  if (columnToggle) dtProps.push("columnToggle");
  if (stickyHeader) dtProps.push("stickyHeader");
  if (pinnedLeft > 0) dtProps.push(`pinnedLeft={${pinnedLeft}}`);

  const headerBgClass = (node.props?.headerBgClass as string) || "";
  const hoverRowClass = (node.props?.hoverRowClass as string) || "";
  const selectedRowClass = (node.props?.selectedRowClass as string) || "";
  const headerTextClass = (node.props?.headerTextClass as string) || "";
  const headerHoverTextClass = (node.props?.headerHoverTextClass as string) || "";
  const headerBorderClass = (node.props?.headerBorderClass as string) || "";
  const tableBorderClass = (node.props?.tableBorderClass as string) || "";
  const sortIconClass = (node.props?.sortIconClass as string) || "";
  const filterIconClass = (node.props?.filterIconClass as string) || "";
  if (headerBgClass) dtProps.push(`headerBgClass="${escapeAttr(headerBgClass)}"`);
  if (hoverRowClass) dtProps.push(`hoverRowClass="${escapeAttr(hoverRowClass)}"`);
  if (selectedRowClass) dtProps.push(`selectedRowClass="${escapeAttr(selectedRowClass)}"`);
  if (headerTextClass) dtProps.push(`headerTextClass="${escapeAttr(headerTextClass)}"`);
  if (headerHoverTextClass) dtProps.push(`headerHoverTextClass="${escapeAttr(headerHoverTextClass)}"`);
  if (headerBorderClass) dtProps.push(`headerBorderClass="${escapeAttr(headerBorderClass)}"`);
  if (tableBorderClass) dtProps.push(`tableBorderClass="${escapeAttr(tableBorderClass)}"`);
  if (sortIconClass) dtProps.push(`sortIconClass="${escapeAttr(sortIconClass)}"`);
  if (filterIconClass) dtProps.push(`filterIconClass="${escapeAttr(filterIconClass)}"`);
  const nodeWidth = (node.props?.width as string) || "";
  const nodeHeight = (node.props?.height as string) || "";
  if (nodeWidth && nodeWidth !== "auto") dtProps.push(`width="${escapeAttr(nodeWidth)}"`);
  if (nodeHeight && nodeHeight !== "auto") dtProps.push(`height="${escapeAttr(nodeHeight)}"`);

  lines.push(`${pad}<DataTable`);
  for (const p of dtProps) {
    lines.push(`${pad}  ${p}`);
  }
  if (className) lines.push(`${pad}  ${classNameAttr.trim()}`);
  if (styleAttr) lines.push(`${pad}  ${styleAttr.trim()}`);
  lines.push(`${pad}/>`);

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
  const hoverBgClass = (node.props?.hoverBgClass as string) || "";
  const hoverTextClass = (node.props?.hoverTextClass as string) || "";
  const shortcutTextClass = (node.props?.shortcutTextClass as string) || "";
  const shortcutCls = shortcutTextClass || "text-muted-foreground";
  const checkTextClass = (node.props?.checkTextClass as string) || "";

  // Item hover className: use custom classes if set, otherwise rely on shadcn/ui defaults
  const itemHoverCls = [
    hoverBgClass ? `hover:${hoverBgClass}` : "",
    hoverTextClass ? `hover:${hoverTextClass}` : "",
  ].filter(Boolean).join(" ");
  const itemClassAttr = itemHoverCls ? ` className="${escapeAttr(itemHoverCls)}"` : "";

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

  // CraftContextMenu renders as <ContextMenuContent> so that:
  //   - standalone preview: fallback renders as a static panel (no parent Ctx)
  //   - contextMenuMocPath usage: the linked .moc IS the <ContextMenuContent>
  //     (wrapWithContextMenu places the linked placeholder directly at ContextMenu level)
  const lines: string[] = [];
  lines.push(`${pad}<ContextMenuContent className="${escapeAttr(panelCls)}"${styleAttr}>`);

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
        const checkTextAttr = checkTextClass ? ` checkTextClass="${escapeAttr(checkTextClass)}"` : "";
        lines.push(`${pad}  <ContextMenuCheckboxItem${checkedAttr}${itemClassAttr}${checkTextAttr}>`);
        lines.push(`${pad}    ${escapeJsx(item.label || "")}`);
        if (item.shortcut) lines.push(`${pad}    <span className="ml-auto text-xs tracking-widest ${escapeAttr(shortcutCls)}">${escapeJsx(item.shortcut)}</span>`);
        lines.push(`${pad}  </ContextMenuCheckboxItem>`);
      } else {
        lines.push(`${pad}  <ContextMenuItem${itemClassAttr}>`);
        lines.push(`${pad}    ${escapeJsx(item.label || "")}`);
        if (item.shortcut) lines.push(`${pad}    <span className="ml-auto text-xs tracking-widest ${escapeAttr(shortcutCls)}">${escapeJsx(item.shortcut)}</span>`);
        lines.push(`${pad}  </ContextMenuItem>`);
      }
    }
  }

  lines.push(`${pad}</ContextMenuContent>`);
  return lines.join("\n");
}

function renderPagination(node: CraftNodeData, indent: number): string {
  const pad = "  ".repeat(indent);
  const className = (node.props?.className as string) || "";
  const styleAttr = buildStyleAttr(node.props);
  const totalPages = (node.props?.totalPages as number) || 5;
  const currentPage = (node.props?.currentPage as number) || 1;

  const hoverBgClass = (node.props?.hoverBgClass as string) || "";
  const hoverTextClass = (node.props?.hoverTextClass as string) || "";
  const activeBgClass = (node.props?.activeBgClass as string) || "";
  const activeTextClass = (node.props?.activeTextClass as string) || "";
  const activeBorderClass = (node.props?.activeBorderClass as string) || "";
  const activeBorderWidth = (node.props?.activeBorderWidth as string) || "";
  const activeShadowClass = (node.props?.activeShadowClass as string) || "";

  const activeBwClass = activeBorderWidth === "0" ? "border-0"
    : activeBorderWidth === "2" ? "border-2"
    : activeBorderWidth === "4" ? "border-4"
    : activeBorderWidth === "8" ? "border-8"
    : activeBorderWidth === "1" ? "border" : "border";

  const activeCls = [
    activeBwClass,
    activeBorderClass || "border-input",
    activeBgClass || "bg-background",
    activeShadowClass || "shadow-sm",
    activeTextClass,
  ].filter(Boolean).join(" ");

  const itemHoverCls = [
    hoverBgClass ? `hover:${hoverBgClass}` : "",
    hoverTextClass ? `hover:${hoverTextClass}` : "",
  ].filter(Boolean).join(" ") || "hover:bg-accent hover:text-accent-foreground";

  const navCls = ["flex w-full", className].filter(Boolean).join(" ");

  const lines: string[] = [];
  lines.push(`${pad}<Pagination className="${escapeAttr(navCls)}"${styleAttr}>`);
  lines.push(`${pad}  <PaginationContent>`);

  lines.push(`${pad}    <PaginationItem>`);
  lines.push(`${pad}      <PaginationPrevious href="#" className="${escapeAttr(itemHoverCls)}" />`);
  lines.push(`${pad}    </PaginationItem>`);

  for (let page = 1; page <= totalPages; page++) {
    if (page === currentPage) {
      lines.push(`${pad}    <PaginationItem>`);
      lines.push(`${pad}      <PaginationLink href="#" isActive className="${escapeAttr(activeCls)}">`);
      lines.push(`${pad}        ${page}`);
      lines.push(`${pad}      </PaginationLink>`);
      lines.push(`${pad}    </PaginationItem>`);
    } else {
      lines.push(`${pad}    <PaginationItem>`);
      lines.push(`${pad}      <PaginationLink href="#" className="${escapeAttr(itemHoverCls)}">`);
      lines.push(`${pad}        ${page}`);
      lines.push(`${pad}      </PaginationLink>`);
      lines.push(`${pad}    </PaginationItem>`);
    }
  }

  lines.push(`${pad}    <PaginationItem>`);
  lines.push(`${pad}      <PaginationNext href="#" className="${escapeAttr(itemHoverCls)}" />`);
  lines.push(`${pad}    </PaginationItem>`);

  lines.push(`${pad}  </PaginationContent>`);
  lines.push(`${pad}</Pagination>`);
  return lines.join("\n");
}

function renderDatePicker(node: CraftNodeData, indent: number): string {
  const pad = "  ".repeat(indent);

  const props: string[] = [];

  const mode = (node.props?.mode as string) || "date";
  if (mode !== "date") props.push(`mode="${escapeAttr(mode)}"`);

  const dateFormat = (node.props?.dateFormat as string) || "yyyy/MM/dd";
  if (dateFormat !== "yyyy/MM/dd") props.push(`dateFormat="${escapeAttr(dateFormat)}"`);

  const placeholder = (node.props?.placeholder as string) || "";
  if (placeholder) props.push(`placeholder="${escapeAttr(placeholder)}"`);

  if (node.props?.editable) props.push(`editable`);
  if (node.props?.disabled) props.push(`disabled`);

  // width/height を style ではなく explicit prop として渡す（fallback が style を除外するため）
  const w = normalizeCssSize(node.props?.width as string | undefined);
  if (w && w !== "auto") props.push(`width="${escapeAttr(w)}"`);

  const h = normalizeCssSize(node.props?.height as string | undefined);
  if (h && h !== "auto") props.push(`height="${escapeAttr(h)}"`);

  const className = (node.props?.className as string) || "";
  if (className) props.push(`className="${escapeAttr(className)}"`);

  const stylingProps = [
    "calendarBorderClass", "calendarShadowClass",
    "todayBgClass", "todayTextClass", "todayBorderClass", "todayShadowClass",
    "selectedBgClass", "selectedTextClass", "selectedBorderClass", "selectedShadowClass",
    "buttonBgClass", "hoverBgClass",
  ];
  for (const key of stylingProps) {
    const val = (node.props?.[key] as string) || "";
    if (val) props.push(`${key}="${escapeAttr(val)}"`);
  }

  const propsStr = props.length > 0 ? " " + props.join(" ") : "";
  return `${pad}<DatePicker${propsStr} />`;
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
  const dropdownWidth = (node.props?.dropdownWidth as string) || "";
  const dropStyleAttr = dropdownWidth ? ` style={{ width: "${escapeAttr(dropdownWidth)}" }}` : "";

  const lines: string[] = [];
  lines.push(`${pad}<div className="${escapeAttr(barCls)}"${styleAttr}>`);

  for (const menu of menus) {
    lines.push(`${pad}  <div className="relative group">`);
    lines.push(`${pad}    <button type="button" className="${escapeAttr(btnCls)}">`);
    lines.push(`${pad}      ${escapeJsx(menu.label || "")}`);
    lines.push(`${pad}    </button>`);
    const menuWidthAttr = (menu as { width?: string }).width
      ? ` style={{ width: "${escapeAttr((menu as { width?: string }).width!)}" }}`
      : dropStyleAttr;
    lines.push(`${pad}    <div className="${escapeAttr(dropCls)}"${menuWidthAttr}>`);
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

function renderDropdownMenu(node: CraftNodeData, indent: number): string {
  const pad = "  ".repeat(indent);
  let menus: TopLevelMenuDef[] = [];
  try {
    const parsed = JSON.parse((node.props?.menuData as string) || "[]");
    if (Array.isArray(parsed)) menus = parsed as TopLevelMenuDef[];
  } catch {
    menus = [];
  }

  const triggerText = (node.props?.triggerText as string) || "Open Menu";
  const className = (node.props?.className as string) || "";
  const styleAttr = buildStyleAttr(node.props);

  // Trigger styling
  const triggerBgClass = (node.props?.triggerBgClass as string) || "";
  const triggerTextClass = (node.props?.triggerTextClass as string) || "";
  const triggerBorderClass = (node.props?.triggerBorderClass as string) || "";
  const triggerBorderWidth = (node.props?.triggerBorderWidth as string) || "";
  const triggerShadowClass = (node.props?.triggerShadowClass as string) || "";
  const triggerBwClass = triggerBorderWidth === "0" ? "border-0"
    : triggerBorderWidth === "2" ? "border-2"
    : triggerBorderWidth === "4" ? "border-4"
    : triggerBorderWidth === "8" ? "border-8"
    : triggerBorderWidth === "1" ? "border" : "";
  const triggerCls = [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors h-9 px-4 py-2",
    triggerBgClass || "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
    triggerTextClass, triggerBwClass, triggerBorderClass, triggerShadowClass,
    className,
  ].filter(Boolean).join(" ");

  // Dropdown panel styling
  const dropdownBgClass = (node.props?.dropdownBgClass as string) || "";
  const dropdownTextClass = (node.props?.dropdownTextClass as string) || "";
  const dropdownBorderClass = (node.props?.dropdownBorderClass as string) || "";
  const dropdownBorderWidth = (node.props?.dropdownBorderWidth as string) || "";
  const dropdownShadowClass = (node.props?.dropdownShadowClass as string) || "";
  const shortcutTextClass = (node.props?.shortcutTextClass as string) || "";
  const checkTextClass = (node.props?.checkTextClass as string) || "";
  const hoverBgClass = (node.props?.hoverBgClass as string) || "";
  const hoverTextClass = (node.props?.hoverTextClass as string) || "";
  const dropBwClass = dropdownBorderWidth === "0" ? "border-0"
    : dropdownBorderWidth === "2" ? "border-2"
    : dropdownBorderWidth === "4" ? "border-4"
    : dropdownBorderWidth === "8" ? "border-8"
    : "border";
  const dropCls = [
    "min-w-[8rem] rounded-md p-1",
    dropdownBgClass || "bg-popover",
    dropBwClass, dropdownBorderClass,
    dropdownShadowClass || "shadow-md",
    dropdownTextClass,
  ].filter(Boolean).join(" ");
  const shortcutCls = shortcutTextClass || "text-muted-foreground";

  const itemHoverCls = [
    hoverBgClass ? `hover:${hoverBgClass}` : "",
    hoverTextClass ? `hover:${hoverTextClass}` : "",
  ].filter(Boolean).join(" ");
  const itemClassAttr = itemHoverCls ? ` className="${escapeAttr(itemHoverCls)}"` : "";
  const dropdownWidth = (node.props?.dropdownWidth as string) || "";
  const effectiveDropWidth = (menus[0] as { width?: string })?.width || dropdownWidth;
  const dropStyleAttr = effectiveDropWidth ? ` style={{ width: "${escapeAttr(effectiveDropWidth)}" }}` : "";

  const lines: string[] = [];
  lines.push(`${pad}<DropdownMenu${styleAttr}>`);
  lines.push(`${pad}  <DropdownMenuTrigger className="${escapeAttr(triggerCls)}">`);
  lines.push(`${pad}    ${escapeJsx(triggerText)}`);
  lines.push(`${pad}    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="m6 9 6 6 6-6"/></svg>`);
  lines.push(`${pad}  </DropdownMenuTrigger>`);
  lines.push(`${pad}  <DropdownMenuContent className="${escapeAttr(dropCls)}"${dropStyleAttr}>`);

  for (let sectionIdx = 0; sectionIdx < menus.length; sectionIdx++) {
    const menu = menus[sectionIdx];
    if (sectionIdx > 0) {
      lines.push(`${pad}    <DropdownMenuSeparator />`);
    }
    if (menu.label) {
      lines.push(`${pad}    <DropdownMenuLabel>${escapeJsx(menu.label)}</DropdownMenuLabel>`);
    }
    for (const item of (menu.items || [])) {
      if (item.type === "separator") {
        lines.push(`${pad}    <DropdownMenuSeparator />`);
      } else if (item.type === "checkbox") {
        const checkedAttr = item.checked ? " checked" : "";
        const checkTextAttr = checkTextClass ? ` checkTextClass="${escapeAttr(checkTextClass)}"` : "";
        lines.push(`${pad}    <DropdownMenuCheckboxItem${checkedAttr}${itemClassAttr}${checkTextAttr}>`);
        lines.push(`${pad}      <span className="flex-1">${escapeJsx(item.label || "")}</span>`);
        if (item.shortcut) lines.push(`${pad}      <DropdownMenuShortcut className="${escapeAttr(shortcutCls)}">${escapeJsx(item.shortcut)}</DropdownMenuShortcut>`);
        lines.push(`${pad}    </DropdownMenuCheckboxItem>`);
      } else {
        lines.push(`${pad}    <DropdownMenuItem${itemClassAttr}>`);
        lines.push(`${pad}      <span className="flex-1">${escapeJsx(item.label || "")}</span>`);
        if (item.shortcut) lines.push(`${pad}      <DropdownMenuShortcut className="${escapeAttr(shortcutCls)}">${escapeJsx(item.shortcut)}</DropdownMenuShortcut>`);
        lines.push(`${pad}    </DropdownMenuItem>`);
      }
    }
  }

  lines.push(`${pad}  </DropdownMenuContent>`);
  lines.push(`${pad}</DropdownMenu>`);
  return lines.join("\n");
}

interface SidebarNavItemDef {
  key: number;
  type: "item" | "group-label" | "separator";
  label?: string;
  icon?: string;
  active?: boolean;
  badge?: string;
  badgeBgClass?: string;
  badgeTextClass?: string;
  children?: SidebarNavItemDef[];
  defaultOpen?: boolean;
}

function renderNavItemsHtml(
  items: SidebarNavItemDef[],
  pad: string,
  depth: number,
  navActiveBgClass: string,
  navHoverBgClass: string,
  navTextClass: string,
  navIconClass: string,
): string[] {
  const lines: string[] = [];
  const innerPad = pad + "  ";

  for (const item of items) {
    if (item.type === "separator") {
      lines.push(`${pad}<hr className="my-1 border-t border-border mx-2" />`);
    } else if (item.type === "group-label") {
      const groupCls = ["px-2 py-1 text-xs font-medium uppercase tracking-wide", navTextClass || "text-muted-foreground"].filter(Boolean).join(" ");
      lines.push(`${pad}<div data-sb-label className="${escapeAttr(groupCls)}">${escapeJsx(item.label || "")}</div>`);
    } else {
      const isActive = !!item.active;
      const indentClass = depth === 1 ? "pl-5" : depth >= 2 ? "pl-8" : "";
      const itemCls = [
        "flex items-start gap-2 rounded-md px-2 py-1.5 text-sm transition-colors w-full text-left",
        indentClass,
        isActive
          ? [navActiveBgClass, navTextClass || "text-accent-foreground"].filter(Boolean).join(" ")
          : [navHoverBgClass ? `hover:${navHoverBgClass}` : "hover:bg-accent", navTextClass || "text-foreground"].filter(Boolean).join(" "),
      ].filter(Boolean).join(" ");

      const hasChildren = !!(item.children && item.children.length > 0);

      if (hasChildren) {
        const detailsAttr = item.defaultOpen ? " open" : "";
        lines.push(`${pad}<details${detailsAttr}>`);
        lines.push(`${innerPad}<summary className="${escapeAttr(itemCls)}">`);
        if (item.icon && depth < 2) {
          const iconCls = ["mt-0.5 h-4 w-4 shrink-0", navIconClass].filter(Boolean).join(" ");
          lines.push(`${innerPad}  <${escapeJsx(item.icon)} className="${escapeAttr(iconCls)}" />`);
        }
        lines.push(`${innerPad}  <span data-sb-label className="min-w-0 flex-1 break-words">${escapeJsx(item.label || "")}</span>`);
        lines.push(`${innerPad}</summary>`);
        lines.push(`${innerPad}<div data-sb-label className="flex flex-col gap-0.5">`);
        lines.push(...renderNavItemsHtml(item.children!, innerPad + "  ", depth + 1, navActiveBgClass, navHoverBgClass, navTextClass, navIconClass));
        lines.push(`${innerPad}</div>`);
        lines.push(`${pad}</details>`);
      } else {
        lines.push(`${pad}<button type="button" className="${escapeAttr(itemCls)}">`);
        if (item.icon && depth < 2) {
          const iconCls = ["mt-0.5 h-4 w-4 shrink-0", navIconClass].filter(Boolean).join(" ");
          lines.push(`${innerPad}<${escapeJsx(item.icon)} className="${escapeAttr(iconCls)}" />`);
        }
        lines.push(`${innerPad}<span data-sb-label className="min-w-0 flex-1 break-words">${escapeJsx(item.label || "")}</span>`);
        if (item.badge) {
          const badgeCls = [
            "ml-auto inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
            item.badgeBgClass || "bg-primary",
            item.badgeTextClass || "text-primary-foreground",
          ].filter(Boolean).join(" ");
          lines.push(`${innerPad}<span data-sb-label className="${escapeAttr(badgeCls)}">${escapeJsx(item.badge)}</span>`);
        }
        lines.push(`${pad}</button>`);
      }
    }
  }
  return lines;
}

function renderSidebar(
  node: CraftNodeData,
  craftState: CraftSerializedState,
  indent: number,
  renderNodeFn: (nodeId: string, indent: number) => string,
): string {
  const pad = "  ".repeat(indent);

  let items: SidebarNavItemDef[] = [];
  try {
    const meta = JSON.parse((node.props?.sidebarData as string) || "{}");
    if (Array.isArray(meta.items)) items = meta.items as SidebarNavItemDef[];
  } catch {
    // use defaults
  }

  const side = (node.props?.side as string) || "left";
  const sidebarWidth = (node.props?.sidebarWidth as string) || "240px";
  const className = (node.props?.className as string) || "";
  const styleAttr = buildStyleAttr(node.props);

  const sidebarBgClass = (node.props?.sidebarBgClass as string) || "bg-muted/50";
  const sidebarBorderColor = (node.props?.sidebarBorderColor as string) || "";
  const sidebarShadow = (node.props?.sidebarShadow as string) || "";
  const headerBgClass = (node.props?.headerBgClass as string) || "";
  const headerBorderColor = (node.props?.headerBorderColor as string) || "";
  const headerShadow = (node.props?.headerShadow as string) || "";
  const navActiveBgClass = (node.props?.navActiveBgClass as string) || "bg-accent";
  const navHoverBgClass = (node.props?.navHoverBgClass as string) || "";
  const navTextClass = (node.props?.navTextClass as string) || "";
  const navIconClass = (node.props?.navIconClass as string) || "";
  const footerBgClass = (node.props?.footerBgClass as string) || "";
  const footerBorderColor = (node.props?.footerBorderColor as string) || "";
  const footerShadow = (node.props?.footerShadow as string) || "";
  const insetBgClass = (node.props?.insetBgClass as string) || "bg-background";
  const insetBorderColor = (node.props?.insetBorderColor as string) || "";
  const insetShadow = (node.props?.insetShadow as string) || "";

  const outerCls = ["flex overflow-hidden", side === "right" ? "flex-row-reverse" : "flex-row", className].filter(Boolean).join(" ");

  const sidebarCls = [
    "flex flex-col overflow-hidden",
    sidebarBgClass,
    sidebarBorderColor,
    sidebarShadow,
    side === "left" ? "border-r" : "border-l",
  ].filter(Boolean).join(" ");

  const headerCls = [
    "border-b px-2 py-3",
    headerBgClass,
    headerBorderColor,
    headerShadow,
  ].filter(Boolean).join(" ");

  const footerCls = [
    "border-t px-2 py-3",
    footerBgClass,
    footerBorderColor,
    footerShadow,
  ].filter(Boolean).join(" ");

  const insetCls = [
    "flex flex-col flex-1 overflow-hidden",
    insetBgClass,
    insetBorderColor,
    insetShadow,
  ].filter(Boolean).join(" ");

  // Resolve slot children and slot className
  function getSlotNode(slotKey: string) {
    const slotId = node.linkedNodes?.[slotKey];
    if (!slotId) return undefined;
    return craftState[slotId];
  }
  function renderSlot(slotKey: string, slotIndent: number): string {
    const slotNode = getSlotNode(slotKey);
    if (!slotNode) return "";
    return (slotNode.nodes || []).map((childId) => renderNodeFn(childId, slotIndent)).filter(Boolean).join("\n");
  }
  function slotClassName(slotKey: string): string {
    return (getSlotNode(slotKey)?.props?.className as string) || "";
  }

  const headerChildren = renderSlot("sidebar_header", indent + 4);
  const footerChildren = renderSlot("sidebar_footer", indent + 4);
  const insetChildren = renderSlot("sidebar_inset", indent + 3);

  const collapsible = (node.props?.collapsible as string) || "icon";
  const isCollapsible = collapsible !== "none";
  const isIconMode = collapsible === "icon";
  const headerCollapseMode = (node.props?.headerCollapseMode as string) || "clip";
  const footerCollapseMode = (node.props?.footerCollapseMode as string) || "clip";

  // ref callback for preview toggle (DOM manipulation, no React state needed)
  let refAttr = "";
  if (isCollapsible) {
    if (isIconMode) {
      const hdrHide = headerCollapseMode === "hide" ? " const hdr = aside.querySelector('[data-sb-header]'); if (hdr) hdr.style.display = c ? 'none' : '';" : "";
      const ftrHide = footerCollapseMode === "hide" ? " const ftr = aside.querySelector('[data-sb-footer]'); if (ftr) ftr.style.display = c ? 'none' : '';" : "";
      refAttr = ` ref={(el: any) => { if (!el || el.__sbInit) return; el.__sbInit = true; const aside = el.querySelector('[data-sb-aside]'); const toggles = el.querySelectorAll('[data-sb-toggle]'); if (!aside || !toggles.length) return; const fw = '${escapeAttr(sidebarWidth)}'; let c = false; toggles.forEach((b: any) => b.addEventListener('click', () => { c = !c; const w = c ? '48px' : fw; aside.style.width = w; aside.style.minWidth = w; aside.querySelectorAll('[data-sb-label]').forEach((n: any) => { n.style.display = c ? 'none' : ''; });${hdrHide}${ftrHide} })); }}`;
    } else {
      // offcanvas: hide the aside entirely
      refAttr = ` ref={(el: any) => { if (!el || el.__sbInit) return; el.__sbInit = true; const aside = el.querySelector('[data-sb-aside]'); const toggles = el.querySelectorAll('[data-sb-toggle]'); if (!aside || !toggles.length) return; let c = false; toggles.forEach((b: any) => b.addEventListener('click', () => { c = !c; aside.style.display = c ? 'none' : ''; })); }}`;
    }
  }

  const lines: string[] = [];
  lines.push(`${pad}<div className="${escapeAttr(outerCls)}"${styleAttr}${refAttr}>`);

  // Sidebar panel
  lines.push(`${pad}  <aside data-sb-aside className="${escapeAttr(sidebarCls)}" style={{ width: "${escapeAttr(sidebarWidth)}", minWidth: "${escapeAttr(sidebarWidth)}", flexShrink: 0 }}>`);

  // Header slot
  const headerInnerCls = ["min-h-[40px]", slotClassName("sidebar_header")].filter(Boolean).join(" ");
  lines.push(`${pad}    <div data-sb-header className="${escapeAttr(headerCls)}">`);
  lines.push(`${pad}      <div className="${escapeAttr(headerInnerCls)}">`);
  if (headerChildren) lines.push(headerChildren);
  lines.push(`${pad}      </div>`);
  lines.push(`${pad}    </div>`);

  // Nav items
  lines.push(`${pad}    <nav className="flex flex-col flex-1 overflow-y-auto py-2 gap-0.5 px-2">`);
  lines.push(...renderNavItemsHtml(items, `${pad}      `, 0, navActiveBgClass, navHoverBgClass, navTextClass, navIconClass));
  lines.push(`${pad}    </nav>`);

  // Footer slot
  const footerInnerCls = ["min-h-[40px]", slotClassName("sidebar_footer")].filter(Boolean).join(" ");
  lines.push(`${pad}    <div data-sb-footer className="${escapeAttr(footerCls)}">`);
  lines.push(`${pad}      <div className="${escapeAttr(footerInnerCls)}">`);
  if (footerChildren) lines.push(footerChildren);
  lines.push(`${pad}      </div>`);
  lines.push(`${pad}    </div>`);

  lines.push(`${pad}  </aside>`);

  // Inset panel
  lines.push(`${pad}  <main className="${escapeAttr(insetCls)}">`);
  if (isCollapsible) {
    const toggleArrow = side === "left" ? "←" : "→";
    lines.push(`${pad}    <div className="flex items-center border-b px-2 py-1">`);
    lines.push(`${pad}      <button data-sb-toggle type="button" className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground">${toggleArrow}</button>`);
    lines.push(`${pad}    </div>`);
  }
  const insetContentCls = ["flex-1 overflow-auto", slotClassName("sidebar_inset")].filter(Boolean).join(" ");
  lines.push(`${pad}    <div className="${escapeAttr(insetContentCls)}">`);
  if (insetChildren) lines.push(insetChildren);
  lines.push(`${pad}    </div>`);
  lines.push(`${pad}  </main>`);

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
  const tabButtonWidth = (node.props?.tabButtonWidth as string) || "";
  const tabListAlign = (node.props?.tabListAlign as string) || "start";

  const styleAttr = buildStyleAttr(node.props);

  const width = (node.props?.width as string) || "";
  const widthCls = width && width !== "auto" ? "block" : "w-fit";

  // Build outer wrapper className
  const outerCls = [widthCls, isVertical ? "flex flex-row" : "flex flex-col", outerBorderColor, outerShadow, userClassName]
    .filter(Boolean)
    .join(" ");
  const outerClassAttr = outerCls ? ` className="${escapeAttr(outerCls)}"` : "";

  // Build TabsList className
  const isFullWidth = tabButtonWidth === "100%";
  const hasFixedButtonWidth = tabButtonWidth && tabButtonWidth !== "auto" && tabButtonWidth !== "100%";
  const tabListBase = isVertical
    ? "flex flex-col items-stretch bg-muted p-1 rounded-md"
    : isFullWidth
      ? "flex w-full items-center bg-muted p-1 rounded-md"
      : "inline-flex items-center bg-muted p-1 rounded-md";
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
    const triggerExtraClass = isFullWidth
      ? "w-full"
      : "";
    const triggerClassParts = [
      tabActiveBgClass ? `data-[state=active]:${tabActiveBgClass}` : "",
      triggerExtraClass,
    ].filter(Boolean).join(" ");
    const triggerClassAttr = triggerClassParts ? ` className="${escapeAttr(triggerClassParts)}"` : "";
    const triggerStyleAttr = hasFixedButtonWidth
      ? ` style={{ width: "${tabButtonWidth}" }}`
      : "";
    if (tooltip) {
      lines.push(`${pad}    <TooltipProvider>`);
      lines.push(`${pad}      <Tooltip>`);
      lines.push(`${pad}        <TooltipTrigger asChild>`);
      lines.push(`${pad}          <TabsTrigger value="tab-${key}"${triggerClassAttr}${triggerStyleAttr}>${iconJsx}${escapeJsx(label)}</TabsTrigger>`);
      lines.push(`${pad}        </TooltipTrigger>`);
      lines.push(`${pad}        <TooltipContent>`);
      lines.push(`${pad}          <p>${escapeJsx(tooltip)}</p>`);
      lines.push(`${pad}        </TooltipContent>`);
      lines.push(`${pad}      </Tooltip>`);
      lines.push(`${pad}    </TooltipProvider>`);
    } else {
      lines.push(`${pad}    <TabsTrigger value="tab-${key}"${triggerClassAttr}${triggerStyleAttr}>${iconJsx}${escapeJsx(label)}</TabsTrigger>`);
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

function renderCarousel(
  node: CraftNodeData,
  craftState: CraftSerializedState,
  indent: number,
  renderNodeFn: (nodeId: string, indent: number) => string,
): string {
  const pad = "  ".repeat(indent);

  // Parse slideMeta
  let keys: number[] = [0, 1, 2];
  try {
    const meta = JSON.parse((node.props?.slideMeta as string) || "{}");
    if (Array.isArray(meta.keys)) keys = meta.keys;
  } catch {
    // use defaults
  }

  const orientation = (node.props?.orientation as string) || "horizontal";
  const loop = !!(node.props?.loop);
  const showArrows = node.props?.showArrows !== false;
  const userClassName = (node.props?.className as string) || "";
  const styleAttr = buildStyleAttr(node.props);

  const optsAttr = `opts={{ loop: ${loop} }}`;
  const orientationAttr = orientation === "vertical" ? ` orientation="vertical"` : "";
  const classAttr = userClassName ? ` className="${escapeAttr(userClassName)}"` : "";

  const itemClassAttr = "";

  const lines: string[] = [];
  lines.push(`${pad}<Carousel ${optsAttr}${orientationAttr}${classAttr}${styleAttr}>`);
  lines.push(`${pad}  <CarouselContent>`);

  for (const key of keys) {
    const slotId = node.linkedNodes?.[`slide_${key}`];
    const slotNode = slotId ? craftState[slotId] : null;
    const slotClassName = (slotNode?.props?.className as string) || "";
    const slotChildren = slotNode
      ? (slotNode.nodes || []).map((childId) => renderNodeFn(childId, indent + 5)).filter(Boolean)
      : [];

    if (slotChildren.length > 0) {
      const innerCls = ["h-full w-full", slotClassName].filter(Boolean).join(" ");
      lines.push(`${pad}    <CarouselItem${itemClassAttr}>`);
      lines.push(`${pad}      <div className="${escapeAttr(innerCls)}">`);
      for (const child of slotChildren) lines.push(child);
      lines.push(`${pad}      </div>`);
      lines.push(`${pad}    </CarouselItem>`);
    } else {
      lines.push(`${pad}    <CarouselItem${itemClassAttr} />`);
    }
  }

  lines.push(`${pad}  </CarouselContent>`);
  if (showArrows) {
    lines.push(`${pad}  <CarouselPrevious />`);
    lines.push(`${pad}  <CarouselNext />`);
  }
  lines.push(`${pad}</Carousel>`);
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

/** Wrap rendered element with overlay (module scope — accessible from renderButtonGroup and renderNode) */
function wrapWithOverlay(rendered: string, props: Record<string, unknown>, pad: string): string {
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
    case "alert-dialog":
      return [
        `${pad}<AlertDialog>`,
        `${pad}  <AlertDialogTrigger asChild>`,
        rendered,
        `${pad}  </AlertDialogTrigger>`,
        `${pad}  <AlertDialogContent${classAttr}${styleAttr}>`,
        `${pad}    ${contentComment}`,
        `${pad}    <div className="flex justify-end gap-2">`,
        `${pad}      <AlertDialogCancel>Cancel</AlertDialogCancel>`,
        `${pad}      <AlertDialogAction>Continue</AlertDialogAction>`,
        `${pad}    </div>`,
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

function renderButtonGroup(
  props: Record<string, unknown>,
  propsStr: string,
  styleAttr: string,
  pad: string,
): string {
  interface ButtonDef {
    text: string;
    variant?: string;
    size?: string;
    disabled?: boolean;
    overlayType?: string;
    linkedMocPath?: string;
    sheetSide?: string;
    overlayWidth?: string;
    overlayHeight?: string;
    overlayClassName?: string;
    toastText?: string;
    toastPosition?: string;
  }

  let btns: ButtonDef[] = [];
  try {
    btns = JSON.parse((props?.buttonData as string) || "[]") as ButtonDef[];
  } catch { /* ignore */ }

  const lines: string[] = [];
  lines.push(`${pad}<ButtonGroup${propsStr}${styleAttr}>`);

  const groupVariant = (props?.variant as string) || "outline";
  const groupSize = (props?.size as string) || "default";

  for (const btn of btns) {
    const variantAttr = groupVariant !== "default" ? ` variant="${escapeAttr(groupVariant)}"` : "";
    const sizeAttr = groupSize !== "default" ? ` size="${escapeAttr(groupSize)}"` : "";
    const disabledAttr = btn.disabled ? " disabled" : "";
    const pos = btn.toastPosition || "bottom-right";
    const toastOnClick = btn.toastText && (!btn.overlayType || btn.overlayType === "none")
      ? ` onClick={() => toast("${escapeAttr(btn.toastText)}", { position: "${pos}" })}`
      : "";
    const btnRendered = `${pad}  <Button${variantAttr}${sizeAttr}${disabledAttr}${toastOnClick}>${escapeJsx(btn.text)}</Button>`;

    if (btn.overlayType && btn.overlayType !== "none") {
      const wrapped = wrapWithOverlay(btnRendered, btn as Record<string, unknown>, `${pad}  `);
      lines.push(wrapped);
    } else {
      lines.push(btnRendered);
    }
  }

  lines.push(`${pad}</ButtonGroup>`);
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
  const contentWidth = (props?.contentWidth as string) || "";
  const contentStyleAttr = contentWidth ? ` style={{ width: "${escapeAttr(contentWidth)}" }}` : "";

  // width は <Select> wrapper に渡す（inline-grid を block に切り替えるため）
  // height は <SelectTrigger> に渡す（button自体の高さ調整のため）
  const w = normalizeCssSize(props?.width as string | undefined);
  const h = normalizeCssSize(props?.height as string | undefined);
  const wrapperStyleAttr = w && w !== "auto" ? ` style={{ width: "${escapeAttr(w)}" }}` : "";
  const triggerStyleAttr = h && h !== "auto" ? ` style={{ height: "${escapeAttr(h)}" }}` : "";

  // margin クラスは <Select> ラッパーに、非 margin クラスは <SelectTrigger> に渡す
  const userClass = (props?.className as string) || "";
  const allClasses = userClass ? userClass.split(" ").filter(Boolean) : [];
  const marginCls = allClasses.filter((c) => /^-?m[trblxy]?-/.test(c));
  const nonMarginCls = allClasses.filter((c) => !/^-?m[trblxy]?-/.test(c));
  const wrapperClassAttr = marginCls.length ? ` className="${escapeAttr(marginCls.join(" "))}"` : "";
  const triggerClassAttr = nonMarginCls.length ? ` className="${escapeAttr(nonMarginCls.join(" "))}"` : "";

  const lines: string[] = [];
  lines.push(`${pad}<${tag}${wrapperClassAttr}${wrapperStyleAttr}>`);
  if (tooltipText) {
    lines.push(`${pad}  <TooltipProvider>`);
    lines.push(`${pad}    <Tooltip>`);
    lines.push(`${pad}      <TooltipTrigger asChild>`);
    lines.push(`${pad}        <SelectTrigger${triggerClassAttr}${triggerStyleAttr}>`);
    lines.push(`${pad}          <SelectValue placeholder="${escapeAttr(placeholder)}" />`);
    lines.push(`${pad}        </SelectTrigger>`);
    lines.push(`${pad}      </TooltipTrigger>`);
    lines.push(`${pad}      <TooltipContent${sideAttr}>`);
    lines.push(`${pad}        <p>${escapeJsx(tooltipText)}</p>`);
    lines.push(`${pad}      </TooltipContent>`);
    lines.push(`${pad}    </Tooltip>`);
    lines.push(`${pad}  </TooltipProvider>`);
  } else {
    lines.push(`${pad}  <SelectTrigger${triggerClassAttr}${triggerStyleAttr}>`);
    lines.push(`${pad}    <SelectValue placeholder="${escapeAttr(placeholder)}" />`);
    lines.push(`${pad}  </SelectTrigger>`);
  }
  lines.push(`${pad}  <SelectContent${contentStyleAttr}>`);
  for (const item of items) {
    lines.push(`${pad}    <SelectItem value="${escapeAttr(item)}">${escapeJsx(item)}</SelectItem>`);
  }
  lines.push(`${pad}  </SelectContent>`);
  lines.push(`${pad}</${tag}>`);
  return lines.join("\n");
}

type CommandItemDefLocal =
  | { type: "item"; label: string; icon?: string; shortcut?: string }
  | { type: "separator" }
  | { type: "group"; label: string; items: CommandItemDefLocal[] };

function renderCommandItems(
  defs: CommandItemDefLocal[],
  pad: string,
  itemCls: string,
  iconCls: string,
  shortcutCls: string,
  groupHeadingCls: string,
  separatorCls: string,
): string[] {
  const lines: string[] = [];
  for (const def of defs) {
    if (def.type === "separator") {
      lines.push(`${pad}<CommandSeparator className="${escapeAttr(separatorCls)}" />`);
    } else if (def.type === "group") {
      lines.push(`${pad}<CommandGroup heading="${escapeAttr(def.label)}">`);
      lines.push(...renderCommandItems(def.items, pad + "  ", itemCls, iconCls, shortcutCls, groupHeadingCls, separatorCls));
      lines.push(`${pad}</CommandGroup>`);
    } else {
      // type === "item"
      lines.push(`${pad}<CommandItem value="${escapeAttr(def.label)}" className="${escapeAttr(itemCls)}">`);
      if (def.icon) {
        lines.push(`${pad}  <${escapeAttr(def.icon)} className="${escapeAttr(iconCls)}" />`);
      } else {
        lines.push(`${pad}  <span className="h-4 w-4 shrink-0" />`);
      }
      lines.push(`${pad}  <span className="flex-1">${escapeJsx(def.label)}</span>`);
      if (def.shortcut) {
        lines.push(`${pad}  <span className="${escapeAttr(shortcutCls)}">${escapeJsx(def.shortcut)}</span>`);
      }
      lines.push(`${pad}</CommandItem>`);
    }
  }
  return lines;
}

function renderCommand(
  props: Record<string, unknown>,
  classNameAttr: string,
  styleAttr: string,
  pad: string,
): string {
  const placeholder = (props?.placeholder as string) || "Type a command or search...";

  // Style props
  const itemBgClass = (props?.itemBgClass as string) || "";
  const itemTextClass = (props?.itemTextClass as string) || "";
  const itemBorderClass = (props?.itemBorderClass as string) || "";
  const itemBorderWidth = (props?.itemBorderWidth as string) || "";
  const itemShadowClass = (props?.itemShadowClass as string) || "";
  const hoverBgClass = (props?.hoverBgClass as string) || "";
  const hoverTextClass = (props?.hoverTextClass as string) || "";
  const iconClass = (props?.iconClass as string) || "";
  const shortcutTextClass = (props?.shortcutTextClass as string) || "";
  const groupHeadingClass = (props?.groupHeadingClass as string) || "";

  const itemBwClass =
    itemBorderWidth === "0" ? "border-0"
    : itemBorderWidth === "2" ? "border-2"
    : itemBorderWidth === "4" ? "border-4"
    : itemBorderWidth === "8" ? "border-8"
    : itemBorderWidth === "1" ? "border"
    : "";

  const itemCls = [
    "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none",
    itemBgClass, itemTextClass, itemBwClass, itemBorderClass, itemShadowClass,
    hoverBgClass ? `hover:${hoverBgClass}` : "hover:bg-accent",
    hoverTextClass ? `hover:${hoverTextClass}` : "hover:text-accent-foreground",
  ].filter(Boolean).join(" ");

  const iconCls = ["h-4 w-4 shrink-0", iconClass || "opacity-60"].filter(Boolean).join(" ");
  const shortcutCls = ["ml-auto text-xs tracking-widest", shortcutTextClass || "text-muted-foreground"].filter(Boolean).join(" ");
  const groupHeadingCls = groupHeadingClass || "text-muted-foreground";

  // Input border styling
  const inputBorderClass = (props?.inputBorderClass as string) || "";
  const inputBorderWidth = (props?.inputBorderWidth as string) || "";
  const inputBwClass =
    inputBorderWidth === "0" ? "border-0"
    : inputBorderWidth === "2" ? "border-2"
    : inputBorderWidth === "4" ? "border-4"
    : inputBorderWidth === "8" ? "border-8"
    : inputBorderWidth === "1" ? "border"
    : "";
  const inputRoundedClass = (props?.inputRoundedClass as string) || "";
  const inputCls = ["flex items-center border-b px-3", inputBorderClass, inputBwClass, inputRoundedClass].filter(Boolean).join(" ");

  // Separator styling
  const separatorClass = (props?.separatorClass as string) || "";
  const separatorShadowClass = (props?.separatorShadowClass as string) || "";
  const separatorBorderClass = (props?.separatorBorderClass as string) || "";
  const separatorBorderWidth = (props?.separatorBorderWidth as string) || "";
  const sepBwClass =
    separatorBorderWidth === "0" ? "border-0"
    : separatorBorderWidth === "2" ? "border-2"
    : separatorBorderWidth === "4" ? "border-4"
    : separatorBorderWidth === "8" ? "border-8"
    : separatorBorderWidth === "1" ? "border"
    : "";
  const separatorCls = ["-mx-1 h-px", separatorClass || "bg-border", separatorShadowClass, sepBwClass, separatorBorderClass].filter(Boolean).join(" ");

  let defs: CommandItemDefLocal[] = [];
  try {
    const parsed = JSON.parse((props?.commandData as string) || "[]");
    if (Array.isArray(parsed)) defs = parsed as CommandItemDefLocal[];
  } catch {
    defs = [];
  }

  const lines: string[] = [];
  lines.push(`${pad}<Command${classNameAttr}${styleAttr}>`);
  lines.push(`${pad}  <CommandInput placeholder="${escapeAttr(placeholder)}" className="${escapeAttr(inputCls)}" />`);
  lines.push(`${pad}  <CommandList>`);
  lines.push(`${pad}    <CommandEmpty>No results found.</CommandEmpty>`);
  lines.push(...renderCommandItems(defs, pad + "    ", itemCls, iconCls, shortcutCls, groupHeadingCls, separatorCls));
  lines.push(`${pad}  </CommandList>`);
  lines.push(`${pad}</Command>`);
  return lines.join("\n");
}

function renderCombobox(
  props: Record<string, unknown>,
  classNameAttr: string,
  styleAttr: string,
  pad: string,
): string {
  const items = ((props?.items as string) || "Apple,Banana,Cherry").split(",").map((s) => s.trim());
  const placeholder = (props?.placeholder as string) || "Select an option...";
  const linkedMocPath = (props?.linkedMocPath as string) || "";
  const contentWidth = (props?.contentWidth as string) || "";
  const contentStyleAttr = contentWidth ? ` style={{ width: "${escapeAttr(contentWidth)}" }}` : "";
  const width = normalizeCssSize((props?.width as string) || "auto") || "auto";
  const height = normalizeCssSize((props?.height as string) || "auto") || "auto";

  // width は <Popover> ラッパーに渡す。指定がある時のみ付与。height は <button> に渡す。
  const popoverStyleAttr = width !== "auto" ? ` style={{ width: "${escapeAttr(width)}" }}` : "";
  const buttonStyleAttr = height !== "auto" ? ` style={{ height: "${escapeAttr(height)}" }}` : "";
  // w-full は PopoverTrigger(span[inline-block]) 自体に幅を持たせるため不要。width は Popover に委ねる。
  // margin クラスは <Popover> ラッパーに、非 margin クラスは <Button> に渡す
  const userClass = classNameAttr.match(/className="([^"]*)"/)?.[ 1] ?? "";
  const allClasses = userClass ? userClass.split(" ").filter(Boolean) : [];
  const marginCls = allClasses.filter((c) => /^-?m[trblxy]?-/.test(c));
  const nonMarginCls = allClasses.filter((c) => !/^-?m[trblxy]?-/.test(c));
  const popoverClassAttr = marginCls.length ? ` className="${escapeAttr(marginCls.join(" "))}"` : "";
  const buttonClassName = ["w-full justify-between", ...nonMarginCls].filter(Boolean).join(" ");

  const lines: string[] = [];
  lines.push(`${pad}<Popover${popoverClassAttr}${popoverStyleAttr}>`);
  lines.push(`${pad}  <PopoverTrigger asChild>`);
  lines.push(`${pad}    <Button variant="outline" role="combobox" className="${buttonClassName}"${buttonStyleAttr}>`);
  lines.push(`${pad}      ${escapeJsx(placeholder)}`);
  lines.push(`${pad}      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />`);
  lines.push(`${pad}    </Button>`);
  lines.push(`${pad}  </PopoverTrigger>`);
  lines.push(`${pad}  <PopoverContent className="p-0"${contentStyleAttr}>`);
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

function renderBreadcrumb(
  props: Record<string, unknown>,
  classNameAttr: string,
  styleAttr: string,
  pad: string,
): string {
  const itemList = ((props?.items as string) || "Home,Products,Current")
    .split(",").map((s) => s.trim()).filter(Boolean);
  const maxV = parseInt((props?.maxVisible as string) || "0", 10);
  const shouldCollapse = maxV > 0 && itemList.length > maxV;

  const visibleTail = shouldCollapse ? itemList.slice(-(maxV - 1)) : itemList.slice(1);
  const collapsed = shouldCollapse ? itemList.slice(1, -(maxV - 1)) : [];

  const lines: string[] = [];
  lines.push(`${pad}<Breadcrumb${classNameAttr}${styleAttr}>`);
  lines.push(`${pad}  <BreadcrumbList>`);

  // First item
  lines.push(`${pad}    <BreadcrumbItem>`);
  if (itemList.length === 1) {
    lines.push(`${pad}      <BreadcrumbPage>${escapeJsx(itemList[0])}</BreadcrumbPage>`);
  } else {
    lines.push(`${pad}      <BreadcrumbLink href="#">${escapeJsx(itemList[0])}</BreadcrumbLink>`);
  }
  lines.push(`${pad}    </BreadcrumbItem>`);

  // Ellipsis with dropdown for collapsed items
  if (shouldCollapse) {
    lines.push(`${pad}    <BreadcrumbSeparator />`);
    lines.push(`${pad}    <BreadcrumbItem>`);
    lines.push(`${pad}      <DropdownMenu>`);
    lines.push(`${pad}        <DropdownMenuTrigger className="flex items-center gap-1">`);
    lines.push(`${pad}          <BreadcrumbEllipsis className="h-4 w-4" />`);
    lines.push(`${pad}          <span className="sr-only">Toggle menu</span>`);
    lines.push(`${pad}        </DropdownMenuTrigger>`);
    lines.push(`${pad}        <DropdownMenuContent align="start">`);
    for (const label of collapsed) {
      lines.push(`${pad}          <DropdownMenuItem>${escapeJsx(label)}</DropdownMenuItem>`);
    }
    lines.push(`${pad}        </DropdownMenuContent>`);
    lines.push(`${pad}      </DropdownMenu>`);
    lines.push(`${pad}    </BreadcrumbItem>`);
  }

  // Tail items
  for (let i = 0; i < visibleTail.length; i++) {
    const label = visibleTail[i];
    const globalIndex = shouldCollapse
      ? itemList.length - visibleTail.length + i
      : i + 1;
    const isLast = globalIndex === itemList.length - 1;
    lines.push(`${pad}    <BreadcrumbSeparator />`);
    lines.push(`${pad}    <BreadcrumbItem>`);
    if (isLast) {
      lines.push(`${pad}      <BreadcrumbPage>${escapeJsx(label)}</BreadcrumbPage>`);
    } else {
      lines.push(`${pad}      <BreadcrumbLink href="#">${escapeJsx(label)}</BreadcrumbLink>`);
    }
    lines.push(`${pad}    </BreadcrumbItem>`);
  }

  lines.push(`${pad}  </BreadcrumbList>`);
  lines.push(`${pad}</Breadcrumb>`);
  return lines.join("\n");
}

function renderTypography(
  props: Record<string, unknown>,
  classNameAttr: string,
  styleAttr: string,
  pad: string,
): string {
  const variant = (props?.variant as string) || "h1";
  const text = (props?.text as string) || "";
  const items = (props?.items as string) || "";

  const VARIANT_CONFIG: Record<string, { tag: string; className: string }> = {
    h1:         { tag: "h1",         className: "scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl" },
    h2:         { tag: "h2",         className: "scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0" },
    h3:         { tag: "h3",         className: "scroll-m-20 text-2xl font-semibold tracking-tight" },
    h4:         { tag: "h4",         className: "scroll-m-20 text-xl font-semibold tracking-tight" },
    p:          { tag: "p",          className: "leading-7 [&:not(:first-child)]:mt-6" },
    blockquote: { tag: "blockquote", className: "border-l-4 pl-6 italic bg-transparent" },
    ul:         { tag: "ul",         className: "list-disc [&>li]:mt-2" },
    ol:         { tag: "ol",         className: "list-decimal [&>li]:mt-2" },
    code:       { tag: "code",       className: "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold" },
    lead:       { tag: "p",          className: "text-xl text-muted-foreground" },
    large:      { tag: "div",        className: "text-lg font-semibold" },
    small:      { tag: "small",      className: "text-sm font-medium leading-none" },
    muted:      { tag: "p",          className: "text-sm text-muted-foreground" },
  };

  const config = VARIANT_CONFIG[variant] ?? VARIANT_CONFIG.h1;
  const { tag, className } = config;
  const isList = variant === "ul" || variant === "ol";

  // Build className attr: merge variant class with any extra classNameAttr
  const variantClass = ` className="${className}"`;
  const extraClass = classNameAttr ? classNameAttr.replace(/className="/, 'className="').trim() : "";
  // If classNameAttr is empty, just use variantClass; else combine
  const mergedClassAttr = extraClass
    ? ` className="${className} ${extraClass.replace(/^className="/, "").replace(/"$/, "")}"`
    : variantClass;

  const lines: string[] = [];
  if (isList) {
    const listItems = items.split(",").map((s) => s.trim()).filter(Boolean);
    lines.push(`${pad}<${tag}${mergedClassAttr}${styleAttr}>`);
    for (const item of listItems) {
      lines.push(`${pad}  <li>${escapeJsx(item)}</li>`);
    }
    lines.push(`${pad}</${tag}>`);
  } else {
    lines.push(`${pad}<${tag}${mergedClassAttr}${styleAttr}>${escapeJsx(text)}</${tag}>`);
  }

  return lines.join("\n");
}

function escapeJsx(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/{/g, "&#123;").replace(/}/g, "&#125;");
}

const KBD_CLASS = "pointer-events-none inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground select-none";

/**
 * <kbd>...</kbd> を含む文字列を JSX フラグメント文字列に変換する。
 * 例: "Save <kbd>Ctrl</kbd>" → '<>Save <kbd className="...">Ctrl</kbd></>'
 */
function kbdTextToJsx(text: string): string {
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

function escapeAttr(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeJsString(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r");
}
