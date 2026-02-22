import { useEffect, useRef, useState } from "react";
import { useEditor } from "@craftjs/core";
import { getVsCodeApi } from "../../utils/vscodeApi";
import { IconCombobox } from "./IconCombobox";

/** Mapping of property names to their allowed values (select options). */
const PROP_OPTIONS: Record<string, string[]> = {
  variant: ["default", "destructive", "outline", "secondary", "ghost", "link"],
  size: ["default", "sm", "lg", "icon"],
  tag: ["p", "span", "h1", "h2", "h3", "h4", "h5", "h6"],
  type: ["text", "email", "password", "number", "tel", "url", "search"],
  display: ["flex", "grid"],
  flexDirection: ["row", "column"],
  justifyContent: ["start", "center", "end", "between", "around", "evenly"],
  alignItems: ["start", "center", "end", "stretch", "baseline"],
  orientation: ["horizontal", "vertical"],
  objectFit: ["cover", "contain", "fill", "none", "scale-down"],
  overlayType: ["none", "dialog", "alert-dialog", "sheet", "drawer", "popover", "dropdown-menu"],
  sheetSide: ["top", "right", "bottom", "left"],
  tooltipSide: ["", "top", "right", "bottom", "left"],
  tooltipTrigger: ["hover", "focus"],
  toastPosition: ["bottom-right", "bottom-left", "top-right", "top-left"],
};

/** Property names that have a smaller set of variant options per component. */
const COMPONENT_PROP_OPTIONS: Record<string, Record<string, string[]>> = {
  Badge: {
    variant: ["default", "secondary", "destructive", "outline"],
  },
  Accordion: {
    type: ["single", "multiple"],
  },
  Alert: {
    variant: ["default", "destructive"],
  },
  Toggle: {
    variant: ["default", "outline"],
  },
  ToggleGroup: {
    type: ["single", "multiple"],
  },
  Chart: {
    chartType: ["bar", "line", "pie"],
  },
  RadioGroup: {
    orientation: ["vertical", "horizontal"],
    variant: ["default", "card"],
  },
  Resizable: {
    direction: ["horizontal", "vertical"],
  },
  Dialog: {
    variant: ["default", "destructive", "outline", "secondary", "ghost", "link"],
  },
  Sheet: {
    side: ["top", "right", "bottom", "left"],
  },
};

const INPUT_CLASS =
  "rounded border border-[var(--vscode-input-border,#3c3c3c)] bg-[var(--vscode-input-background,#3c3c3c)] px-2 py-1 text-xs text-[var(--vscode-input-foreground,#ccc)] focus:outline-none focus:ring-1 focus:ring-[var(--vscode-focusBorder,#007fd4)]";

/** Props that support multiline text input (rendered as textarea). */
const MULTILINE_PROPS = new Set(["text", "title", "description", "placeholder", "label", "triggerText", "tooltipText", "toastText"]);

/** Props that use the .moc file browse UI (text input + browse button). */
const MOC_PATH_PROPS = new Set(["linkedMocPath", "contextMenuMocPath"]);

/** Props that use the color palette picker UI. */
const COLOR_PALETTE_PROPS = new Set(["cardBorderColor", "cardBgColor", "descriptionColor"]);

/**
 * Tailwind CSS v4 default color palette (from tailwindcss/dist/colors.js).
 * Values are oklch() strings — usable directly as CSS color values.
 */
