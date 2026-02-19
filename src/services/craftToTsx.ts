/**
 * Converts Craft.js serialized state JSON into TSX source code and import statements.
 */

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
};

/** Default prop values to omit from generated TSX */
const DEFAULT_PROPS: Record<string, Record<string, unknown>> = {
  CraftButton: { variant: "default", size: "default", disabled: false, text: "Button" },
  CraftInput: { type: "text", placeholder: "Enter text...", disabled: false },
  CraftBadge: { variant: "default", text: "Badge" },
  CraftSeparator: { orientation: "horizontal" },
  CraftText: { tag: "p", text: "Text" },
  CraftImage: { alt: "Placeholder" },
  CraftLabel: { text: "Label" },
  CraftCard: { title: "Card Title", description: "" },
  CraftContainer: {
    display: "flex", flexDirection: "column", justifyContent: "start",
    alignItems: "stretch", gap: "4", gridCols: 3,
  },
};

export function craftStateToTsx(
  craftState: CraftSerializedState,
  componentName = "MockPage",
): { imports: string; tsxSource: string } {
  if (!craftState || !craftState.ROOT) {
    return { imports: "", tsxSource: `export default function ${componentName}() {\n  return <div />;\n}` };
  }

  const usedImports = new Map<string, Set<string>>();

  function collectImports(nodeId: string): void {
    const node = craftState[nodeId];
    if (!node) return;

    const resolvedName = getResolvedName(node);
    const mapping = COMPONENT_MAP[resolvedName];
    if (mapping?.importFrom && mapping?.importName) {
      if (!usedImports.has(mapping.importFrom)) {
        usedImports.set(mapping.importFrom, new Set());
      }
      usedImports.get(mapping.importFrom)!.add(mapping.importName);
    }

    for (const childId of node.nodes || []) {
      collectImports(childId);
    }
    for (const linkedId of Object.values(node.linkedNodes || {})) {
      collectImports(linkedId);
    }
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
        return `${pad}<${tag}${propsStr}${classNameAttr}${styleAttr}>\n${cardBody.join("\n")}\n${pad}</${tag}>`;
      }
      return `${pad}<${tag}${propsStr}${classNameAttr}${styleAttr} />`;
    }

    // Table special case: render as static table
    if (resolvedName === "CraftTable") {
      return renderTable(node.props, tag, propsStr, classNameAttr, styleAttr, pad);
    }

    // Self-closing for img
    if (resolvedName === "CraftImage") {
      return `${pad}<${tag}${propsStr}${classNameAttr}${styleAttr} />`;
    }

    // Self-closing for Separator
    if (resolvedName === "CraftSeparator") {
      return `${pad}<${tag}${propsStr}${classNameAttr}${styleAttr} />`;
    }

    // Self-closing for Input
    if (resolvedName === "CraftInput") {
      return `${pad}<${tag}${propsStr}${classNameAttr}${styleAttr} />`;
    }

    // Container with children
    if (mapping.isContainer && children.length > 0) {
      const renderedChildren = children
        .map((id) => renderNode(id, indent + 1))
        .filter(Boolean);
      return `${pad}<${tag}${classNameAttr}${styleAttr}>\n${renderedChildren.join("\n")}\n${pad}</${tag}>`;
    }

    // Text content
    if (textContent) {
      return `${pad}<${tag}${propsStr}${classNameAttr}${styleAttr}>${escapeJsx(textContent)}</${tag}>`;
    }

    // Empty container
    if (mapping.isContainer) {
      return `${pad}<${tag}${classNameAttr}${styleAttr} />`;
    }

    // Fallback self-closing
    return `${pad}<${tag}${propsStr}${classNameAttr}${styleAttr} />`;
  }

  // Collect imports from tree
  collectImports("ROOT");

  // Render the tree starting from ROOT's children
  const rootNode = craftState.ROOT;
  const rootChildren = rootNode.nodes || [];
  const renderedBody = rootChildren
    .map((id) => renderNode(id, 2))
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

  // Build TSX source
  let tsxSource: string;
  if (renderedBody) {
    const rootClassAttr = rootCombinedClass ? ` className="${rootCombinedClass}"` : "";
    tsxSource = `export default function ${componentName}() {\n  return (\n    <div${rootClassAttr}${rootStyleAttr}>\n${renderedBody}\n    </div>\n  );\n}`;
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
  const parts: string[] = [];
  if (w && w !== "auto") parts.push(`width: "${w}"`);
  if (h && h !== "auto") parts.push(`height: "${h}"`);
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

function escapeJsx(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/{/g, "&#123;").replace(/}/g, "&#125;");
}

function escapeAttr(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
