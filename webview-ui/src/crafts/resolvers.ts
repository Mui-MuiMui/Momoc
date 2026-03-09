import { layoutModeRef } from "./layoutModeRef";
import { CraftDiv } from "./html/CraftDiv";
import { CraftText } from "./html/CraftText";
import { CraftPlaceholderImage } from "./html/CraftPlaceholderImage";
import { CraftImage } from "./html/CraftImage";
import { CraftContainer } from "./layout/CraftContainer";
import { CraftFreeCanvas } from "./layout/CraftFreeCanvas";
import { CraftGroup } from "./layout/CraftGroup";
import { CraftButton } from "./shadcn/CraftButton";
import { CraftInput } from "./shadcn/CraftInput";
import { CraftCard } from "./shadcn/CraftCard";
import { CraftLabel } from "./shadcn/CraftLabel";
import { CraftSeparator } from "./shadcn/CraftSeparator";
import { CraftBadge } from "./shadcn/CraftBadge";
import { CraftTable, TableCellSlot } from "./shadcn/CraftTable";
import { CraftDataTable, DataTableSlot, DEFAULT_COLUMN_DEFS_STR, DEFAULT_CSV_DATA } from "./shadcn/CraftDataTable";
// Phase 1: Simple components
import { CraftAccordion } from "./shadcn/CraftAccordion";
import { CraftAlert } from "./shadcn/CraftAlert";
import { CraftAspectRatio } from "./shadcn/CraftAspectRatio";
import { CraftAvatar } from "./shadcn/CraftAvatar";
import { CraftBreadcrumb } from "./shadcn/CraftBreadcrumb";
import { CraftCheckbox } from "./shadcn/CraftCheckbox";
import { CraftCollapsible, CollapsibleSlot } from "./shadcn/CraftCollapsible";
import { CraftPagination } from "./shadcn/CraftPagination";
import { CraftProgress } from "./shadcn/CraftProgress";
import { CraftRadioGroup } from "./shadcn/CraftRadioGroup";
import { CraftScrollArea } from "./shadcn/CraftScrollArea";
import { CraftSlider } from "./shadcn/CraftSlider";
import { CraftSwitch } from "./shadcn/CraftSwitch";
import { CraftTabs, TabContentSlot } from "./shadcn/CraftTabs";
import { CraftTextarea } from "./shadcn/CraftTextarea";
import { CraftToggle } from "./shadcn/CraftToggle";
import { CraftToggleGroup } from "./shadcn/CraftToggleGroup";
// Phase 2: Complex components
import { CraftSelect } from "./shadcn/CraftSelect";
import { CraftCombobox } from "./shadcn/CraftCombobox";
import { CraftCalendar } from "./shadcn/CraftCalendar";
import { CraftDatePicker } from "./shadcn/CraftDatePicker";
import { CraftResizable, ResizablePanelSlot } from "./shadcn/CraftResizable";
import { CraftCarousel, SlideContentSlot } from "./shadcn/CraftCarousel";
import { CraftButtonGroup, DEFAULT_BUTTON_DATA } from "./shadcn/CraftButtonGroup";
// Phase 4: Overlay components
import { CraftDropdownMenu, DEFAULT_DROPDOWN_DATA } from "./shadcn/CraftDropdownMenu";
import { CraftContextMenu, DEFAULT_CONTEXTMENU_DATA } from "./shadcn/CraftContextMenu";
import { CraftHoverCard } from "./shadcn/CraftHoverCard";
import { CraftNavigationMenu, NavMenuSlot } from "./shadcn/CraftNavigationMenu";
import { CraftMenubar, DEFAULT_MENUBAR_DATA } from "./shadcn/CraftMenubar";
import { CraftCommand } from "./shadcn/CraftCommand";
import { CraftTooltip } from "./shadcn/CraftTooltip";
import { CraftTypography } from "./shadcn/CraftTypography";
import { CraftSidebar, SidebarHeaderSlot, SidebarFooterSlot, SidebarInsetSlot, DEFAULT_SIDEBAR_DATA } from "./shadcn/CraftSidebar";
import { CraftIcon } from "./icon/CraftIcon";

