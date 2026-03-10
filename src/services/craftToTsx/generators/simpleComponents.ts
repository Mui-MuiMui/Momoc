/**
 * Simple components that only need mapping + defaultProps (no custom rendering or import logic).
 */

import { registerGenerator } from "../registry.js";

// CraftPlaceholderImage
registerGenerator("CraftPlaceholderImage", {
  mapping: { tag: "img", propsMap: ["src", "alt", "className"], isContainer: false },
  defaultProps: { alt: "Placeholder", keepAspectRatio: false },
});

// CraftImage
registerGenerator("CraftImage", {
  mapping: { tag: "img", propsMap: ["src", "alt", "className"], isContainer: false },
  defaultProps: { alt: "", objectFit: "cover", keepAspectRatio: false },
});

// CraftInput
registerGenerator("CraftInput", {
  mapping: { tag: "Input", importFrom: "@/components/ui/input", importName: "Input", propsMap: ["type", "placeholder", "disabled", "className"], isContainer: false },
  defaultProps: { type: "text", disabled: false, tooltipText: "", tooltipSide: "", tooltipTrigger: "hover" },
});

// CraftLabel
registerGenerator("CraftLabel", {
  mapping: { tag: "Label", importFrom: "@/components/ui/label", importName: "Label", propsMap: ["htmlFor", "className"], textProp: "text", isContainer: false },
  defaultProps: { text: "Label", tooltipText: "", tooltipSide: "" },
});

// CraftBadge
registerGenerator("CraftBadge", {
  mapping: { tag: "Badge", importFrom: "@/components/ui/badge", importName: "Badge", propsMap: ["variant", "className"], textProp: "text", isContainer: false },
  defaultProps: { variant: "default", text: "Badge", tooltipText: "", tooltipSide: "" },
});

// CraftSeparator
registerGenerator("CraftSeparator", {
  mapping: { tag: "Separator", importFrom: "@/components/ui/separator", importName: "Separator", propsMap: ["orientation", "className"], isContainer: false },
  defaultProps: { orientation: "horizontal" },
});

// CraftCheckbox
registerGenerator("CraftCheckbox", {
  mapping: { tag: "Checkbox", importFrom: "@/components/ui/checkbox", importName: "Checkbox", propsMap: ["checked", "disabled", "checkedColor", "uncheckedColor", "className"], textProp: "label", isContainer: false },
  defaultProps: { label: "Accept terms", checked: false, disabled: false, tooltipText: "", tooltipSide: "" },
});

// CraftProgress
registerGenerator("CraftProgress", {
  mapping: { tag: "Progress", importFrom: "@/components/ui/progress", importName: "Progress", propsMap: ["value", "className", "indicatorClass"], isContainer: false },
  defaultProps: { value: 50, indicatorClass: "" },
});

// CraftScrollArea
registerGenerator("CraftScrollArea", {
  mapping: { tag: "ScrollArea", importFrom: "@/components/ui/scroll-area", importName: "ScrollArea", propsMap: ["className"], isContainer: true },
  defaultProps: {},
});

// CraftSlider
registerGenerator("CraftSlider", {
  mapping: { tag: "Slider", importFrom: "@/components/ui/slider", importName: "Slider", propsMap: ["value", "min", "max", "step", "fillClassName", "trackClassName", "className", "tooltipText", "tooltipSide"], isContainer: false },
  defaultProps: { value: 50, min: 0, max: 100, step: 1, fillClassName: "", trackClassName: "", tooltipText: "", tooltipSide: "" },
});

// CraftSwitch
registerGenerator("CraftSwitch", {
  mapping: { tag: "Switch", importFrom: "@/components/ui/switch", importName: "Switch", propsMap: ["checked", "disabled", "description", "invalid", "size", "variant", "checkedClassName", "uncheckedClassName", "cardBorderColor", "cardBgColor", "descriptionColor", "labelColor", "className", "tooltipText", "tooltipSide"], textProp: "label", isContainer: false },
  defaultProps: { label: "Toggle", checked: false, disabled: false, description: "", invalid: false, size: "default", variant: "default", checkedClassName: "", uncheckedClassName: "", cardBorderColor: "", cardBgColor: "", descriptionColor: "", labelColor: "", tooltipText: "", tooltipSide: "" },
});

// CraftTextarea
registerGenerator("CraftTextarea", {
  mapping: { tag: "Textarea", importFrom: "@/components/ui/textarea", importName: "Textarea", propsMap: ["placeholder", "rows", "disabled", "className"], isContainer: false },
  defaultProps: { disabled: false, tooltipText: "", tooltipSide: "", tooltipTrigger: "hover" },
});

// CraftCalendar
registerGenerator("CraftCalendar", {
  mapping: { tag: "Calendar", importFrom: "@/components/ui/calendar", importName: "Calendar", propsMap: ["className", "todayBgClass", "todayTextClass"], isContainer: false },
  defaultProps: { todayBgClass: "", todayTextClass: "" },
});

// CraftAspectRatio
registerGenerator("CraftAspectRatio", {
  mapping: { tag: "AspectRatio", importFrom: "@/components/ui/aspect-ratio", importName: "AspectRatio", propsMap: ["ratio", "width", "height", "className"], isContainer: true },
  defaultProps: { ratio: 1.78, width: "auto", height: "auto" },
});

// CraftAvatar
registerGenerator("CraftAvatar", {
  mapping: { tag: "Avatar", importFrom: "@/components/ui/avatar", importName: "Avatar", propsMap: ["src", "fallback", "size", "className", "tooltipText", "tooltipSide"], isContainer: false },
  defaultProps: { src: "", fallback: "AB", size: "default", width: "auto", height: "auto", tooltipText: "", tooltipSide: "" },
});
