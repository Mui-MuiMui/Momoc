import type { MocDocument, MocMetadata, MocMemo, MocEditorData } from "../shared/types.js";
import { DEFAULT_METADATA, MOC_VERSION } from "../shared/constants.js";

const MOC_COMMENT_REGEX = /\/\*\*[\s\S]*?\*\//;
const MOC_TAG_REGEX = /@moc-(\w[\w-]*)\s+(.+)/g;
const MOC_MEMO_REGEX = /@moc-memo\s+#(\S+)\s+"([^"]+)"/g;
const EDITOR_DATA_REGEX = /\/\*\s*@moc-editor-data[\s\S]*?DATA:([A-Za-z0-9+/=]+)\s*\*\//;

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
      id: "",
      intent: "",
      memos: [],
    };
  }

  const comment = commentMatch[0];
  const tags: Record<string, string> = {};

  let match;
  const tagRegex = new RegExp(MOC_TAG_REGEX.source, "g");
  while ((match = tagRegex.exec(comment)) !== null) {
    const key = match[1];
    const value = match[2].trim();
    if (key !== "memo") {
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

  return {
    version: tags["version"] || MOC_VERSION,
    id: tags["id"] || "",
    intent: tags["intent"] || "",
    theme: (tags["theme"] as "light" | "dark") || DEFAULT_METADATA.theme,
    layout:
      (tags["layout"] as "flow" | "absolute") || DEFAULT_METADATA.layout,
    viewport:
      (tags["viewport"] as "desktop" | "tablet" | "mobile") ||
      DEFAULT_METADATA.viewport,
    memos,
    craftState: tags["craft-state"] || undefined,
    selection: undefined,
  };
}

function parseEditorData(content: string): MocEditorData | undefined {
  const match = content.match(EDITOR_DATA_REGEX);
  if (!match) return undefined;

  try {
    const decoded = Buffer.from(match[1], "base64").toString("utf-8");
    return JSON.parse(decoded) as MocEditorData;
  } catch {
    return undefined;
  }
}

function splitContent(content: string): {
  imports: string;
  tsxSource: string;
} {
  // Remove metadata comment block and editor-data block
  let withoutComment = content.replace(MOC_COMMENT_REGEX, "");
  withoutComment = withoutComment.replace(EDITOR_DATA_REGEX, "");
  withoutComment = withoutComment.trim();

  const lines = withoutComment.split("\n");
  const importLines: string[] = [];
  let importEnd = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (
      line.startsWith("import ") ||
      line.startsWith("import{") ||
      (importLines.length > 0 && !line.startsWith("export ") && !line.match(/^(function|const|let|var|class)\s/))
    ) {
      importLines.push(lines[i]);
      importEnd = i + 1;
    } else if (line === "" && importLines.length > 0) {
      importLines.push(lines[i]);
      importEnd = i + 1;
    } else if (importLines.length > 0 || line !== "") {
      break;
    }
  }

  const imports = importLines.join("\n").trim();
  const tsxSource = lines.slice(importEnd).join("\n").trim();

  return { imports, tsxSource };
}

export function extractComponentName(tsxSource: string): string | null {
  const match = tsxSource.match(
    /export\s+default\s+function\s+(\w+)/,
  );
  return match ? match[1] : null;
}