export const resolvers = {
  CraftDiv,
  CraftText,
  CraftPlaceholderImage,
  CraftImage,
  CraftContainer,
  CraftFreeCanvas,
  CraftGroup,
  CraftButton,
  CraftInput,
  CraftCard,
  CraftLabel,
  CraftSeparator,
  CraftBadge,
  CraftTable,
  TableCellSlot,
  CraftDataTable,
  DataTableSlot,
  // Phase 1
  CraftAccordion,
  CraftAlert,
  CraftAspectRatio,
  CraftAvatar,
  CraftBreadcrumb,
  CraftCheckbox,
  CraftCollapsible,
  CollapsibleSlot,
  CraftPagination,
  CraftProgress,
  CraftRadioGroup,
  CraftScrollArea,
  CraftSlider,
  CraftSwitch,
  CraftTabs,
  TabContentSlot,
  CraftTextarea,
  CraftToggle,
  CraftToggleGroup,
  // Phase 2
  CraftSelect,
  CraftCombobox,
  CraftCalendar,
  CraftDatePicker,
  CraftResizable,
  ResizablePanelSlot,
  CraftCarousel,
  SlideContentSlot,
  CraftButtonGroup,
  // Phase 4
  CraftDropdownMenu,
  CraftContextMenu,
  CraftHoverCard,
  CraftNavigationMenu,
  NavMenuSlot,
  CraftMenubar,
  CraftCommand,
  CraftTooltip,
  CraftTypography,
  CraftSidebar,
  SidebarHeaderSlot,
  SidebarFooterSlot,
  SidebarInsetSlot,
  // Icon
  CraftIcon,
};

// 自由配置モード時に全コンポーネントの Craft.js DnD を無効化
// canDrag が false の場合、Craft.js はドラッグを開始しない（RenderNode の独自ハンドラが動作）
(Object.values(resolvers) as Array<{ craft?: { rules?: { canDrag?: (...a: unknown[]) => boolean } } }>).forEach(
  (Component) => {
    if (!Component?.craft) return;
    if (!Component.craft.rules) Component.craft.rules = {};
    const original = Component.craft.rules.canDrag;
    Component.craft.rules.canDrag = (...args: unknown[]) => {
      if (layoutModeRef.current === "absolute") return false;
      return original ? original(...args) : true;
    };
  },
);

export type ResolverKey = keyof typeof resolvers;

export interface PaletteItem {
  resolverKey: ResolverKey;
  label: string;
  category: "shadcn" | "html" | "layout" | "icon";
  /** shadcn コンポーネントの中カテゴリ */
  subCategory?: "action" | "display" | "form" | "layout" | "navigation" | "overlay" | "lucide";
  icon: string;
  defaultProps: Record<string, unknown>;
  /** When true, the element is created as a Craft.js canvas that accepts children */
  isCanvas?: boolean;
  /** false にするとパレットから非表示になる。省略時は表示（デフォルト true） */
  enabled?: boolean;
  /** true にするとコンポーネントモード（absolute）でのみ表示される */
  absoluteOnly?: boolean;
}

