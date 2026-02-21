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
import { CraftTable } from "./shadcn/CraftTable";
// Phase 1: Simple components
import { CraftAccordion } from "./shadcn/CraftAccordion";
import { CraftAlert } from "./shadcn/CraftAlert";
import { CraftAspectRatio } from "./shadcn/CraftAspectRatio";
import { CraftAvatar } from "./shadcn/CraftAvatar";
import { CraftBreadcrumb } from "./shadcn/CraftBreadcrumb";
import { CraftCheckbox } from "./shadcn/CraftCheckbox";
import { CraftCollapsible } from "./shadcn/CraftCollapsible";
import { CraftPagination } from "./shadcn/CraftPagination";
import { CraftProgress } from "./shadcn/CraftProgress";
import { CraftRadioGroup } from "./shadcn/CraftRadioGroup";
import { CraftScrollArea } from "./shadcn/CraftScrollArea";
import { CraftSkeleton } from "./shadcn/CraftSkeleton";
import { CraftSlider } from "./shadcn/CraftSlider";
import { CraftSwitch } from "./shadcn/CraftSwitch";
import { CraftTabs } from "./shadcn/CraftTabs";
import { CraftTextarea } from "./shadcn/CraftTextarea";
import { CraftToggle } from "./shadcn/CraftToggle";
import { CraftToggleGroup } from "./shadcn/CraftToggleGroup";
// Phase 2: Complex components
import { CraftSelect } from "./shadcn/CraftSelect";
import { CraftCalendar } from "./shadcn/CraftCalendar";
import { CraftResizable } from "./shadcn/CraftResizable";
import { CraftCarousel } from "./shadcn/CraftCarousel";
import { CraftChart } from "./shadcn/CraftChart";
import { CraftForm } from "./shadcn/CraftForm";

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
  // Phase 1
  CraftAccordion,
  CraftAlert,
  CraftAspectRatio,
  CraftAvatar,
  CraftBreadcrumb,
  CraftCheckbox,
  CraftCollapsible,
  CraftPagination,
  CraftProgress,
  CraftRadioGroup,
  CraftScrollArea,
  CraftSkeleton,
  CraftSlider,
  CraftSwitch,
  CraftTabs,
  CraftTextarea,
  CraftToggle,
  CraftToggleGroup,
  // Phase 2
  CraftSelect,
  CraftCalendar,
  CraftResizable,
  CraftCarousel,
  CraftChart,
  CraftForm,
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
  },
  {
    resolverKey: "CraftFreeCanvas",
    label: "Free Canvas",
    category: "layout",
    icon: "Move",
    defaultProps: {},
    isCanvas: true,
  },
  // HTML
  {
    resolverKey: "CraftDiv",
    label: "Div",
    category: "html",
    icon: "Square",
    defaultProps: {},
    isCanvas: true,
  },
  {
    resolverKey: "CraftText",
    label: "Text",
    category: "html",
    icon: "Type",
    defaultProps: { text: "Text" },
  },
  {
    resolverKey: "CraftImage",
    label: "Image",
    category: "html",
    icon: "Image",
    defaultProps: {},
  },
  {
    resolverKey: "CraftPlaceholderImage",
    label: "Placeholder Image",
    category: "html",
    icon: "ImageOff",
    defaultProps: {},
  },
  // shadcn/ui
  {
    resolverKey: "CraftButton",
    label: "Button",
    category: "shadcn",
    icon: "MousePointerClick",
    defaultProps: { text: "Button" },
  },
  {
    resolverKey: "CraftInput",
    label: "Input",
    category: "shadcn",
    icon: "TextCursorInput",
    defaultProps: {},
  },
  {
    resolverKey: "CraftCard",
    label: "Card",
    category: "shadcn",
    icon: "CreditCard",
    defaultProps: {},
    isCanvas: true,
  },
  {
    resolverKey: "CraftLabel",
    label: "Label",
    category: "shadcn",
    icon: "Tag",
    defaultProps: { text: "Label" },
  },
  {
    resolverKey: "CraftSeparator",
    label: "Separator",
    category: "shadcn",
    icon: "Minus",
    defaultProps: {},
  },
  {
    resolverKey: "CraftBadge",
    label: "Badge",
    category: "shadcn",
    icon: "Award",
    defaultProps: { text: "Badge" },
  },
  {
    resolverKey: "CraftTable",
    label: "Table",
    category: "shadcn",
    icon: "Table",
    defaultProps: {},
  },
  // Phase 1: Simple components
  {
    resolverKey: "CraftAccordion",
    label: "Accordion",
    category: "shadcn",
    icon: "ChevronsUpDown",
    defaultProps: {},
  },
  {
    resolverKey: "CraftAlert",
    label: "Alert",
    category: "shadcn",
    icon: "AlertCircle",
    defaultProps: {},
  },
  {
    resolverKey: "CraftAspectRatio",
    label: "Aspect Ratio",
    category: "shadcn",
    icon: "RatioIcon",
    defaultProps: {},
    isCanvas: true,
  },
  {
    resolverKey: "CraftAvatar",
    label: "Avatar",
    category: "shadcn",
    icon: "CircleUser",
    defaultProps: {},
  },
  {
    resolverKey: "CraftBreadcrumb",
    label: "Breadcrumb",
    category: "shadcn",
    icon: "ChevronRight",
    defaultProps: {},
  },
  {
    resolverKey: "CraftCheckbox",
    label: "Checkbox",
    category: "shadcn",
    icon: "CheckSquare",
    defaultProps: {},
  },
  {
    resolverKey: "CraftCollapsible",
    label: "Collapsible",
    category: "shadcn",
    icon: "ChevronsDownUp",
    defaultProps: {},
    isCanvas: true,
  },
  {
    resolverKey: "CraftPagination",
    label: "Pagination",
    category: "shadcn",
    icon: "ArrowLeftRight",
    defaultProps: {},
  },
  {
    resolverKey: "CraftProgress",
    label: "Progress",
    category: "shadcn",
    icon: "Loader",
    defaultProps: {},
  },
  {
    resolverKey: "CraftRadioGroup",
    label: "Radio Group",
    category: "shadcn",
    icon: "Circle",
    defaultProps: {},
  },
  {
    resolverKey: "CraftScrollArea",
    label: "Scroll Area",
    category: "shadcn",
    icon: "ScrollText",
    defaultProps: {},
    isCanvas: true,
  },
  {
    resolverKey: "CraftSkeleton",
    label: "Skeleton",
    category: "shadcn",
    icon: "RectangleHorizontal",
    defaultProps: {},
  },
  {
    resolverKey: "CraftSlider",
    label: "Slider",
    category: "shadcn",
    icon: "SlidersHorizontal",
    defaultProps: {},
  },
  {
    resolverKey: "CraftSwitch",
    label: "Switch",
    category: "shadcn",
    icon: "ToggleLeft",
    defaultProps: {},
  },
  {
    resolverKey: "CraftTabs",
    label: "Tabs",
    category: "shadcn",
    icon: "PanelTop",
    defaultProps: {},
  },
  {
    resolverKey: "CraftTextarea",
    label: "Textarea",
    category: "shadcn",
    icon: "AlignLeft",
    defaultProps: {},
  },
  {
    resolverKey: "CraftToggle",
    label: "Toggle",
    category: "shadcn",
    icon: "ToggleRight",
    defaultProps: { text: "Toggle" },
  },
  {
    resolverKey: "CraftToggleGroup",
    label: "Toggle Group",
    category: "shadcn",
    icon: "Group",
    defaultProps: {},
  },
  // Phase 2: Complex components
  {
    resolverKey: "CraftSelect",
    label: "Select",
    category: "shadcn",
    icon: "ChevronDown",
    defaultProps: {},
  },
  {
    resolverKey: "CraftCalendar",
    label: "Calendar",
    category: "shadcn",
    icon: "Calendar",
    defaultProps: {},
  },
  {
    resolverKey: "CraftResizable",
    label: "Resizable",
    category: "shadcn",
    icon: "GripVertical",
    defaultProps: {},
  },
  {
    resolverKey: "CraftCarousel",
    label: "Carousel",
    category: "shadcn",
    icon: "GalleryHorizontal",
    defaultProps: {},
  },
  {
    resolverKey: "CraftChart",
    label: "Chart",
    category: "shadcn",
    icon: "BarChart3",
    defaultProps: {},
  },
  {
    resolverKey: "CraftForm",
    label: "Form",
    category: "shadcn",
    icon: "FileInput",
    defaultProps: {},
  },
];
