import { brotliDecompressSync } from "zlib";
import type { MocDocument, MocMetadata, MocMemo, MocEditorData } from "../shared/types.js";
import { DEFAULT_METADATA, MOC_VERSION } from "../shared/constants.js";

const MOC_COMMENT_REGEX = /\/\*\*[\s\S]*?\*\//;
// Match only actual metadata tags (` * @moc-key value`), not description block lines (`*   @moc-key`).
// Using `\* @moc-` (asterisk + single space) excludes indented description block lines.
// `[^\S\n]*` allows optional non-newline whitespace, `(.*)` allows empty values.
const MOC_TAG_REGEX = /\* @moc-(\w[\w-]*)[^\S\n]*(.*)/g;
const MOC_MEMO_REGEX = /@moc-memo\s+#(\S+)\s+"([^"]+)"/g;
const EDITOR_DATA_REGEX = /const\s+__mocEditorData\s*=\s*`([\s\S]*?)`;/;

export function parseMocFile(content: string): MocDocument {
  const metadata = parseMetadata(content);
  const editorData = parseEditorData(content);
  const { imports, tsxSource } = splitContent(content);

  return {
    metadata,
    imports,
    tsxSource,
    rawContent: content,
    editorData,
  };
}

function parseMetadata(content: string): MocMetadata {
  const commentMatch = content.match(MOC_COMMENT_REGEX);
  if (!commentMatch) {
    return {
      ...DEFAULT_METADATA,
      intent: "",
      memos: [],
    };
  }

  const comment = commentMatch[0];
  const tags: Record<string, string> = {};
  const componentEntries: Array<[string, { displayName: string; props: Record<string, { type: string; default: unknown }> }]> = [];

  let match;
  const tagRegex = new RegExp(MOC_TAG_REGEX.source, "g");
  while ((match = tagRegex.exec(comment)) !== null) {
    const key = match[1];
    const value = match[2].trim();
    if (key === "memo") {
      // handled below
    } else if (key === "component") {
      // @moc-component <Name> <JSON>
      const spaceIdx = value.indexOf(" ");
      if (spaceIdx !== -1) {
        const name = value.slice(0, spaceIdx);
        const json = value.slice(spaceIdx + 1);
        try {
          const schema = JSON.parse(json) as { displayName: string; props: Record<string, { type: string; default: unknown }> };
          componentEntries.push([name, schema]);
        } catch {
          // invalid JSON: ignore
        }
      }
    } else {
      tags[key] = value;
    }
  }

  const memos: MocMemo[] = [];
  const memoRegex = new RegExp(MOC_MEMO_REGEX.source, "g");
  while ((match = memoRegex.exec(comment)) !== null) {
    memos.push({
      targetId: match[1],
      text: match[2],
    });
  }

  const theme = tags["theme"] === "dark" ? "dark" : DEFAULT_METADATA.theme;
  const layout = tags["layout"] === "absolute" ? "absolute" : DEFAULT_METADATA.layout;

  const componentSchemas = componentEntries.length > 0
    ? Object.fromEntries(componentEntries)
    : undefined;

  return {
    version: tags["version"] || MOC_VERSION,
    intent: tags["intent"] || "",
    theme,
    layout,
    viewport: tags["viewport"] || DEFAULT_METADATA.viewport,
    memos,
    craftState: tags["craft-state"] || undefined,
    selection: undefined,
    componentSchemas,
  };
}

function parseEditorData(content: string): MocEditorData | undefined {
  const match = content.match(EDITOR_DATA_REGEX);
  if (!match) return undefined;

  try {
    const raw = match[1].trim();
    if (raw.startsWith("brotli:")) {
      // v1.2.0: Brotli + Base64
      const base64 = raw.slice("brotli:".length);
      const buf = Buffer.from(base64, "base64");
      const json = brotliDecompressSync(buf).toString();
      return JSON.parse(json) as MocEditorData;
    }
    // v1.0.0-1.1.0: 生JSON（後方互換）
    const unescaped = raw
      .replace(/\\`/g, "`")
      .replace(/\\\$/g, "$");
    return JSON.parse(unescaped) as MocEditorData;
  } catch {
    return undefined;
  }
}

const IMPORTS_START = "/* @moc-imports-start */";
const IMPORTS_END = "/* @moc-imports-end */";
const TSX_START = "/* @moc-tsx-start */";
const TSX_END = "/* @moc-tsx-end */";

function splitContent(content: string): {
  imports: string;
  tsxSource: string;
} {
  // Remove metadata comment block and editor-data block
  let cleaned = content.replace(MOC_COMMENT_REGEX, "");
  cleaned = cleaned.replace(EDITOR_DATA_REGEX, "");

  const importsStart = cleaned.indexOf(IMPORTS_START);
  const importsEnd = cleaned.indexOf(IMPORTS_END);
  const tsxStart = cleaned.indexOf(TSX_START);
  const tsxEnd = cleaned.indexOf(TSX_END);

  const imports = (importsStart !== -1 && importsEnd !== -1)
    ? cleaned.slice(importsStart + IMPORTS_START.length, importsEnd).trim()
    : "";

  const tsxSource = (tsxStart !== -1 && tsxEnd !== -1)
    ? cleaned.slice(tsxStart + TSX_START.length, tsxEnd).trim()
    : cleaned.trim(); // フォールバック: マーカーなし → 全体をtsxSourceとして返す

  return { imports, tsxSource };
}

export function extractComponentName(tsxSource: string): string | null {
  const match = tsxSource.match(
    /export\s+default\s+function\s+(\w+)/,
  );
  return match ? match[1] : null;
}
