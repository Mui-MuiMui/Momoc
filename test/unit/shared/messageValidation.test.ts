import { describe, it, expect } from "vitest";
import { isExtToWebMessage, isWebToExtMessage } from "../../../src/shared/types.js";

describe("isExtToWebMessage", () => {
  it("payloadなし型の正常メッセージ → true", () => {
    expect(isExtToWebMessage({ type: "command:toggleTheme" })).toBe(true);
    expect(isExtToWebMessage({ type: "command:switchLayoutMode" })).toBe(true);
    expect(isExtToWebMessage({ type: "capture:start" })).toBe(true);
  });

  it("payloadあり型の正常メッセージ → true", () => {
    expect(
      isExtToWebMessage({ type: "doc:load", payload: { content: "", fileName: "test.moc" } }),
    ).toBe(true);
    expect(
      isExtToWebMessage({ type: "theme:set", payload: { theme: "dark" } }),
    ).toBe(true);
    expect(
      isExtToWebMessage({ type: "settings:update", payload: { historyLimit: 50 } }),
    ).toBe(true);
  });

  it("不明な type → false", () => {
    expect(isExtToWebMessage({ type: "unknown:message" })).toBe(false);
    expect(isExtToWebMessage({ type: "" })).toBe(false);
  });

  it("payloadあり型で payload が欠落 → false", () => {
    expect(isExtToWebMessage({ type: "doc:load" })).toBe(false);
  });

  it("payloadあり型で payload が null → false", () => {
    expect(isExtToWebMessage({ type: "doc:load", payload: null })).toBe(false);
  });

  it("payloadあり型で payload がプリミティブ → false", () => {
    expect(isExtToWebMessage({ type: "doc:load", payload: "string" })).toBe(false);
    expect(isExtToWebMessage({ type: "doc:load", payload: 42 })).toBe(false);
  });

  it("null → false", () => {
    expect(isExtToWebMessage(null)).toBe(false);
  });

  it("undefined → false", () => {
    expect(isExtToWebMessage(undefined)).toBe(false);
  });

  it("プリミティブ → false", () => {
    expect(isExtToWebMessage("string")).toBe(false);
    expect(isExtToWebMessage(42)).toBe(false);
    expect(isExtToWebMessage(true)).toBe(false);
  });

  it("type フィールドなし → false", () => {
    expect(isExtToWebMessage({ payload: {} })).toBe(false);
    expect(isExtToWebMessage({})).toBe(false);
  });
});

describe("isWebToExtMessage", () => {
  it("payloadなし型の正常メッセージ → true", () => {
    expect(isWebToExtMessage({ type: "editor:ready" })).toBe(true);
    expect(isWebToExtMessage({ type: "command:openBrowserPreview" })).toBe(true);
    expect(isWebToExtMessage({ type: "customComponent:import" })).toBe(true);
    expect(isWebToExtMessage({ type: "customComponent:getAll" })).toBe(true);
  });

  it("payloadあり型の正常メッセージ → true", () => {
    expect(
      isWebToExtMessage({ type: "doc:save", payload: { content: "{}" } }),
    ).toBe(true);
    expect(
      isWebToExtMessage({ type: "customComponent:reload", payload: { id: "abc" } }),
    ).toBe(true);
  });

  it("不明な type → false", () => {
    expect(isWebToExtMessage({ type: "unknown:type" })).toBe(false);
  });

  it("payloadあり型で payload 欠落 → false", () => {
    expect(isWebToExtMessage({ type: "doc:save" })).toBe(false);
  });

  it("null / undefined → false", () => {
    expect(isWebToExtMessage(null)).toBe(false);
    expect(isWebToExtMessage(undefined)).toBe(false);
  });
});
