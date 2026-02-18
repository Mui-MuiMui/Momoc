export const MOC_FILE_EXTENSION = ".moc";
export const MOC_EDITOR_VIEW_TYPE = "mocker.mocEditor";
export const MOC_VERSION = "1.0.0";

export const VIEWPORT_WIDTHS: Record<string, number> = {
  desktop: 1280,
  tablet: 768,
  mobile: 375,
};

export const DEFAULT_METADATA = {
  version: MOC_VERSION,
  theme: "light" as const,
  layout: "flow" as const,
  viewport: "desktop" as const,
};
