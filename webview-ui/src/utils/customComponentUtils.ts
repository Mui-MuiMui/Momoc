import { type NodeTree, type Node as CraftNode } from "@craftjs/core";
import { resolvers } from "../crafts/resolvers";
import { CraftGroup } from "../crafts/layout/CraftGroup";

export function freshId(): string {
  return Math.random().toString(36).slice(2, 12);
}

export function cloneTreeWithFreshIds(tree: NodeTree): NodeTree {
  const idMap = new Map<string, string>();
  for (const oldId of Object.keys(tree.nodes)) {
    idMap.set(oldId, freshId());
  }
  const remapId = (id: string) => idMap.get(id) || id;
  const newNodes: Record<string, CraftNode> = {};
  for (const [oldId, node] of Object.entries(tree.nodes)) {
    const newId = idMap.get(oldId)!;
    const newData = {
      ...node.data,
      props: { ...node.data.props },
      custom: { ...(node.data.custom || {}) },
      parent: node.data.parent ? remapId(node.data.parent) : node.data.parent,
      nodes: (node.data.nodes || []).map(remapId),
      linkedNodes: Object.fromEntries(
        Object.entries(node.data.linkedNodes || {}).map(([k, v]) => [k, remapId(v as string)]),
      ),
    };
    newNodes[newId] = {
      id: newId,
      data: newData,
      info: { ...(node.info || {}) },
      related: { ...(node.related || {}) },
      events: { selected: false, dragged: false, hovered: false },
      rules: node.rules,
      dom: null,
      _hydrationTimestamp: Date.now(),
    } as unknown as CraftNode;
  }
  return { rootNodeId: idMap.get(tree.rootNodeId)!, nodes: newNodes };
}

/**
 * コンポーネントdir相対の .moc パスをページdir相対に変換する。
 * 絶対パスは一切 craftState に書き込まない（環境依存のため）。
 */
export function rebaseMocPath(componentDir: string, pageDir: string, p: string): string {
  if (!p) return p;
  const toSlash = (s: string) => s.replace(/\\/g, "/");
  const compParts = toSlash(componentDir).split("/");
  const pgParts = toSlash(pageDir).split("/");
  const resolved = [...compParts];
  for (const part of toSlash(p).split("/")) {
    if (part === "..") resolved.pop();
    else if (part !== ".") resolved.push(part);
  }
  let common = 0;
  while (
    common < pgParts.length &&
    common < resolved.length &&
    pgParts[common].toLowerCase() === resolved[common].toLowerCase()
  ) {
    common++;
  }
  const ups = pgParts.length - common;
  const rest = resolved.slice(common);
  return [...Array(ups).fill(".."), ...rest].join("/") || ".";
}

/**
 * スカラー型 .moc パスを保持するプロパティキー（新コンポーネント追加時はここに追記）。
 * 複合型（カンマ区切りの linkedMocPaths、JSON blob の buttonData）は
 * rebaseNodeMocPaths 内の個別ブロックで処理されるため、ここには含まない。
 */
export const MOC_PATH_PROP_KEYS = ["linkedMocPath", "contextMenuMocPath", "hoverCardMocPath"] as const;

/** ノードの props 内の全 .moc パス属性をページdir相対に変換して返す */
export function rebaseNodeMocPaths(
  props: Record<string, unknown>,
  componentDir: string,
  pageDir: string,
): Record<string, unknown> {
  const fixed = { ...props };
  // スカラー型パス
  for (const key of MOC_PATH_PROP_KEYS) {
    const val = fixed[key] as string | undefined;
    if (val) fixed[key] = rebaseMocPath(componentDir, pageDir, val);
  }
  // 複合型パス（カンマ区切り）
  if (fixed.linkedMocPaths) {
    fixed.linkedMocPaths = (fixed.linkedMocPaths as string)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((p) => rebaseMocPath(componentDir, pageDir, p))
      .join(",");
  }
  // 複合型パス（JSON blob）
  if (fixed.buttonData) {
    try {
      const btns = JSON.parse(fixed.buttonData as string) as Array<{ linkedMocPath?: string }>;
      fixed.buttonData = JSON.stringify(
        btns.map((btn) =>
          btn.linkedMocPath
            ? { ...btn, linkedMocPath: rebaseMocPath(componentDir, pageDir, btn.linkedMocPath) }
            : btn,
        ),
      );
    } catch { /* ignore */ }
  }
  return fixed;
}