const TW_SHADE_KEYS = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"] as const;
const TW_COLOR_FAMILIES: Record<string, Record<string, string>> = {
  slate:   { "50": "oklch(98.4% 0.003 247.858)", "100": "oklch(96.8% 0.007 247.896)", "200": "oklch(92.9% 0.013 255.508)", "300": "oklch(86.9% 0.022 252.894)", "400": "oklch(70.4% 0.04 256.788)", "500": "oklch(55.4% 0.046 257.417)", "600": "oklch(44.6% 0.043 257.281)", "700": "oklch(37.2% 0.044 257.287)", "800": "oklch(27.9% 0.041 260.031)", "900": "oklch(20.8% 0.042 265.755)", "950": "oklch(12.9% 0.042 264.695)" },
  gray:    { "50": "oklch(98.5% 0.002 247.839)", "100": "oklch(96.7% 0.003 264.542)", "200": "oklch(92.8% 0.006 264.531)", "300": "oklch(87.2% 0.01 258.338)", "400": "oklch(70.7% 0.022 261.325)", "500": "oklch(55.1% 0.027 264.364)", "600": "oklch(44.6% 0.03 256.802)", "700": "oklch(37.3% 0.034 259.733)", "800": "oklch(27.8% 0.033 256.848)", "900": "oklch(21% 0.034 264.665)", "950": "oklch(13% 0.028 261.692)" },
  zinc:    { "50": "oklch(98.5% 0 0)", "100": "oklch(96.7% 0.001 286.375)", "200": "oklch(92% 0.004 286.32)", "300": "oklch(87.1% 0.006 286.286)", "400": "oklch(70.5% 0.015 286.067)", "500": "oklch(55.2% 0.016 285.938)", "600": "oklch(44.2% 0.017 285.786)", "700": "oklch(37% 0.013 285.805)", "800": "oklch(27.4% 0.006 286.033)", "900": "oklch(21% 0.006 285.885)", "950": "oklch(14.1% 0.005 285.823)" },
  neutral: { "50": "oklch(98.5% 0 0)", "100": "oklch(97% 0 0)", "200": "oklch(92.2% 0 0)", "300": "oklch(87% 0 0)", "400": "oklch(70.8% 0 0)", "500": "oklch(55.6% 0 0)", "600": "oklch(43.9% 0 0)", "700": "oklch(37.1% 0 0)", "800": "oklch(26.9% 0 0)", "900": "oklch(20.5% 0 0)", "950": "oklch(14.5% 0 0)" },
  stone:   { "50": "oklch(98.5% 0.001 106.423)", "100": "oklch(97% 0.001 106.424)", "200": "oklch(92.3% 0.003 48.717)", "300": "oklch(86.9% 0.005 56.366)", "400": "oklch(70.9% 0.01 56.259)", "500": "oklch(55.3% 0.013 58.071)", "600": "oklch(44.4% 0.011 73.639)", "700": "oklch(37.4% 0.01 67.558)", "800": "oklch(26.8% 0.007 34.298)", "900": "oklch(21.6% 0.006 56.043)", "950": "oklch(14.7% 0.004 49.25)" },
  red:     { "50": "oklch(97.1% 0.013 17.38)", "100": "oklch(93.6% 0.032 17.717)", "200": "oklch(88.5% 0.062 18.334)", "300": "oklch(80.8% 0.114 19.571)", "400": "oklch(70.4% 0.191 22.216)", "500": "oklch(63.7% 0.237 25.331)", "600": "oklch(57.7% 0.245 27.325)", "700": "oklch(50.5% 0.213 27.518)", "800": "oklch(44.4% 0.177 26.899)", "900": "oklch(39.6% 0.141 25.723)", "950": "oklch(25.8% 0.092 26.042)" },
  orange:  { "50": "oklch(98% 0.016 73.684)", "100": "oklch(95.4% 0.038 75.164)", "200": "oklch(90.1% 0.076 70.697)", "300": "oklch(83.7% 0.128 66.29)", "400": "oklch(75% 0.183 55.934)", "500": "oklch(70.5% 0.213 47.604)", "600": "oklch(64.6% 0.222 41.116)", "700": "oklch(55.3% 0.195 38.402)", "800": "oklch(47% 0.157 37.304)", "900": "oklch(40.8% 0.123 38.172)", "950": "oklch(26.6% 0.079 36.259)" },
  amber:   { "50": "oklch(98.7% 0.022 95.277)", "100": "oklch(96.2% 0.059 95.617)", "200": "oklch(92.4% 0.12 95.746)", "300": "oklch(87.9% 0.169 91.605)", "400": "oklch(82.8% 0.189 84.429)", "500": "oklch(76.9% 0.188 70.08)", "600": "oklch(66.6% 0.179 58.318)", "700": "oklch(55.5% 0.163 48.998)", "800": "oklch(47.3% 0.137 46.201)", "900": "oklch(41.4% 0.112 45.904)", "950": "oklch(27.9% 0.077 45.635)" },
  yellow:  { "50": "oklch(98.7% 0.026 102.212)", "100": "oklch(97.3% 0.071 103.193)", "200": "oklch(94.5% 0.129 101.54)", "300": "oklch(90.5% 0.182 98.111)", "400": "oklch(85.2% 0.199 91.936)", "500": "oklch(79.5% 0.184 86.047)", "600": "oklch(68.1% 0.162 75.834)", "700": "oklch(55.4% 0.135 66.442)", "800": "oklch(47.6% 0.114 61.907)", "900": "oklch(42.1% 0.095 57.708)", "950": "oklch(28.6% 0.066 53.813)" },
  lime:    { "50": "oklch(98.6% 0.031 120.757)", "100": "oklch(96.7% 0.067 122.328)", "200": "oklch(93.8% 0.127 124.321)", "300": "oklch(89.7% 0.196 126.665)", "400": "oklch(84.1% 0.238 128.85)", "500": "oklch(76.8% 0.233 130.85)", "600": "oklch(64.8% 0.2 131.684)", "700": "oklch(53.2% 0.157 131.589)", "800": "oklch(45.3% 0.124 130.933)", "900": "oklch(40.5% 0.101 131.063)", "950": "oklch(27.4% 0.072 132.109)" },
  green:   { "50": "oklch(98.2% 0.018 155.826)", "100": "oklch(96.2% 0.044 156.743)", "200": "oklch(92.5% 0.084 155.995)", "300": "oklch(87.1% 0.15 154.449)", "400": "oklch(79.2% 0.209 151.711)", "500": "oklch(72.3% 0.219 149.579)", "600": "oklch(62.7% 0.194 149.214)", "700": "oklch(52.7% 0.154 150.069)", "800": "oklch(44.8% 0.119 151.328)", "900": "oklch(39.3% 0.095 152.535)", "950": "oklch(26.6% 0.065 152.934)" },
  emerald: { "50": "oklch(97.9% 0.021 166.113)", "100": "oklch(95% 0.052 163.051)", "200": "oklch(90.5% 0.093 164.15)", "300": "oklch(84.5% 0.143 164.978)", "400": "oklch(76.5% 0.177 163.223)", "500": "oklch(69.6% 0.17 162.48)", "600": "oklch(59.6% 0.145 163.225)", "700": "oklch(50.8% 0.118 165.612)", "800": "oklch(43.2% 0.095 166.913)", "900": "oklch(37.8% 0.077 168.94)", "950": "oklch(26.2% 0.051 172.552)" },
  teal:    { "50": "oklch(98.4% 0.014 180.72)", "100": "oklch(95.3% 0.051 180.801)", "200": "oklch(91% 0.096 180.426)", "300": "oklch(85.5% 0.138 181.071)", "400": "oklch(77.7% 0.152 181.912)", "500": "oklch(70.4% 0.14 182.503)", "600": "oklch(60% 0.118 184.704)", "700": "oklch(51.1% 0.096 186.391)", "800": "oklch(43.7% 0.078 188.216)", "900": "oklch(38.6% 0.063 188.416)", "950": "oklch(27.7% 0.046 192.524)" },
  cyan:    { "50": "oklch(98.4% 0.019 200.873)", "100": "oklch(95.6% 0.045 203.388)", "200": "oklch(91.7% 0.08 205.041)", "300": "oklch(86.5% 0.127 207.078)", "400": "oklch(78.9% 0.154 211.53)", "500": "oklch(71.5% 0.143 215.221)", "600": "oklch(60.9% 0.126 221.723)", "700": "oklch(52% 0.105 223.128)", "800": "oklch(45% 0.085 224.283)", "900": "oklch(39.8% 0.07 227.392)", "950": "oklch(30.2% 0.056 229.695)" },
  sky:     { "50": "oklch(97.7% 0.013 236.62)", "100": "oklch(95.1% 0.026 236.824)", "200": "oklch(90.1% 0.058 230.902)", "300": "oklch(82.8% 0.111 230.318)", "400": "oklch(74.6% 0.16 232.661)", "500": "oklch(68.5% 0.169 237.323)", "600": "oklch(58.8% 0.158 241.966)", "700": "oklch(50% 0.134 242.749)", "800": "oklch(44.3% 0.11 240.79)", "900": "oklch(39.1% 0.09 240.876)", "950": "oklch(29.3% 0.066 243.157)" },
  blue:    { "50": "oklch(97% 0.014 254.604)", "100": "oklch(93.2% 0.032 255.585)", "200": "oklch(88.2% 0.059 254.128)", "300": "oklch(80.9% 0.105 251.813)", "400": "oklch(70.7% 0.165 254.624)", "500": "oklch(62.3% 0.214 259.815)", "600": "oklch(54.6% 0.245 262.881)", "700": "oklch(48.8% 0.243 264.376)", "800": "oklch(42.4% 0.199 265.638)", "900": "oklch(37.9% 0.146 265.522)", "950": "oklch(28.2% 0.091 267.935)" },
  indigo:  { "50": "oklch(96.2% 0.018 272.314)", "100": "oklch(93% 0.034 272.788)", "200": "oklch(87% 0.065 274.039)", "300": "oklch(78.5% 0.115 274.713)", "400": "oklch(67.3% 0.182 276.935)", "500": "oklch(58.5% 0.233 277.117)", "600": "oklch(51.1% 0.262 276.966)", "700": "oklch(45.7% 0.24 277.023)", "800": "oklch(39.8% 0.195 277.366)", "900": "oklch(35.9% 0.144 278.697)", "950": "oklch(25.7% 0.09 281.288)" },
  violet:  { "50": "oklch(96.9% 0.016 293.756)", "100": "oklch(94.3% 0.029 294.588)", "200": "oklch(89.4% 0.057 293.283)", "300": "oklch(81.1% 0.111 293.571)", "400": "oklch(70.2% 0.183 293.541)", "500": "oklch(60.6% 0.25 292.717)", "600": "oklch(54.1% 0.281 293.009)", "700": "oklch(49.1% 0.27 292.581)", "800": "oklch(43.2% 0.232 292.759)", "900": "oklch(38% 0.189 293.745)", "950": "oklch(28.3% 0.141 291.089)" },
  purple:  { "50": "oklch(97.7% 0.014 308.299)", "100": "oklch(94.6% 0.033 307.174)", "200": "oklch(90.2% 0.063 306.703)", "300": "oklch(82.7% 0.119 306.383)", "400": "oklch(71.4% 0.203 305.504)", "500": "oklch(62.7% 0.265 303.9)", "600": "oklch(55.8% 0.288 302.321)", "700": "oklch(49.6% 0.265 301.924)", "800": "oklch(43.8% 0.218 303.724)", "900": "oklch(38.1% 0.176 304.987)", "950": "oklch(29.1% 0.149 302.717)" },
  fuchsia: { "50": "oklch(97.7% 0.017 320.058)", "100": "oklch(95.2% 0.037 318.852)", "200": "oklch(90.3% 0.076 319.62)", "300": "oklch(83.3% 0.145 321.434)", "400": "oklch(74% 0.238 322.16)", "500": "oklch(66.7% 0.295 322.15)", "600": "oklch(59.1% 0.293 322.896)", "700": "oklch(51.8% 0.253 323.949)", "800": "oklch(45.2% 0.211 324.591)", "900": "oklch(40.1% 0.17 325.612)", "950": "oklch(29.3% 0.136 325.661)" },
  pink:    { "50": "oklch(97.1% 0.014 343.198)", "100": "oklch(94.8% 0.028 342.258)", "200": "oklch(89.9% 0.061 343.231)", "300": "oklch(82.3% 0.12 346.018)", "400": "oklch(71.8% 0.202 349.761)", "500": "oklch(65.6% 0.241 354.308)", "600": "oklch(59.2% 0.249 0.584)", "700": "oklch(52.5% 0.223 3.958)", "800": "oklch(45.9% 0.187 3.815)", "900": "oklch(40.8% 0.153 2.432)", "950": "oklch(28.4% 0.109 3.907)" },
  rose:    { "50": "oklch(96.9% 0.015 12.422)", "100": "oklch(94.1% 0.03 12.58)", "200": "oklch(89.2% 0.058 10.001)", "300": "oklch(81% 0.117 11.638)", "400": "oklch(71.2% 0.194 13.428)", "500": "oklch(64.5% 0.246 16.439)", "600": "oklch(58.6% 0.253 17.585)", "700": "oklch(51.4% 0.222 16.935)", "800": "oklch(45.5% 0.188 13.697)", "900": "oklch(41% 0.159 10.272)", "950": "oklch(27.1% 0.105 12.094)" },
};
const TW_SPECIAL_COLORS: Record<string, string> = { black: "#000", white: "#fff" };
const TW_FAMILY_NAMES = Object.keys(TW_COLOR_FAMILIES);

