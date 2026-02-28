import { CraftDiv } from "./html/CraftDiv";
import { CraftText } from "./html/CraftText";
import { CraftPlaceholderImage } from "./html/CraftPlaceholderImage";
import { CraftImage } from "./html/CraftImage";
import { CraftContainer } from "./layout/CraftContainer";
import { CraftFreeCanvas } from "./layout/CraftFreeCanvas";
import { CraftButton } from "./shadcn/CraftButton";
import { CraftInput } from "./shadcn/CraftInput";
import { CraftCard } from "./shadcn/CraftCard";
import { CraftLabel } from "./shadcn/CraftLabel";
import { CraftSeparator } from "./shadcn/CraftSeparator";
import { CraftBadge } from "./shadcn/CraftBadge";
import { CraftTable, TableCellSlot } from "./shadcn/CraftTable";
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
import { CraftSkeleton } from "./shadcn/CraftSkeleton";
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
import { CraftResizable, ResizablePanelSlot } from "./shadcn/CraftResizable";
import { CraftCarousel } from "./shadcn/CraftCarousel";
import { CraftChart } from "./shadcn/CraftChart";
import { CraftForm } from "./shadcn/CraftForm";
// Phase 4: Overlay components
import { CraftDialog } from "./shadcn/CraftDialog";
import { CraftAlertDialog } from "./shadcn/CraftAlertDialog";
import { CraftSheet } from "./shadcn/CraftSheet";
import { CraftDrawer } from "./shadcn/CraftDrawer";
import { CraftDropdownMenu } from "./shadcn/CraftDropdownMenu";
import { CraftContextMenu } from "./shadcn/CraftContextMenu";
import { CraftPopover } from "./shadcn/CraftPopover";
import { CraftHoverCard } from "./shadcn/CraftHoverCard";
import { CraftNavigationMenu } from "./shadcn/CraftNavigationMenu";
import { CraftMenubar } from "./shadcn/CraftMenubar";
import { CraftCommand } from "./shadcn/CraftCommand";
import { CraftTooltip } from "./shadcn/CraftTooltip";
import { CraftSonner } from "./shadcn/CraftSonner";

export const resolvers = {
  CraftDiv,
  CraftText,
  CraftPlaceholderImage,
  CraftImage,
  CraftContainer,
  CraftFreeCanvas,
  CraftButton,
  CraftInput,
  CraftCard,
  CraftLabel,
  CraftSeparator,
  CraftBadge,
  CraftTable,
  TableCellSlot,
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
  CraftSkeleton,
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
  CraftResizable,
  ResizablePanelSlot,
  CraftCarousel,
  CraftChart,
  CraftForm,
  // Phase 4
  CraftDialog,
  CraftAlertDialog,
  CraftSheet,
  CraftDrawer,
  CraftDropdownMenu,
  CraftContextMenu,
  CraftPopover,
  CraftHoverCard,
  CraftNavigationMenu,
  CraftMenubar,
  CraftCommand,
  CraftTooltip,
  CraftSonner,
};

export type ResolverKey = keyof typeof resolvers;

