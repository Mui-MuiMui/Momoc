import {
  Project,
  SyntaxKind,
  type SourceFile,
  type JsxElement,
  type JsxSelfClosingElement,
  type JsxOpeningElement,
} from "ts-morph";

const project = new Project({
  useInMemoryFileSystem: true,
  compilerOptions: {
    jsx: 2, // React
    target: 99, // ESNext
    module: 99,
  },
});

export interface JsxNodeInfo {
  tagName: string;
  props: Record<string, string>;
  children: JsxNodeInfo[];
  startLine: number;
  endLine: number;
}

export function parseJsxTree(content: string): JsxNodeInfo[] {
  if (!content.trim()) return [];

  const sourceFile = getOrCreateSourceFile("temp.tsx", content);
  const defaultExport = findDefaultExportFunction(sourceFile);
  if (!defaultExport) return [];

  const returnStatement = defaultExport.getDescendantsOfKind(
    SyntaxKind.ReturnStatement,
  )[0];
  if (!returnStatement) return [];

  const rootJsx =
    returnStatement.getFirstDescendantByKind(SyntaxKind.JsxElement) ||
    returnStatement.getFirstDescendantByKind(
      SyntaxKind.JsxSelfClosingElement,
    );

  if (!rootJsx) return [];

  return [extractJsxNodeInfo(rootJsx)];
}

function extractJsxNodeInfo(
  node: JsxElement | JsxSelfClosingElement,
): JsxNodeInfo {
  const isElement = node.getKind() === SyntaxKind.JsxElement;

  let tagName: string;
  let props: Record<string, string> = {};
  let children: JsxNodeInfo[] = [];

  if (isElement) {
    const element = node as JsxElement;
    tagName = element.getOpeningElement().getTagNameNode().getText();
    props = extractProps(element.getOpeningElement());

    for (const child of element.getJsxChildren()) {
      if (child.getKind() === SyntaxKind.JsxElement) {
        children.push(extractJsxNodeInfo(child as JsxElement));
      } else if (child.getKind() === SyntaxKind.JsxSelfClosingElement) {
        children.push(
          extractJsxNodeInfo(child as JsxSelfClosingElement),
        );
      }
    }
  } else {
    const selfClosing = node as JsxSelfClosingElement;
    tagName = selfClosing.getTagNameNode().getText();
    props = extractPropsFromSelfClosing(selfClosing);
  }

  return {
    tagName,
    props,
    children,
    startLine: node.getStartLineNumber(),
    endLine: node.getEndLineNumber(),
  };
}

function extractProps(
  element: JsxOpeningElement,
): Record<string, string> {
  return extractAttrsFromNode(element);
}

function extractPropsFromSelfClosing(
  element: JsxSelfClosingElement,
): Record<string, string> {
  return extractAttrsFromNode(element);
}

function extractAttrsFromNode(
  node: JsxOpeningElement | JsxSelfClosingElement,
): Record<string, string> {
  const props: Record<string, string> = {};
  const jsxAttrs = node.getDescendantsOfKind(SyntaxKind.JsxAttribute);

  for (const attr of jsxAttrs) {
    const nameNode = attr.getNameNode();
    const name = nameNode.getText();
    const initializer = attr.getInitializer();
    props[name] = initializer ? initializer.getText() : "true";
  }

  return props;
}

export function updateJsxProp(
  content: string,
  targetLine: number,
  propName: string,
  propValue: string,
): string {
  const sourceFile = getOrCreateSourceFile("update.tsx", content);

  const allJsx = [
    ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxElement),
    ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
  ];

  for (const jsx of allJsx) {
    if (jsx.getStartLineNumber() === targetLine) {
      const opening =
        jsx.getKind() === SyntaxKind.JsxElement
          ? (jsx as JsxElement).getOpeningElement()
          : (jsx as JsxSelfClosingElement);

      const attrs = opening.getAttributes();
      let found = false;

      for (const attr of attrs) {
        const jsxAttr = attr.asKind(SyntaxKind.JsxAttribute);
        if (jsxAttr && jsxAttr.getName() === propName) {
          jsxAttr.replaceWithText(`${propName}=${propValue}`);
          found = true;
          break;
        }
      }

      if (!found) {
        // Add new attribute
        const text = opening.getText();
        const closeIdx = text.lastIndexOf(
          jsx.getKind() === SyntaxKind.JsxSelfClosingElement ? "/>" : ">",
        );
        if (closeIdx > 0) {
          opening.replaceWithText(
            text.slice(0, closeIdx) +
              ` ${propName}=${propValue}` +
              text.slice(closeIdx),
          );
        }
      }

      break;
    }
  }

  return sourceFile.getFullText();
}

export function getComponentName(content: string): string | null {
  if (!content.trim()) return null;
  const sourceFile = getOrCreateSourceFile("name.tsx", content);
  const fn = findDefaultExportFunction(sourceFile);
  return fn?.getName() || null;
}

function findDefaultExportFunction(sourceFile: SourceFile) {
  const functions = sourceFile.getFunctions();
  for (const fn of functions) {
    if (fn.isDefaultExport()) {
      return fn;
    }
  }
  return null;
}

function getOrCreateSourceFile(name: string, content: string): SourceFile {
  const existing = project.getSourceFile(name);
  if (existing) {
    existing.replaceWithText(content);
    return existing;
  }
  return project.createSourceFile(name, content);
}
