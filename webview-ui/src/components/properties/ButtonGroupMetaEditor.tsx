import { useEffect, useRef, useState } from "react";
import { useEditor } from "@craftjs/core";
import { getVsCodeApi } from "../../utils/vscodeApi";
import { type ButtonDef, DEFAULT_BUTTON_DATA } from "../../crafts/shadcn/CraftButtonGroup";

const INPUT_CLASS =
  "rounded border border-[var(--vscode-input-border,#3c3c3c)] bg-[var(--vscode-input-background,#3c3c3c)] px-2 py-1 text-xs text-[var(--vscode-input-foreground,#ccc)] focus:outline-none focus:ring-1 focus:ring-[var(--vscode-focusBorder,#007fd4)]";

const BTN_CLASS =
  "rounded border border-[var(--vscode-button-border,transparent)] bg-[var(--vscode-button-secondaryBackground,#3c3c3c)] px-2 py-0.5 text-[11px] text-[var(--vscode-button-secondaryForeground,#ccc)] hover:opacity-90 disabled:opacity-40";

const BTN_DANGER_CLASS =
  "rounded border border-[var(--vscode-button-border,transparent)] bg-[var(--vscode-errorForeground,#f44)] px-2 py-0.5 text-[11px] text-white hover:opacity-90 disabled:opacity-40";

function parseButtonData(raw: string): ButtonDef[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as ButtonDef[];
    return DEFAULT_BUTTON_DATA;
  } catch {
    return DEFAULT_BUTTON_DATA;
  }
}

interface ButtonGroupMetaEditorProps {
  value: string;
  selectedNodeId: string;
}

