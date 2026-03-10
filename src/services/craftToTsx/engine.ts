/**
 * Core engine for craftToTsx: import collection + render dispatch.
 * Replaces the monolithic craftStateToTsx function.
 */

import type { MocEditorMemo } from "../../shared/types.js";
import type { CraftSerializedState, RenderContext } from "./types.js";
import { getGenerator, getAllGenerators } from "./registry.js";
import { defaultRender } from "./defaultRenderer.js";
import {
  buildStyleAttr,
  buildPropsString as buildPropsStringUtil,
  buildContainerClasses,
  mergeContainerClasses,
  normalizeCssSize,
  escapeJsx,
  escapeAttr,
  escapeJsString,
  kbdTextToJsx,
  wrapWithOverlay,
  buildMocComments as buildMocCommentsUtil,
  wrapWithTooltip,
  wrapWithContextMenu,
  wrapWithHoverCard,
  applyCommonWrappers as applyCommonWrappersUtil,
  getResolvedName,
  TOOLTIP_IMPORT,
  CONTEXT_MENU_IMPORT,
  OVERLAY_IMPORTS,
} from "./utils.js";

/**
 * Collect all DEFAULT_PROPS from registered generators.
 */
function collectAllDefaultProps(): Record<string, Record<string, unknown>> {
  const result: Record<string, Record<string, unknown>> = {};
  for (const [name, gen] of getAllGenerators()) {
    if (gen.defaultProps) {
      result[name] = gen.defaultProps;
    }
  }
  return result;
}

export function craftStateToTsx(
  craftState: CraftSerializedState,
  componentName = "MockPage",
  memos?: MocEditorMemo[],
): { imports: string; tsxSource: string } {
  try {
    if (!craftState || !craftState.ROOT) {
      return { imports: "", tsxSource: `export default function ${componentName}() {\n  return <div />;\n}` };
    }

    const allDefaultProps = collectAllDefaultProps();
    const usedImports = new Map<string, Set<string>>();

    function addImport(from: string, name: string): void {
      if (!usedImports.has(from)) {
        usedImports.set(from, new Set());
      }
      usedImports.get(from)!.add(name);
    }

    // Build the render context
    const ctx: RenderContext = {
      craftState,
      renderNode,
      addImport,
      collectChildImports: (nodeId: string) => collectImports(nodeId),
      memos,
      buildStyleAttr,
      buildPropsString: (resolvedName, props, mapping) =>
        buildPropsStringUtil(resolvedName, props, mapping, allDefaultProps),
      buildContainerClasses,
      mergeContainerClasses,
      normalizeCssSize,
      escapeJsx,
      escapeAttr,
      escapeJsString,
      kbdTextToJsx,
      wrapWithOverlay,
      buildMocComments: (nodeId, pad, props) =>
        buildMocCommentsUtil(nodeId, pad, props, memos),
      wrapWithTooltip,
      wrapWithContextMenu,
      wrapWithHoverCard,
      applyCommonWrappers: (rendered, props, pad) => {
        const tooltipTrigger = (props?.tooltipTrigger as string) || "hover";
        return applyCommonWrappersUtil(rendered, props, pad, tooltipTrigger);
      },
    };

    // -----------------------------------------------------------------------
    // Import collection walk
    // -----------------------------------------------------------------------
    function collectImports(nodeId: string): void {
      const node = craftState[nodeId];
      if (!node) return;

      const resolvedName = getResolvedName(node);
      const gen = getGenerator(resolvedName);

      if (!gen) {
        // Unknown component — no imports to collect
        return;
      }

      // Auto-add base import from mapping
      if (gen.mapping.importFrom && gen.mapping.importName) {
        addImport(gen.mapping.importFrom, gen.mapping.importName);
      }

      // Cross-cutting: tooltip imports
      const tooltipText = node.props?.tooltipText as string | undefined;
      if (tooltipText) {
        for (const name of TOOLTIP_IMPORT.names) {
          addImport(TOOLTIP_IMPORT.from, name);
        }
      }

      // Cross-cutting: context menu imports
      const contextMenuMocPath = node.props?.contextMenuMocPath as string | undefined;
      if (contextMenuMocPath) {
        for (const name of CONTEXT_MENU_IMPORT.names) {
          addImport(CONTEXT_MENU_IMPORT.from, name);
        }
      }

      // Cross-cutting: hover-card imports
      const hoverCardMocPathProp = node.props?.hoverCardMocPath as string | undefined;
      if (hoverCardMocPathProp) {
        const hcImport = OVERLAY_IMPORTS["hover-card"];
        for (const name of hcImport.names) {
          addImport(hcImport.from, name);
        }
      }

      // Component-specific import collection
      const result = gen.collectImports?.(node, ctx);

      // If "stop" returned, skip child traversal
      if (result === "stop") return;

      // Default child traversal
      for (const childId of node.nodes || []) {
        collectImports(childId);
      }
      for (const linkedId of Object.values(node.linkedNodes || {})) {
        collectImports(linkedId);
      }
    }

    // -----------------------------------------------------------------------
    // Render dispatch
    // -----------------------------------------------------------------------
    function renderNode(nodeId: string, indent: number): string {
      const node = craftState[nodeId];
      if (!node) return "";

      const resolvedName = getResolvedName(node);
      const gen = getGenerator(resolvedName);
      const pad = "  ".repeat(indent);

      if (!gen) {
        return `${pad}{/* Unknown: ${resolvedName} */}`;
      }

      let rendered: string;
      if (gen.render) {
        rendered = gen.render(nodeId, node, indent, ctx);
      } else {
        rendered = defaultRender(nodeId, node, indent, ctx, gen.mapping, resolvedName);
      }

      // Apply common wrappers unless explicitly skipped
      if (!gen.skipCommonWrappers) {
        const tooltipTrigger = (node.props?.tooltipTrigger as string) || "hover";
        rendered = applyCommonWrappersUtil(rendered, node.props, pad, tooltipTrigger);
      }

      return rendered;
    }

    // -----------------------------------------------------------------------
    // Main execution
    // -----------------------------------------------------------------------

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
      const rootMocComments = buildMocCommentsUtil("ROOT", "      ", rootNode.props, memos);
      tsxSource = `export default function ${componentName}() {\n  return (\n    <>\n${rootMocComments}\n      <div${rootClassAttr}${rootStyleAttr}>\n${renderedBody}\n      </div>\n    </>\n  );\n}`;
    } else {
      tsxSource = `export default function ${componentName}() {\n  return <div />;\n}`;
    }

    return { imports, tsxSource };
  } catch (err) {
    throw new Error(`craftStateToTsx failed: ${err}`);
  }
}
