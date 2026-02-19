import * as vscode from "vscode";
import * as path from "path";

export async function isProjectInitialized(
  workspaceRoot: string,
): Promise<boolean> {
  const componentsJsonPath = path.join(workspaceRoot, "components.json");
  try {
    await vscode.workspace.fs.stat(vscode.Uri.file(componentsJsonPath));
    return true;
  } catch {
    return false;
  }
}

export async function detectProjectType(
  workspaceRoot: string,
): Promise<"nextjs" | "vite" | "unknown"> {
  try {
    const pkgPath = path.join(workspaceRoot, "package.json");
    const pkgContent = await vscode.workspace.fs.readFile(
      vscode.Uri.file(pkgPath),
    );
    const pkg = JSON.parse(new TextDecoder().decode(pkgContent));

    const deps = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
    };

    if (deps["next"]) return "nextjs";
    if (deps["vite"]) return "vite";
    return "unknown";
  } catch {
    return "unknown";
  }
}

export async function initShadcn(
  workspaceRoot: string,
): Promise<boolean> {
  const confirmed = await vscode.window.showInformationMessage(
    vscode.l10n.t("shadcn.initRequired"),
    { modal: true },
    "Yes",
    "No",
  );

  if (confirmed !== "Yes") return false;

  const terminal = vscode.window.createTerminal({
    name: "Mocker: shadcn init",
    cwd: workspaceRoot,
  });
  terminal.show();
  terminal.sendText("npx shadcn@latest init -y");

  return true;
}

export async function installComponent(
  workspaceRoot: string,
  componentName: string,
): Promise<void> {
  vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: vscode.l10n.t("shadcn.installing", componentName),
      cancellable: false,
    },
    async () => {
      const terminal = vscode.window.createTerminal({
        name: `Mocker: add ${componentName}`,
        cwd: workspaceRoot,
      });
      terminal.sendText(`npx shadcn@latest add ${componentName} -y`);
      terminal.show();
    },
  );
}

export function getShadcnComponentMap(): Record<string, string> {
  return {
    CraftButton: "button",
    CraftInput: "input",
    CraftCard: "card",
    CraftLabel: "label",
    CraftSeparator: "separator",
    CraftBadge: "badge",
    CraftDialog: "dialog",
    CraftSelect: "select",
    CraftTabs: "tabs",
    CraftTable: "table",
  };
}