type CraftRulesHost = {
  craft?: {
    rules?: {
      canDrag?: () => boolean;
      canDrop?: () => boolean;
      canMoveIn?: (...args: unknown[]) => boolean;
      canMoveOut?: () => boolean;
    };
  };
};

/** craftState JSON → NodeTree に変換し、ROOT の子ノードを CraftGroup で包む */
export function buildGroupTreeFromCraftState(
  craftStateJson: string,
  componentFilePath?: string,
  pageFilePath?: string,
  customComponentId?: string,
): NodeTree | null {
  try {
    const getDirname = (p: string) => p.replace(/\\/g, "/").replace(/\/[^/]+$/, "");
    const componentDir = componentFilePath ? getDirname(componentFilePath) : null;
    const pageDir = pageFilePath ? getDirname(pageFilePath) : null;
    const needsRebase =
      componentDir !== null &&
      pageDir !== null &&
      componentDir.toLowerCase() !== pageDir.toLowerCase();

    const craftState = JSON.parse(craftStateJson) as Record<
      string,
      {
        type: { resolvedName: string } | string;
        props: Record<string, unknown>;
        nodes: string[];
        linkedNodes: Record<string, string>;
        parent: string | null;
        isCanvas?: boolean;
        displayName?: string;
        custom?: Record<string, unknown>;
      }
    >;

    const rootNode = craftState["ROOT"];
    if (!rootNode) return null;
    const childIds = rootNode.nodes || [];
    if (childIds.length === 0) return null;

    // 外接矩形の計算
    let minTop = Infinity;
    let minLeft = Infinity;
    let maxBottom = -Infinity;
    let maxRight = -Infinity;

    for (const childId of childIds) {
      const child = craftState[childId];
      if (!child) continue;
      const top = parseInt(String(child.props?.top || "0"), 10);
      const left = parseInt(String(child.props?.left || "0"), 10);
      const width = parseInt(String(child.props?.width || "100"), 10);
      const height = parseInt(String(child.props?.height || "40"), 10);
      if (top < minTop) minTop = top;
      if (left < minLeft) minLeft = left;
      if (top + height > maxBottom) maxBottom = top + height;
      if (left + width > maxRight) maxRight = left + width;
    }
    if (minTop === Infinity) { minTop = 0; minLeft = 0; maxBottom = 200; maxRight = 200; }

    const groupWidth = Math.max(maxRight - minLeft, 40);
    const groupHeight = Math.max(maxBottom - minTop, 40);

    const groupId = freshId();
    const nodes: Record<string, CraftNode> = {};

    const craftRules = CraftGroup.craft?.rules;
    nodes[groupId] = {
      id: groupId,
      data: {
        type: CraftGroup,
        name: "CraftGroup",
        displayName: "Group",
        isCanvas: true,
        props: { width: `${groupWidth}px`, height: `${groupHeight}px`, className: "" },
        nodes: [],
        linkedNodes: {},
        parent: "ROOT",
        custom: { customComponentId: customComponentId ?? "" },
        hidden: false,
      },
      info: {},
      related: {},
      events: { selected: false, dragged: false, hovered: false },
      rules: {
        canDrag: craftRules?.canDrag ?? (() => true),
        canDrop: craftRules?.canDrop ?? (() => true),
        canMoveIn: craftRules?.canMoveIn ?? (() => true),
        canMoveOut: craftRules?.canMoveOut ?? (() => true),
      },
      dom: null,
      _hydrationTimestamp: Date.now(),
    } as unknown as CraftNode;

    const childNodeIds: string[] = [];
    for (const childId of childIds) {
      const child = craftState[childId];
      if (!child) continue;

      const resolvedName = typeof child.type === "string" ? child.type : child.type?.resolvedName || "CraftDiv";
      const typeFn = resolvers[resolvedName as keyof typeof resolvers];
      if (!typeFn) continue;

      const childRules = (typeFn as CraftRulesHost).craft?.rules;

      const origTop = parseInt(String(child.props?.top || "0"), 10);
      const origLeft = parseInt(String(child.props?.left || "0"), 10);
      const adjustedProps = needsRebase
        ? rebaseNodeMocPaths(
            { ...child.props, top: `${origTop - minTop}px`, left: `${origLeft - minLeft}px` },
            componentDir!,
            pageDir!,
          )
        : { ...child.props, top: `${origTop - minTop}px`, left: `${origLeft - minLeft}px` };

      nodes[childId] = {
        id: childId,
        data: {
          type: typeFn,
          name: resolvedName,
          displayName: child.displayName || resolvedName,
          isCanvas: child.isCanvas ?? false,
          props: adjustedProps,
          nodes: child.nodes || [],
          linkedNodes: child.linkedNodes || {},
          parent: groupId,
          custom: child.custom || {},
          hidden: false,
        },
        info: {},
        related: {},
        events: { selected: false, dragged: false, hovered: false },
        rules: {
          canDrag: childRules?.canDrag ?? (() => true),
          canDrop: childRules?.canDrop ?? (() => true),
          canMoveIn: childRules?.canMoveIn ?? (() => true),
          canMoveOut: childRules?.canMoveOut ?? (() => true),
        },
        dom: null,
        _hydrationTimestamp: Date.now(),
      } as unknown as CraftNode;
      childNodeIds.push(childId);

      function addDescendants(nodeId: string, parentId: string): void {
        const n = craftState[nodeId];
        if (!n) return;
        const nResolvedName = typeof n.type === "string" ? n.type : n.type?.resolvedName || "CraftDiv";
        const nTypeFn = resolvers[nResolvedName as keyof typeof resolvers];
        if (!nTypeFn) return;
        const nRules = (nTypeFn as CraftRulesHost).craft?.rules;
        nodes[nodeId] = {
          id: nodeId,
          data: {
            type: nTypeFn,
            name: nResolvedName,
            displayName: n.displayName || nResolvedName,
            isCanvas: n.isCanvas ?? false,
            props: needsRebase ? rebaseNodeMocPaths({ ...n.props }, componentDir!, pageDir!) : { ...n.props },
            nodes: n.nodes || [],
            linkedNodes: n.linkedNodes || {},
            parent: parentId,
            custom: n.custom || {},
            hidden: false,
          },
          info: {},
          related: {},
          events: { selected: false, dragged: false, hovered: false },
          rules: {
            canDrag: nRules?.canDrag ?? (() => true),
            canDrop: nRules?.canDrop ?? (() => true),
            canMoveIn: nRules?.canMoveIn ?? (() => true),
            canMoveOut: nRules?.canMoveOut ?? (() => true),
          },
          dom: null,
          _hydrationTimestamp: Date.now(),
        } as unknown as CraftNode;
        for (const childId of n.nodes || []) {
          addDescendants(childId, nodeId);
        }
        for (const linkedId of Object.values(n.linkedNodes || {})) {
          addDescendants(linkedId as string, nodeId);
        }
      }

      for (const grandChildId of child.nodes || []) {
        addDescendants(grandChildId, childId);
      }
      for (const linkedId of Object.values(child.linkedNodes || {})) {
        addDescendants(linkedId as string, childId);
      }
    }

    (nodes[groupId].data as unknown as { nodes: string[] }).nodes = childNodeIds;

    const tree: NodeTree = { rootNodeId: groupId, nodes };
    return cloneTreeWithFreshIds(tree);
  } catch {
    return null;
  }
}