export const paletteItems: PaletteItem[] = [
  // Layout
  {
    resolverKey: "CraftContainer",
    label: "Container",
    category: "layout",
    icon: "LayoutGrid",
    defaultProps: {},
    isCanvas: true,
    enabled: true,
  },
  {
    resolverKey: "CraftFreeCanvas",
    label: "Free Canvas",
    category: "layout",
    icon: "Move",
    defaultProps: {},
    isCanvas: true,
    enabled: true,
  },
  {
    resolverKey: "CraftGroup",
    label: "Group",
    category: "layout",
    icon: "Group",
    defaultProps: {},
    isCanvas: true,
    enabled: true,
    absoluteOnly: true,
  },
  // HTML
  {
    resolverKey: "CraftDiv",
    label: "Div",
    category: "html",
    icon: "Square",
    defaultProps: {},
    isCanvas: true,
    enabled: true,
  },
  {
    resolverKey: "CraftText",
    label: "Text",
    category: "html",
    icon: "Type",
    defaultProps: { text: "Text" },
    enabled: true,
  },
  {
    resolverKey: "CraftImage",
    label: "Image",
    category: "html",
    icon: "Image",
    defaultProps: {},
    enabled: true,
  },
  {
    resolverKey: "CraftPlaceholderImage",
    label: "Placeholder Image",
    category: "html",
    icon: "ImageOff",
    defaultProps: {},
    enabled: true,
  },
  // shadcn/ui - Action
  {
    resolverKey: "CraftButton",
    label: "Button",
    category: "shadcn",
    subCategory: "action",
    icon: "MousePointerClick",
    defaultProps: { text: "Button" },
    enabled: true,
  },
  {
    resolverKey: "CraftButtonGroup",
    label: "Button Group",
    category: "shadcn",
    subCategory: "action",
    icon: "RectangleHorizontal",
    defaultProps: { buttonData: JSON.stringify(DEFAULT_BUTTON_DATA) },
    enabled: true,
  },
  // shadcn/ui - Display
  {
    resolverKey: "CraftAlert",
    label: "Alert",
    category: "shadcn",
    subCategory: "display",
    icon: "AlertCircle",
    defaultProps: {},
    enabled: true,
  },
  {
    resolverKey: "CraftAvatar",
    label: "Avatar",
    category: "shadcn",
    subCategory: "display",
    icon: "CircleUser",
    defaultProps: {},
    enabled: true,
  },
  {
    resolverKey: "CraftBadge",
    label: "Badge",
    category: "shadcn",
    subCategory: "display",
    icon: "Award",
    defaultProps: { text: "Badge" },
    enabled: true,
  },
  {
    resolverKey: "CraftCard",
    label: "Card",
    category: "shadcn",
    subCategory: "display",
    icon: "CreditCard",
    defaultProps: {},
    isCanvas: true,
    enabled: true,
  },
  {
    resolverKey: "CraftLabel",
    label: "Label",
    category: "shadcn",
    subCategory: "display",
    icon: "Tag",
    defaultProps: { text: "Label" },
    enabled: true,
  },
  {
    resolverKey: "CraftProgress",
    label: "Progress",
    category: "shadcn",
    subCategory: "display",
    icon: "Loader",
    defaultProps: {},
    enabled: true,
  },
  {
    resolverKey: "CraftTable",
    label: "Table",
    category: "shadcn",
    subCategory: "display",
    icon: "Table",
    defaultProps: {},
    enabled: true,
  },
  {
    resolverKey: "CraftDataTable",
    label: "Data Table",
    category: "shadcn",
    subCategory: "display",
    icon: "Table2",
    defaultProps: {
      columnDefs: DEFAULT_COLUMN_DEFS_STR,
      csvData: DEFAULT_CSV_DATA,
    },
    enabled: true,
  },
  {
    resolverKey: "CraftTypography",
    label: "Typography",
    category: "shadcn",
    subCategory: "display",
    icon: "Type",
    defaultProps: { text: "Heading 1" },
    enabled: true,
  },
  // shadcn/ui - Form
  {
    resolverKey: "CraftCalendar",
    label: "Calendar",
    category: "shadcn",
    subCategory: "form",
    icon: "Calendar",
    defaultProps: {},
    enabled: true,
  },
  {
    resolverKey: "CraftCheckbox",
    label: "Checkbox",
    category: "shadcn",
    subCategory: "form",
    icon: "CheckSquare",
    defaultProps: {},
    enabled: true,
  },
  {
    resolverKey: "CraftCombobox",
    label: "Combobox",
    category: "shadcn",
    subCategory: "form",
    icon: "ChevronsUpDown",
    defaultProps: {},
    enabled: true,
  },
  {
    resolverKey: "CraftDatePicker",
    label: "Date Picker",
    category: "shadcn",
    subCategory: "form",
    icon: "CalendarDays",
    defaultProps: {},
    enabled: true,
  },
  {
    resolverKey: "CraftInput",
    label: "Input",
    category: "shadcn",
    subCategory: "form",
    icon: "TextCursorInput",
    defaultProps: {},
    enabled: true,
  },
  {
    resolverKey: "CraftRadioGroup",
    label: "Radio Group",
    category: "shadcn",
    subCategory: "form",
    icon: "Circle",
    defaultProps: {},
    enabled: true,
  },
  {
    resolverKey: "CraftSelect",
    label: "Select",
    category: "shadcn",
    subCategory: "form",
    icon: "ChevronDown",
    defaultProps: {},
    enabled: true,
  },
  {
    resolverKey: "CraftSlider",
    label: "Slider",
    category: "shadcn",
    subCategory: "form",
    icon: "SlidersHorizontal",
    defaultProps: {},
    enabled: true,
  },
  {
    resolverKey: "CraftSwitch",
    label: "Switch",
    category: "shadcn",
    subCategory: "form",
    icon: "ToggleLeft",
    defaultProps: {},
    enabled: true,
  },
  {
    resolverKey: "CraftTextarea",
    label: "Textarea",
    category: "shadcn",
    subCategory: "form",
    icon: "AlignLeft",
    defaultProps: {},
    enabled: true,
  },
  {
    resolverKey: "CraftToggle",
    label: "Toggle",
    category: "shadcn",
    subCategory: "form",
    icon: "ToggleRight",
    defaultProps: { text: "Toggle" },
    enabled: true,
  },
  {
    resolverKey: "CraftToggleGroup",
    label: "Toggle Group",
    category: "shadcn",
    subCategory: "form",
    icon: "Group",
    defaultProps: {},
    enabled: true,
  },
  // shadcn/ui - Layout
  {
    resolverKey: "CraftAccordion",
    label: "Accordion",
    category: "shadcn",
    subCategory: "layout",
    icon: "ChevronsUpDown",
    defaultProps: {},
    enabled: true,
  },
  {
    resolverKey: "CraftAspectRatio",
    label: "Aspect Ratio",
    category: "shadcn",
    subCategory: "layout",
    icon: "RatioIcon",
    defaultProps: {},
    isCanvas: true,
    enabled: true,
  },
  {
    resolverKey: "CraftCarousel",
    label: "Carousel",
    category: "shadcn",
    subCategory: "layout",
    icon: "GalleryHorizontal",
    defaultProps: {},
    enabled: true,
  },
  {
    resolverKey: "CraftCollapsible",
    label: "Collapsible",
    category: "shadcn",
    subCategory: "layout",
    icon: "ChevronsDownUp",
    defaultProps: {},
    isCanvas: false,
    enabled: true,
  },
  {
    resolverKey: "CraftResizable",
    label: "Resizable",
    category: "shadcn",
    subCategory: "layout",
    icon: "GripVertical",
    defaultProps: {},
    enabled: true,
  },
  {
    resolverKey: "CraftScrollArea",
    label: "Scroll Area",
    category: "shadcn",
    subCategory: "layout",
    icon: "ScrollText",
    defaultProps: {},
    isCanvas: true,
    enabled: true,
  },
  {
    resolverKey: "CraftSeparator",
    label: "Separator",
    category: "shadcn",
    subCategory: "layout",
    icon: "Minus",
    defaultProps: {},
    enabled: true,
  },
  // shadcn/ui - Navigation
  {
    resolverKey: "CraftBreadcrumb",
    label: "Breadcrumb",
    category: "shadcn",
    subCategory: "navigation",
    icon: "ChevronRight",
    defaultProps: {},
    enabled: true,
  },
  {
    resolverKey: "CraftDropdownMenu",
    label: "Dropdown Menu",
    category: "shadcn",
    subCategory: "navigation",
    icon: "ChevronDown",
    defaultProps: { menuData: JSON.stringify(DEFAULT_DROPDOWN_DATA) },
    enabled: true,
  },
  {
    resolverKey: "CraftMenubar",
    label: "Menubar",
    category: "shadcn",
    subCategory: "navigation",
    icon: "Menu",
    defaultProps: { menuData: JSON.stringify(DEFAULT_MENUBAR_DATA) },
    enabled: true,
  },
  {
    resolverKey: "CraftNavigationMenu",
    label: "Navigation Menu",
    category: "shadcn",
    subCategory: "navigation",
    icon: "Navigation",
    defaultProps: {},
    enabled: true,
  },
  {
    resolverKey: "CraftPagination",
    label: "Pagination",
    category: "shadcn",
    subCategory: "navigation",
    icon: "ArrowLeftRight",
    defaultProps: {},
    enabled: true,
  },
  {
    resolverKey: "CraftSidebar",
    label: "Sidebar",
    category: "shadcn",
    subCategory: "navigation",
    icon: "PanelLeft",
    defaultProps: { sidebarData: DEFAULT_SIDEBAR_DATA },
    enabled: true,
  },
  {
    resolverKey: "CraftTabs",
    label: "Tabs",
    category: "shadcn",
    subCategory: "navigation",
    icon: "PanelTop",
    defaultProps: {},
    enabled: true,
  },
  // shadcn/ui - Overlay
  {
    resolverKey: "CraftCommand",
    label: "Command",
    category: "shadcn",
    subCategory: "overlay",
    icon: "Terminal",
    defaultProps: {},
    enabled: true,
  },
  {
    resolverKey: "CraftContextMenu",
    label: "Context Menu",
    category: "shadcn",
    subCategory: "overlay",
    icon: "MousePointerClick",
    defaultProps: { menuData: JSON.stringify(DEFAULT_CONTEXTMENU_DATA) },
    enabled: true,
  },
  {
    resolverKey: "CraftHoverCard",
    label: "Hover Card",
    category: "shadcn",
    subCategory: "overlay",
    icon: "MousePointer",
    defaultProps: {},
    enabled: true,
  },
  // Icon
  {
    resolverKey: "CraftIcon",
    label: "Icon",
    category: "icon",
    subCategory: "lucide",
    icon: "Sparkles",
    defaultProps: { icon: "Heart" },
    enabled: true,
  },
];