/** Reverse lookup: oklch value → "colorName-shade" label */
function findTwColorLabel(value: string): string | null {
  for (const [name, shades] of Object.entries(TW_COLOR_FAMILIES)) {
    for (const [shade, oklch] of Object.entries(shades)) {
      if (oklch === value) return `${name}-${shade}`;
    }
  }
  for (const [name, val] of Object.entries(TW_SPECIAL_COLORS)) {
    if (val === value) return name;
  }
  return null;
}

/** overlayClassName presets */
const OVERLAY_CLASS_PRESETS: { label: string; value: string }[] = [
  { label: "(custom)", value: "" },
  { label: "Default", value: "rounded-lg border p-6 shadow-lg" },
  { label: "Minimal", value: "border-0 shadow-none p-4" },
  { label: "Compact", value: "p-2 rounded-sm" },
  { label: "Spacious", value: "p-8 rounded-xl shadow-xl" },
  { label: "Borderless", value: "border-0 shadow-lg rounded-xl p-6" },
];

// --- Property grouping ---

type PropGroup = "basic" | "overlay" | "interaction" | "layout" | "other";

const GROUP_LABELS: Record<PropGroup, string> = {
  basic: "Basic",
  overlay: "Overlay",
  interaction: "Interaction",
  layout: "Layout",
  other: "Other",
};

