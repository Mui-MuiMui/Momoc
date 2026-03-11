import * as fs from "node:fs";
import * as path from "node:path";
import puppeteer from "puppeteer-core";
import { startPreviewServer, getActiveSession } from "./previewServer.js";

/**
 * システムにインストールされた Chrome / Edge のパスを検出する。
 * puppeteer-core はブラウザを自動検出しないため手動で探す。
 */
function findChromePath(): string | undefined {
  const platform = process.platform;

  if (platform === "win32") {
    const programFiles = process.env["PROGRAMFILES"] || "C:\\Program Files";
    const programFilesX86 = process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)";
    const localAppData = process.env["LOCALAPPDATA"] || "";

    const candidates = [
      path.join(programFiles, "Google", "Chrome", "Application", "chrome.exe"),
      path.join(programFilesX86, "Google", "Chrome", "Application", "chrome.exe"),
      path.join(localAppData, "Google", "Chrome", "Application", "chrome.exe"),
      path.join(programFiles, "Microsoft", "Edge", "Application", "msedge.exe"),
      path.join(programFilesX86, "Microsoft", "Edge", "Application", "msedge.exe"),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return candidate;
    }
  } else if (platform === "darwin") {
    const candidates = [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return candidate;
    }
  } else {
    // Linux
    const { execSync } = require("node:child_process");
    const names = ["google-chrome", "google-chrome-stable", "chromium-browser", "chromium", "microsoft-edge"];
    for (const name of names) {
      try {
        const result = execSync(`which ${name}`, { encoding: "utf-8" }).trim();
        if (result) return result;
      } catch {
        // not found, try next
      }
    }
  }

  return undefined;
}

/**
 * puppeteer-core でプレビューサーバーのページをスクリーンショットする。
 */
export async function captureScreenshot(
  mocFilePath: string,
  workspaceRoot: string,
  theme: "light" | "dark",
  viewport: { width: number; height: number },
): Promise<Buffer> {
  const chromePath = findChromePath();
  if (!chromePath) {
    throw new Error(
      "Chrome または Edge が見つかりません。Google Chrome か Microsoft Edge をインストールしてください。",
    );
  }

  // プレビューサーバー起動（既存セッションがあればそれを返す）
  const hadExistingSession = !!getActiveSession(mocFilePath);
  const { url, dispose } = await startPreviewServer(mocFilePath, workspaceRoot, theme);

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
  try {
    browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({
      width: viewport.width,
      height: viewport.height,
    });

    // SSE接続が常時開いているため networkidle0 は到達不可能。
    // domcontentloaded で初期ロード完了を待ち、スタイル適用は waitForFunction で待機する。
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });

    // Tailwind CSS Browser JIT はスタイルを非同期生成するため待機
    await page.waitForFunction(
      () => {
        const styles = document.querySelectorAll("style");
        return styles.length > 0 && !document.querySelector("#error");
      },
      { timeout: 10000 },
    );

    // アニメーション・レイアウト安定化のための追加待機
    await new Promise((resolve) => setTimeout(resolve, 500));

    const buffer = await page.screenshot({
      type: "png",
      fullPage: true,
    });

    return Buffer.from(buffer);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
    // 既存セッションがなかった場合のみ明示的にdispose
    if (!hadExistingSession) {
      dispose();
    }
  }
}
