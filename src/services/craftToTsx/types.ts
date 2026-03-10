/**
 * Core interfaces for the craftToTsx registry-based architecture.
 */

import type { MocEditorMemo } from "../../shared/types.js";

// ---------------------------------------------------------------------------
// Craft.js state types (re-exported for generators)
// ---------------------------------------------------------------------------

export interface CraftNodeData {
  type: { resolvedName: string } | string;
  props: Record<string, unknown>;
  nodes: string[];
  linkedNodes: Record<string, string>;
  parent: string | null;
  isCanvas?: boolean;
  displayName?: string;
  custom?: Record<string, unknown>;
}

export interface CraftSerializedState {
  [nodeId: string]: CraftNodeData;
}

// ---------------------------------------------------------------------------
// Component mapping (same shape as the original COMPONENT_MAP entries)
// ---------------------------------------------------------------------------

export interface ComponentMapping {
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

// ---------------------------------------------------------------------------
// Render context — shared utilities passed to each generator
// ---------------------------------------------------------------------------

export interface RenderContext {
  craftState: CraftSerializedState;
  renderNode: (nodeId: string, indent: number) => string;
  addImport: (from: string, name: string) => void;
  /** Trigger import collection for a child node (used by generators that manage their own children) */
  collectChildImports: (nodeId: string) => void;
  memos?: MocEditorMemo[];

  // Shared utility functions (from utils.ts)
  buildStyleAttr: (props: Record<string, unknown>, extraStyles?: Record<string, string>) => string;
  buildPropsString: (resolvedName: string, props: Record<string, unknown>, mapping: ComponentMapping) => string;
  buildContainerClasses: (props: Record<string, unknown>) => string;
  mergeContainerClasses: (containerClass: string, userClassName: string) => string;
  normalizeCssSize: (v: string | undefined) => string | undefined;
  escapeJsx: (text: string) => string;
  escapeAttr: (text: string) => string;
  escapeJsString: (text: string) => string;
  kbdTextToJsx: (text: string) => string;
  wrapWithOverlay: (rendered: string, props: Record<string, unknown>, pad: string) => string;
  buildMocComments: (nodeId: string, pad: string, props: Record<string, unknown>) => string;
  wrapWithTooltip: (rendered: string, props: Record<string, unknown>, pad: string, tooltipTrigger?: string) => string;
  wrapWithContextMenu: (rendered: string, props: Record<string, unknown>, pad: string) => string;
  wrapWithHoverCard: (rendered: string, props: Record<string, unknown>, pad: string) => string;
  applyCommonWrappers: (rendered: string, props: Record<string, unknown>, pad: string) => string;
}

// ---------------------------------------------------------------------------
// Component generator interface
// ---------------------------------------------------------------------------

export interface ComponentGenerator {
  mapping: ComponentMapping;
  defaultProps?: Record<string, unknown>;

  /**
   * Additional import collection. Base import (mapping.importFrom/importName)
   * is added automatically by the engine. Return "stop" to prevent child
   * node traversal (for components that manage their own children).
   */
  collectImports?: (node: CraftNodeData, ctx: RenderContext) => void | "stop";

  /**
   * Custom rendering. If omitted, the default rendering path is used.
   */
  render?: (nodeId: string, node: CraftNodeData, indent: number, ctx: RenderContext) => string;

  /**
   * If true, applyCommonWrappers (tooltip/contextMenu/hoverCard) is skipped.
   */
  skipCommonWrappers?: boolean;
}