const GROUP_ORDER: PropGroup[] = ["basic", "overlay", "interaction", "layout", "other"];

const PROP_TO_GROUP: Record<string, PropGroup> = {
  // Basic
  text: "basic", label: "basic", title: "basic", description: "basic",
  variant: "basic", size: "basic", type: "basic", disabled: "basic",
  checked: "basic", pressed: "basic", placeholder: "basic", htmlFor: "basic",
  items: "basic", value: "basic", rows: "basic", columns: "basic",
  hasHeader: "basic", src: "basic", alt: "basic", fallback: "basic",
  open: "basic", step: "basic", min: "basic", max: "basic",
  icon: "basic", ratio: "basic", chartType: "basic", direction: "basic",
  totalPages: "basic", currentPage: "basic", triggerText: "basic",
  side: "basic", role: "basic", descriptions: "basic",
  cardBorderColor: "basic", cardBgColor: "basic", descriptionColor: "basic",
  // Overlay
  overlayType: "overlay", linkedMocPath: "overlay", sheetSide: "overlay",
  overlayWidth: "overlay", overlayHeight: "overlay", overlayClassName: "overlay",
  contextMenuMocPath: "overlay",
  linkedMocPaths: "overlay",
  // Interaction
  tooltipText: "interaction", tooltipSide: "interaction", tooltipTrigger: "interaction", toastText: "interaction", toastPosition: "interaction",
  // Layout
  width: "layout", height: "layout",
  display: "layout", flexDirection: "layout", justifyContent: "layout",
  alignItems: "layout", gap: "layout", gridCols: "layout",
  orientation: "layout", objectFit: "layout", keepAspectRatio: "layout",
  tag: "layout",
};