export interface PaletteItem {
  resolverKey: ResolverKey;
  label: string;
  category: "shadcn" | "html" | "layout";
  icon: string;
  defaultProps: Record<string, unknown>;
  /** When true, the element is created as a Craft.js canvas that accepts children */
  isCanvas?: boolean;
  /** false にするとパレットから非表示になる。省略時は表示（デフォルト true） */
  enabled?: boolean;
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
  // shadcn/ui
  {
    resolverKey: "CraftButton",
    label: "Button",
    category: "shadcn",
    icon: "MousePointerClick",
    defaultProps: { text: "Button" },
    enabled: true,
  },
  {
    resolverKey: "CraftInput",
    label: "Input",
    category: "shadcn",
    icon: "TextCursorInput",
    defaultProps: {},
    enabled: true,
  },
  {
    resolverKey: "CraftCard",
    label: "Card",
    category: "shadcn",
    icon: "CreditCard",
    defaultProps: {},
    isCanvas: true,
    enabled: true,
  },
  {
    resolverKey: "CraftLabel",
    label: "Label",
    category: "shadcn",
    icon: "Tag",
    defaultProps: { text: "Label" },
    enabled: true,
  },
  {
    resolverKey: "CraftSeparator",
    label: "Separator",
    category: "shadcn",
    icon: "Minus",
    defaultProps: {},
    enabled: true,
  },
  {
    resolverKey: "CraftBadge",
    label: "Badge",
    category: "shadcn",
    icon: "Award",
    defaultProps: { text: "Badge" },
    enabled: true,
  },
  {
    resolverKey: "CraftTable",
    label: "Table",
    category: "shadcn",
    icon: "Table",
    defaultProps: {},
    enabled: true,
  },
  {
    resolverKey: "CraftAccordion",
    label: "Accordion",
    category: "shadcn",
    icon: "ChevronsUpDown",
    defaultProps: {},
    enabled: true,
  },
  {
    resolverKey: "CraftAlert",
    label: "Alert",
    category: "shadcn",
    icon: "AlertCircle",
    defaultProps: {},
    enabled: true,
  },
  {
    resolverKey: "CraftAspectRatio",
    label: "Aspect Ratio",
    category: "shadcn",
    icon: "RatioIcon",
    defaultProps: {},
    isCanvas: true,
    enabled: false,
  },
  {
    resolverKey: "CraftAvatar",
    label: "Avatar",
    category: "shadcn",
    icon: "CircleUser",
    defaultProps: {},
    enabled: false,
  },
  {
    resolverKey: "CraftBreadcrumb",
    label: "Breadcrumb",
    category: "shadcn",
    icon: "ChevronRight",
    defaultProps: {},
    enabled: false,
  },
  {
    resolverKey: "CraftCheckbox",
    label: "Checkbox",
    category: "shadcn",
    icon: "CheckSquare",
    defaultProps: {},
    enabled: true,
  },
  {
    resolverKey: "CraftCollapsible",
    label: "Collapsible",
    category: "shadcn",
    icon: "ChevronsDownUp",
    defaultProps: {},
    isCanvas: false,
    enabled: true,
  },
  {
    resolverKey: "CraftPagination",
    label: "Pagination",
    category: "shadcn",
    icon: "ArrowLeftRight",
    defaultProps: {},
    enabled: false,
  },
  {
    resolverKey: "CraftProgress",
    label: "Progress",
    category: "shadcn",
    icon: "Loader",
    defaultProps: {},
    enabled: false,
  },
  {
    resolverKey: "CraftRadioGroup",
    label: "Radio Group",
    category: "shadcn",
    icon: "Circle",
    defaultProps: {},
    enabled: true,
  },
  {
    resolverKey: "CraftScrollArea",
    label: "Scroll Area",
    category: "shadcn",
    icon: "ScrollText",
    defaultProps: {},
    isCanvas: true,
    enabled: true,
  },
  {
    resolverKey: "CraftSkeleton",
    label: "Skeleton",
    category: "shadcn",
    icon: "RectangleHorizontal",
    defaultProps: {},
    enabled: false,
  },
  {
    resolverKey: "CraftSlider",
    label: "Slider",
    category: "shadcn",
    icon: "SlidersHorizontal",
    defaultProps: {},
    enabled: true,
  },
  {
    resolverKey: "CraftSwitch",
    label: "Switch",
    category: "shadcn",
    icon: "ToggleLeft",
    defaultProps: {},
    enabled: true,
  },
  {
    resolverKey: "CraftTabs",
    label: "Tabs",
    category: "shadcn",
    icon: "PanelTop",
    defaultProps: {},
    enabled: true,
  },
  {
    resolverKey: "CraftTextarea",
    label: "Textarea",
    category: "shadcn",
    icon: "AlignLeft",
    defaultProps: {},
    enabled: true,
  },
  {
    resolverKey: "CraftToggle",
    label: "Toggle",
    category: "shadcn",
    icon: "ToggleRight",
    defaultProps: { text: "Toggle" },
    enabled: true,
  },
  {
    resolverKey: "CraftToggleGroup",
    label: "Toggle Group",
    category: "shadcn",
    icon: "Group",
    defaultProps: {},
    enabled: true,
  },
  // Phase 2: Complex components
  {
    resolverKey: "CraftSelect",
    label: "Select",
    category: "shadcn",
    icon: "ChevronDown",
    defaultProps: {},
    enabled: true,
  },
  {
    resolverKey: "CraftCombobox",
    label: "Combobox",
    category: "shadcn",
    icon: "ChevronsUpDown",
    defaultProps: {},
    enabled: true,
  },
  {
    resolverKey: "CraftCalendar",
    label: "Calendar",
    category: "shadcn",
    icon: "Calendar",
    defaultProps: {},
    enabled: false,
  },
  {
    resolverKey: "CraftResizable",
    label: "Resizable",
    category: "shadcn",
    icon: "GripVertical",
    defaultProps: {},
    enabled: true,
  },
  {
    resolverKey: "CraftCarousel",
    label: "Carousel",
    category: "shadcn",
    icon: "GalleryHorizontal",
    defaultProps: {},
    enabled: false,
  },
  {
    resolverKey: "CraftChart",
    label: "Chart",
    category: "shadcn",
    icon: "BarChart3",
    defaultProps: {},
    enabled: false,
  },
  {
    resolverKey: "CraftForm",
    label: "Form",
    category: "shadcn",
    icon: "FileInput",
    defaultProps: {},
    enabled: false,
  },
  // Phase 4: Overlay components (standalone kept in palette)
  {
    resolverKey: "CraftNavigationMenu",
    label: "Navigation Menu",
    category: "shadcn",
    icon: "Navigation",
    defaultProps: {},
    enabled: false,
  },
  {
    resolverKey: "CraftMenubar",
    label: "Menubar",
    category: "shadcn",
    icon: "Menu",
    defaultProps: {},
    enabled: false,
  },
  {
    resolverKey: "CraftCommand",
    label: "Command",
    category: "shadcn",
    icon: "Terminal",
    defaultProps: {},
    enabled: false,
  },
];