export function ButtonGroupMetaEditor({ value, selectedNodeId }: ButtonGroupMetaEditorProps) {
  const { actions } = useEditor(() => ({}));
  const [openButtons, setOpenButtons] = useState<Set<number>>(new Set([0]));
  const pendingBrowseIndexRef = useRef<number>(-1);

  const buttons = parseButtonData(value);

  // Listen for browse:mocFile:result with targetProp === "buttonGroupLinkedMocPath"
  useEffect(() => {
    const listener = (event: MessageEvent) => {
      const msg = event.data;
      if (msg?.type === "browse:mocFile:result") {
        const { relativePath, targetProp } = msg.payload as { relativePath: string; targetProp?: string };
        if (targetProp === "buttonGroupLinkedMocPath" && pendingBrowseIndexRef.current >= 0) {
          const idx = pendingBrowseIndexRef.current;
          pendingBrowseIndexRef.current = -1;
          const updated = parseButtonData(value);
          updated[idx] = { ...updated[idx], linkedMocPath: relativePath };
          actions.setProp(selectedNodeId, (props: Record<string, unknown>) => {
            props.buttonData = JSON.stringify(updated);
          });
        }
      }
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [value, selectedNodeId, actions]);

  function updateButtons(newButtons: ButtonDef[]) {
    actions.setProp(selectedNodeId, (props: Record<string, unknown>) => {
      props.buttonData = JSON.stringify(newButtons);
    });
  }

  function toggleButton(idx: number) {
    setOpenButtons((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  function addButton() {
    updateButtons([...buttons, { text: `Button ${buttons.length + 1}`, overlayType: "none" }]);
  }

  function removeButton(idx: number) {
    updateButtons(buttons.filter((_, i) => i !== idx));
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    const next = [...buttons];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    updateButtons(next);
  }

  function moveDown(idx: number) {
    if (idx === buttons.length - 1) return;
    const next = [...buttons];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    updateButtons(next);
  }

  function updateButton(idx: number, patch: Partial<ButtonDef>) {
    updateButtons(buttons.map((b, i) => (i === idx ? { ...b, ...patch } : b)));
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-[var(--vscode-descriptionForeground,#888)]">ボタン構成</label>

      {buttons.map((btn, idx) => (
        <div key={idx} className="flex flex-col gap-1 rounded border border-[var(--vscode-panel-border,#444)] p-1.5">
          {/* Header row */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              className={BTN_CLASS}
              onClick={() => toggleButton(idx)}
              title={openButtons.has(idx) ? "折りたたむ" : "展開"}
            >
              {openButtons.has(idx) ? "▼" : "▶"}
            </button>
            <span className="flex-1 truncate text-xs text-[var(--vscode-foreground,#ccc)]">{btn.text || "(空)"}</span>
            <button type="button" className={BTN_CLASS} onClick={() => moveUp(idx)} disabled={idx === 0} title="上へ">↑</button>
            <button type="button" className={BTN_CLASS} onClick={() => moveDown(idx)} disabled={idx === buttons.length - 1} title="下へ">↓</button>
            <button type="button" className={BTN_DANGER_CLASS} onClick={() => removeButton(idx)} title="削除">✕</button>
          </div>

          {openButtons.has(idx) && (
            <div className="flex flex-col gap-1.5 pl-1">
              {/* text */}
              <div className="flex flex-col gap-0.5">
                <label className="text-[11px] text-[var(--vscode-descriptionForeground,#888)]">テキスト</label>
                <input
                  type="text"
                  value={btn.text}
                  onChange={(e) => updateButton(idx, { text: e.target.value })}
                  className={`${INPUT_CLASS} w-full`}
                  placeholder="Button"
                />
              </div>

              {/* disabled */}
              <div className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  id={`btn-disabled-${idx}`}
                  checked={btn.disabled ?? false}
                  onChange={(e) => updateButton(idx, { disabled: e.target.checked })}
                />
                <label htmlFor={`btn-disabled-${idx}`} className="text-[11px] text-[var(--vscode-descriptionForeground,#888)]">disabled</label>
              </div>

              {/* overlayType */}
              <div className="flex items-center gap-1">
                <label className="shrink-0 text-[11px] text-[var(--vscode-descriptionForeground,#888)]">overlay</label>
                <select
                  value={btn.overlayType ?? "none"}
                  onChange={(e) => updateButton(idx, { overlayType: e.target.value as ButtonDef["overlayType"] })}
                  className={`${INPUT_CLASS} flex-1`}
                >
                  {["none", "dialog", "alert-dialog", "sheet", "drawer", "popover", "dropdown-menu"].map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              {/* overlay-specific fields */}
              {btn.overlayType && btn.overlayType !== "none" ? (
                <>
                  {/* linkedMocPath */}
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[11px] text-[var(--vscode-descriptionForeground,#888)]">linkedMocPath</label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={btn.linkedMocPath ?? ""}
                        onChange={(e) => updateButton(idx, { linkedMocPath: e.target.value })}
                        className={`${INPUT_CLASS} min-w-0 flex-1`}
                        placeholder=".moc ファイルパス"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          pendingBrowseIndexRef.current = idx;
                          getVsCodeApi().postMessage({
                            type: "browse:mocFile",
                            payload: { currentPath: btn.linkedMocPath ?? "", targetProp: "buttonGroupLinkedMocPath" },
                          });
                        }}
                        className="rounded border border-[var(--vscode-button-border,transparent)] bg-[var(--vscode-button-background,#0e639c)] px-1.5 py-0.5 text-[11px] text-[var(--vscode-button-foreground,#fff)] hover:opacity-90"
                        title="参照..."
                      >
                        ...
                      </button>
                    </div>
                  </div>

                  {/* sheetSide (sheet only) */}
                  {btn.overlayType === "sheet" && (
                    <div className="flex items-center gap-1">
                      <label className="shrink-0 text-[11px] text-[var(--vscode-descriptionForeground,#888)]">side</label>
                      <select
                        value={btn.sheetSide ?? "right"}
                        onChange={(e) => updateButton(idx, { sheetSide: e.target.value as ButtonDef["sheetSide"] })}
                        className={`${INPUT_CLASS} flex-1`}
                      >
                        {["top", "right", "bottom", "left"].map((v) => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* overlayWidth / overlayHeight */}
                  <div className="flex gap-1">
                    <div className="flex flex-1 flex-col gap-0.5">
                      <label className="text-[11px] text-[var(--vscode-descriptionForeground,#888)]">幅</label>
                      <input
                        type="text"
                        value={btn.overlayWidth ?? ""}
                        onChange={(e) => updateButton(idx, { overlayWidth: e.target.value })}
                        className={`${INPUT_CLASS} w-full`}
                        placeholder="例: 400px"
                      />
                    </div>
                    <div className="flex flex-1 flex-col gap-0.5">
                      <label className="text-[11px] text-[var(--vscode-descriptionForeground,#888)]">高さ</label>
                      <input
                        type="text"
                        value={btn.overlayHeight ?? ""}
                        onChange={(e) => updateButton(idx, { overlayHeight: e.target.value })}
                        className={`${INPUT_CLASS} w-full`}
                        placeholder="例: 300px"
                      />
                    </div>
                  </div>
                </>
              ) : (
                /* toastText / toastPosition (none のみ) */
                <>
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[11px] text-[var(--vscode-descriptionForeground,#888)]">toastText</label>
                    <input
                      type="text"
                      value={btn.toastText ?? ""}
                      onChange={(e) => updateButton(idx, { toastText: e.target.value })}
                      className={`${INPUT_CLASS} w-full`}
                      placeholder="クリック時のトーストメッセージ"
                    />
                  </div>
                  {btn.toastText && (
                    <div className="flex items-center gap-1">
                      <label className="shrink-0 text-[11px] text-[var(--vscode-descriptionForeground,#888)]">位置</label>
                      <select
                        value={btn.toastPosition ?? "bottom-right"}
                        onChange={(e) => updateButton(idx, { toastPosition: e.target.value as ButtonDef["toastPosition"] })}
                        className={`${INPUT_CLASS} flex-1`}
                      >
                        {["bottom-right", "bottom-left", "top-right", "top-left"].map((v) => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      ))}

      <button type="button" className={BTN_CLASS} onClick={addButton}>
        + ボタン追加
      </button>
    </div>
  );
}