function getPropGroup(key: string): PropGroup {
  return PROP_TO_GROUP[key] || "other";
}

export function PropEditor() {
  const { selectedProps, actions, selectedNodeId, componentName } = useEditor(
    (state) => {
      const nodeId = state.events.selected?.values().next().value;
      if (!nodeId)
        return {
          selectedProps: null,
          selectedNodeId: null,
          componentName: "",
        };

      const node = state.nodes[nodeId];
      return {
        selectedProps: node?.data?.props || {},
        selectedNodeId: nodeId,
        componentName: node?.data?.displayName || node?.data?.name || "",
      };
    },
  );

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const pendingBrowseIndexRef = useRef<number>(-1);

  // Listen for browse:mocFile:result messages from extension
  useEffect(() => {
    const listener = (event: MessageEvent) => {
      const msg = event.data;
      if (msg?.type === "browse:mocFile:result" && selectedNodeId) {
        const { relativePath, targetProp } = msg.payload as { relativePath: string; targetProp?: string };
        if (targetProp === "linkedMocPaths" && pendingBrowseIndexRef.current >= 0) {
          const idx = pendingBrowseIndexRef.current;
          pendingBrowseIndexRef.current = -1;
          actions.setProp(selectedNodeId, (props: Record<string, unknown>) => {
            const paths = (String(props.linkedMocPaths || "")).split(",");
            while (paths.length <= idx) paths.push("");
            paths[idx] = relativePath;
            props.linkedMocPaths = paths.join(",");
          });
        } else {
          actions.setProp(selectedNodeId, (props: Record<string, unknown>) => {
            props[targetProp || "linkedMocPath"] = relativePath;
          });
        }
      }
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [selectedNodeId, actions]);

  if (!selectedProps || !selectedNodeId) {
    return null;
  }

  const handlePropChange = (key: string, value: unknown) => {
    actions.setProp(selectedNodeId, (props: Record<string, unknown>) => {
      props[key] = value;
    });
  };

  const getOptions = (key: string): string[] | null => {
    const componentOverride = COMPONENT_PROP_OPTIONS[componentName]?.[key];
    if (componentOverride) return componentOverride;
    return PROP_OPTIONS[key] || null;
  };

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  // Group properties
  const propEntries = Object.entries(selectedProps).filter(
    ([key]) => key !== "children" && key !== "className",
  );

  const grouped = new Map<PropGroup, [string, unknown][]>();
  for (const entry of propEntries) {
    const group = getPropGroup(entry[0]);
    if (!grouped.has(group)) grouped.set(group, []);
    grouped.get(group)!.push(entry);
  }

  // Filter to groups that have at least one property
  const activeGroups = GROUP_ORDER.filter((g) => grouped.has(g));
  // If only 1 group, don't show group headers (flat layout)
  const showGroupHeaders = activeGroups.length > 1;

  function renderProp(key: string, value: unknown) {
    // Custom UI for icon (combobox with all Lucide icons)
    if (key === "icon") {
      return (
        <div key={key} className="flex flex-col gap-1">
          <label className="text-xs text-[var(--vscode-descriptionForeground,#888)]">
            {key}
          </label>
          <IconCombobox
            value={String(value ?? "")}
            onChange={(v) => handlePropChange(key, v)}
          />
        </div>
      );
    }

    // Custom UI for overlayClassName (preset select + text input)
    if (key === "overlayClassName") {
      const currentValue = String(value ?? "");
      const matchesPreset = OVERLAY_CLASS_PRESETS.some((p) => p.value === currentValue);
      return (
        <div key={key} className="flex flex-col gap-1">
          <label className="text-xs text-[var(--vscode-descriptionForeground,#888)]">
            {key}
          </label>
          <select
            value={matchesPreset ? currentValue : ""}
            onChange={(e) => handlePropChange(key, e.target.value)}
            className={`${INPUT_CLASS} w-full`}
          >
            {OVERLAY_CLASS_PRESETS.map((preset) => (
              <option key={preset.label} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={currentValue}
            onChange={(e) => handlePropChange(key, e.target.value)}
            className={`${INPUT_CLASS} w-full`}
            placeholder="Tailwind classes..."
          />
        </div>
      );
    }

    // Custom UI for color palette props (cardBorderColor, cardBgColor, descriptionColor)
    // 2-step: select color family → select shade
    if (COLOR_PALETTE_PROPS.has(key)) {
      const currentValue = String(value ?? "");
      const currentLabel = currentValue ? findTwColorLabel(currentValue) : null;
      // Determine currently selected family from the stored value
      const selectedFamily = (() => {
        if (!currentValue) return "";
        for (const [name, val] of Object.entries(TW_SPECIAL_COLORS)) {
          if (val === currentValue) return name;
        }
        for (const [name, shades] of Object.entries(TW_COLOR_FAMILIES)) {
          if (Object.values(shades).includes(currentValue)) return name;
        }
        return "";
      })();
      const shades = selectedFamily && TW_COLOR_FAMILIES[selectedFamily]
        ? TW_COLOR_FAMILIES[selectedFamily]
        : null;

      return (
        <div key={key} className="flex flex-col gap-1">
          <label className="text-xs text-[var(--vscode-descriptionForeground,#888)]">
            {key}
          </label>
          {/* Color family select */}
          <select
            value={selectedFamily}
            onChange={(e) => {
              const family = e.target.value;
              if (!family) {
                handlePropChange(key, "");
              } else if (TW_SPECIAL_COLORS[family]) {
                handlePropChange(key, TW_SPECIAL_COLORS[family]);
              } else if (TW_COLOR_FAMILIES[family]) {
                handlePropChange(key, TW_COLOR_FAMILIES[family]["500"]);
              }
            }}
            className={`${INPUT_CLASS} w-full`}
          >
            <option value="">(none)</option>
            <option value="black">black</option>
            <option value="white">white</option>
            {TW_FAMILY_NAMES.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          {/* Shade select (only for color families with shades) */}
          {shades && (
            <select
              value={currentValue}
              onChange={(e) => handlePropChange(key, e.target.value)}
              className={`${INPUT_CLASS} w-full`}
            >
              {TW_SHADE_KEYS.map((shade) => (
                <option key={shade} value={shades[shade]}>{shade}</option>
              ))}
            </select>
          )}
          {/* Preview */}
          {currentValue && (
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block h-4 w-4 rounded-sm border border-[var(--vscode-input-border,#3c3c3c)]"
                style={{ backgroundColor: currentValue }}
              />
              <span className="text-[10px] text-[var(--vscode-descriptionForeground,#888)]">
                {currentLabel || currentValue}
              </span>
            </div>
          )}
        </div>
      );
    }

    // Custom UI for descriptions: per-item text input linked to items
    if (key === "descriptions") {
      const itemsRaw = selectedProps?.items;
      const labels: string[] = typeof itemsRaw === "string"
        ? itemsRaw.split(",").map((s: string) => s.trim()).filter(Boolean)
        : [];
      const descs = String(value ?? "").split(",");

      return (
        <div key={key} className="flex flex-col gap-1">
          <label className="text-xs text-[var(--vscode-descriptionForeground,#888)]">
            {key}
          </label>
          {labels.length === 0 ? (
            <span className="text-[11px] italic text-[var(--vscode-descriptionForeground,#888)]">
              items が未設定です
            </span>
          ) : (
            <div className="flex flex-col gap-1.5">
              {labels.map((lbl, idx) => {
                const currentDesc = (descs[idx] || "").trim();
                return (
                  <div key={idx} className="flex flex-col gap-0.5">
                    <span className="truncate text-[11px] text-[var(--vscode-foreground,#ccc)]" title={lbl}>
                      {lbl}
                    </span>
                    <input
                      type="text"
                      value={currentDesc}
                      onChange={(e) => {
                        const newDescs = [...descs];
                        while (newDescs.length <= idx) newDescs.push("");
                        newDescs[idx] = e.target.value;
                        handlePropChange(key, newDescs.join(","));
                      }}
                      placeholder="説明文..."
                      className={`${INPUT_CLASS} w-full`}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    // Custom UI for linkedMocPaths: per-item .moc file browse
    if (key === "linkedMocPaths") {
      const itemsRaw = selectedProps?.items;
      const labels: string[] = typeof itemsRaw === "string"
        ? itemsRaw.split(",").map((s: string) => s.trim()).filter(Boolean)
        : [];
      const paths = String(value ?? "").split(",");

      return (
        <div key={key} className="flex flex-col gap-1">
          <label className="text-xs text-[var(--vscode-descriptionForeground,#888)]">
            {key}
          </label>
          {labels.length === 0 ? (
            <span className="text-[11px] italic text-[var(--vscode-descriptionForeground,#888)]">
              items が未設定です
            </span>
          ) : (
            <div className="flex flex-col gap-1">
              {labels.map((lbl, idx) => {
                const currentPath = (paths[idx] || "").trim();
                const shortPath = currentPath
                  ? currentPath.split("/").slice(-2).join("/")
                  : "";
                return (
                  <div key={idx} className="flex items-center gap-1">
                    <span className="min-w-[60px] truncate text-[11px] text-[var(--vscode-foreground,#ccc)]" title={lbl}>
                      {lbl}
                    </span>
                    <span
                      className="flex-1 truncate text-[11px] text-[var(--vscode-descriptionForeground,#888)]"
                      title={currentPath || "(未設定)"}
                    >
                      {shortPath || "(未設定)"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        pendingBrowseIndexRef.current = idx;
                        getVsCodeApi().postMessage({
                          type: "browse:mocFile",
                          payload: { currentPath, targetProp: "linkedMocPaths" },
                        });
                      }}
                      className="rounded border border-[var(--vscode-button-border,transparent)] bg-[var(--vscode-button-background,#0e639c)] px-1.5 py-0.5 text-[11px] text-[var(--vscode-button-foreground,#fff)] hover:opacity-90"
                      title="参照..."
                    >
                      ...
                    </button>
                    {currentPath && (
                      <button
                        type="button"
                        onClick={() => {
                          const newPaths = [...paths];
                          while (newPaths.length <= idx) newPaths.push("");
                          newPaths[idx] = "";
                          handlePropChange(key, newPaths.join(","));
                        }}
                        className="px-1 py-0.5 text-[11px] text-[var(--vscode-descriptionForeground,#888)] hover:text-[var(--vscode-errorForeground,#f44)]"
                        title="クリア"
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    // Custom UI for .moc file path props (linkedMocPath, contextMenuMocPath)
    if (MOC_PATH_PROPS.has(key)) {
      return (
        <div key={key} className="flex flex-col gap-1">
          <label className="text-xs text-[var(--vscode-descriptionForeground,#888)]">
            {key}
          </label>
          <div className="flex gap-1">
            <input
              type="text"
              value={String(value ?? "")}
              onChange={(e) => handlePropChange(key, e.target.value)}
              className={`${INPUT_CLASS} flex-1`}
              placeholder=".moc file path"
            />
            <button
              type="button"
              onClick={() => {
                getVsCodeApi().postMessage({
                  type: "browse:mocFile",
                  payload: { currentPath: String(value ?? ""), targetProp: key },
                });
              }}
              className="rounded border border-[var(--vscode-button-border,transparent)] bg-[var(--vscode-button-background,#0e639c)] px-2 py-1 text-xs text-[var(--vscode-button-foreground,#fff)] hover:opacity-90"
            >
              ...
            </button>
          </div>
        </div>
      );
    }

    const options = getOptions(key);

    return (
      <div key={key} className="flex flex-col gap-1">
        <label className="text-xs text-[var(--vscode-descriptionForeground,#888)]">
          {key}
        </label>
        {typeof value === "boolean" ? (
          <label className="flex items-center gap-2 text-xs text-[var(--vscode-foreground,#ccc)]">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => handlePropChange(key, e.target.checked)}
              className="h-4 w-4"
            />
            {value ? "true" : "false"}
          </label>
        ) : options ? (
          <select
            value={String(value ?? "")}
            onChange={(e) => handlePropChange(key, e.target.value)}
            className={`${INPUT_CLASS} w-full`}
          >
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : typeof value === "number" ? (
          <input
            type="number"
            value={value}
            onChange={(e) =>
              handlePropChange(key, Number(e.target.value))
            }
            className={`${INPUT_CLASS} w-full`}
          />
        ) : MULTILINE_PROPS.has(key) ? (
          <textarea
            value={String(value ?? "")}
            onChange={(e) => handlePropChange(key, e.target.value)}
            rows={2}
            className={`${INPUT_CLASS} w-full resize-y`}
          />
        ) : (
          <input
            type="text"
            value={String(value ?? "")}
            onChange={(e) => handlePropChange(key, e.target.value)}
            className={`${INPUT_CLASS} w-full`}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Read-only node ID */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-[var(--vscode-descriptionForeground,#888)]">
          id
        </label>
        <input
          type="text"
          value={selectedNodeId}
          readOnly
          className={`${INPUT_CLASS} w-full cursor-default opacity-60`}
          title={selectedNodeId}
          onClick={(e) => (e.target as HTMLInputElement).select()}
        />
      </div>

      {activeGroups.map((group) => {
        const entries = grouped.get(group)!;
        const isCollapsed = collapsedGroups.has(group);

        return (
          <div key={group}>
            {showGroupHeaders && (
              <button
                type="button"
                onClick={() => toggleGroup(group)}
                className="flex w-full items-center gap-1 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--vscode-descriptionForeground,#888)] hover:text-[var(--vscode-foreground,#ccc)]"
              >
                <span className="text-[10px]">{isCollapsed ? "\u25b6" : "\u25bc"}</span>
                {GROUP_LABELS[group]}
                <span className="ml-auto text-[10px] font-normal opacity-60">{entries.length}</span>
              </button>
            )}
            {!isCollapsed && (
              <div className="flex flex-col gap-2">
                {entries.map(([key, value]) => renderProp(key, value))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
