import { CraftDiv } from "./html/CraftDiv";
import { CraftText } from "./html/CraftText";
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

export const resolvers = {
  CraftDiv,
  CraftText,
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
];
