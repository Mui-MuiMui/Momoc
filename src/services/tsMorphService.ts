import {
  Project,
  SyntaxKind,
  type SourceFile,
  type JsxElement,
  type JsxSelfClosingElement,
  type JsxOpeningElement,
} from "ts-morph";

let cachedProject: Project | null = null;

function getProject(): Project {
  if (!cachedProject) {
    cachedProject = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: {
        jsx: 2, // React
        target: 99, // ESNext
        module: 99,
      },
    });
  }
  return cachedProject;
}

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

export interface JsxNodeInfo {
  tagName: string;
  props: Record<string, string>;
  children: JsxNodeInfo[];
  startLine: number;
  endLine: number;
}

export async function parseJsxTree(content: string): Promise<JsxNodeInfo[]> {
  if (!content.trim()) return [];

  const project = getProject();
  const sourceFile = project.createSourceFile("temp.tsx", content);

  await yieldToEventLoop();

  const defaultExport = findDefaultExportFunction(sourceFile);
  if (!defaultExport) {
    sourceFile.delete();
    return [];
  }

  const returnStatement = defaultExport.getDescendantsOfKind(
    SyntaxKind.ReturnStatement,
  )[0];
  if (!returnStatement) {
    sourceFile.delete();
    return [];
  }

  const rootJsx =
    returnStatement.getFirstDescendantByKind(SyntaxKind.JsxElement) ||
    returnStatement.getFirstDescendantByKind(
      SyntaxKind.JsxSelfClosingElement,
    );

  if (!rootJsx) {
    sourceFile.delete();
    return [];
  }

  const result = [extractJsxNodeInfo(rootJsx)];
  sourceFile.delete();
  return result;
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

const CRAFT_ID_ATTR = "data-craft-id";

export async function updateJsxProp(
  content: string,
  craftId: string,
  propName: string,
  propValue: string,
): Promise<string> {
  const project = getProject();
  const sourceFile = project.createSourceFile("update.tsx", content);

  await yieldToEventLoop();

  const allJsx = [
    ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxElement),
    ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
  ];

  for (const jsx of allJsx) {
    const opening =
      jsx.getKind() === SyntaxKind.JsxElement
        ? (jsx as JsxElement).getOpeningElement()
        : (jsx as JsxSelfClosingElement);

    const attrs = opening.getAttributes();

    const idAttr = attrs
      .map((a) => a.asKind(SyntaxKind.JsxAttribute))
      .find((a) => a?.getNameNode().getText() === CRAFT_ID_ATTR);

    if (!idAttr) continue;
    if (idAttr.getInitializer()?.getText() !== `"${craftId}"`) continue;

    let found = false;
    for (const attr of attrs) {
      const jsxAttr = attr.asKind(SyntaxKind.JsxAttribute);
      if (jsxAttr && jsxAttr.getNameNode().getText() === propName) {
        jsxAttr.replaceWithText(`${propName}=${propValue}`);
        found = true;
        break;
      }
    }

    if (!found) {
      opening.addAttribute({ name: propName, initializer: propValue });
    }

    break;
  }

  const result = sourceFile.getFullText();
  sourceFile.delete();
  return result;
}

export async function getComponentName(
  content: string,
): Promise<string | null> {
  if (!content.trim()) return null;
  const project = getProject();
  const sourceFile = project.createSourceFile("name.tsx", content);

  await yieldToEventLoop();

  const fn = findDefaultExportFunction(sourceFile);
  const name = fn?.getName() || null;
  sourceFile.delete();
  return name;
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

