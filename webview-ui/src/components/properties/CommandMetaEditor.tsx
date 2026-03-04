import { useState } from "react";
import { useEditor } from "@craftjs/core";
import type { CommandItemDef } from "../../crafts/shadcn/CraftCommand";
import { DEFAULT_COMMAND_DATA, parseCommandData } from "../../crafts/shadcn/CraftCommand";
import { IconCombobox } from "./IconCombobox";

const INPUT_CLASS =
  "rounded border border-[var(--vscode-input-border,#3c3c3c)] bg-[var(--vscode-input-background,#3c3c3c)] px-2 py-1 text-xs text-[var(--vscode-input-foreground,#ccc)] focus:outline-none focus:ring-1 focus:ring-[var(--vscode-focusBorder,#007fd4)]";

const BTN_CLASS =
  "rounded border border-[var(--vscode-button-border,transparent)] bg-[var(--vscode-button-secondaryBackground,#3c3c3c)] px-2 py-0.5 text-[11px] text-[var(--vscode-button-secondaryForeground,#ccc)] hover:opacity-90 disabled:opacity-40";

const BTN_DANGER_CLASS =
  "rounded border border-[var(--vscode-button-border,transparent)] bg-[var(--vscode-errorForeground,#f44)] px-2 py-0.5 text-[11px] text-white hover:opacity-90 disabled:opacity-40";

type GroupDef = Extract<CommandItemDef, { type: "group" }>;
type ItemDef = Extract<CommandItemDef, { type: "item" }>;

interface CommandMetaEditorProps {
  value: string;
  selectedNodeId: string;
}

export function CommandMetaEditor({ value, selectedNodeId }: CommandMetaEditorProps) {
  const { actions } = useEditor();
  const [openGroups, setOpenGroups] = useState<Set<number>>(new Set([0]));

  const defs = parseCommandData(value);

  function update(newDefs: CommandItemDef[]) {
    actions.setProp(selectedNodeId, (props: Record<string, unknown>) => {
      props.commandData = JSON.stringify(newDefs);
    });
  }

  function toggleGroup(idx: number) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  // --- Top-level operations ---

  function addGroup() {
    update([...defs, { type: "group", label: "Group", items: [] }]);
  }

  function addTopSeparator() {
    update([...defs, { type: "separator" }]);
  }

  function removeTop(idx: number) {
    update(defs.filter((_, i) => i !== idx));
  }

  function moveTopUp(idx: number) {
    if (idx === 0) return;
    const next = [...defs];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    update(next);
  }

  function moveTopDown(idx: number) {
    if (idx === defs.length - 1) return;
    const next = [...defs];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    update(next);
  }

  function setGroupLabel(idx: number, label: string) {
    update(defs.map((d, i) => (i === idx ? { ...(d as GroupDef), label } : d)));
  }

  function updateGroupItems(groupIdx: number, items: CommandItemDef[]) {
    update(defs.map((d, i) => (i === groupIdx ? { ...(d as GroupDef), items } : d)));
  }

  // --- Item-level operations ---

  function addItem(groupIdx: number) {
    const group = defs[groupIdx] as GroupDef;
    updateGroupItems(groupIdx, [...group.items, { type: "item", label: "Item", icon: "", shortcut: "" }]);
  }

  function addItemSeparator(groupIdx: number) {
    const group = defs[groupIdx] as GroupDef;
    updateGroupItems(groupIdx, [...group.items, { type: "separator" }]);
  }

  function removeItem(groupIdx: number, itemIdx: number) {
    const group = defs[groupIdx] as GroupDef;
    updateGroupItems(groupIdx, group.items.filter((_, i) => i !== itemIdx));
  }

  function moveItemUp(groupIdx: number, itemIdx: number) {
    if (itemIdx === 0) return;
    const items = [...(defs[groupIdx] as GroupDef).items];
    [items[itemIdx - 1], items[itemIdx]] = [items[itemIdx], items[itemIdx - 1]];
    updateGroupItems(groupIdx, items);
  }

  function moveItemDown(groupIdx: number, itemIdx: number) {
    const items = (defs[groupIdx] as GroupDef).items;
    if (itemIdx === items.length - 1) return;
    const next = [...items];
    [next[itemIdx], next[itemIdx + 1]] = [next[itemIdx + 1], next[itemIdx]];
    updateGroupItems(groupIdx, next);
  }

  function setItemLabel(groupIdx: number, itemIdx: number, label: string) {
    const items = (defs[groupIdx] as GroupDef).items.map((it, i) =>
      i === itemIdx ? { ...(it as ItemDef), label } : it
    );
    updateGroupItems(groupIdx, items);
  }

  function setItemIcon(groupIdx: number, itemIdx: number, icon: string) {
    const items = (defs[groupIdx] as GroupDef).items.map((it, i) =>
      i === itemIdx ? { ...(it as ItemDef), icon } : it
    );
    updateGroupItems(groupIdx, items);
  }

  function setItemShortcut(groupIdx: number, itemIdx: number, shortcut: string) {
    const items = (defs[groupIdx] as GroupDef).items.map((it, i) =>
      i === itemIdx ? { ...(it as ItemDef), shortcut } : it
    );
    updateGroupItems(groupIdx, items);
  }

  function handleReset() {
    update(DEFAULT_COMMAND_DATA);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-xs text-[var(--vscode-descriptionForeground,#888)]">コマンド構成</label>
        <button type="button" className={BTN_CLASS} onClick={handleReset} title="デフォルトに戻す">
          リセット
        </button>
      </div>

      {defs.map((def, idx) => {
        if (def.type === "separator") {
          return (
            <div key={idx} className="flex items-center gap-1 rounded border border-[var(--vscode-panel-border,#444)] p-1.5">
              <span className="flex-1 text-[11px] text-[var(--vscode-descriptionForeground,#888)]">── separator ──</span>
              <button type="button" className={BTN_CLASS} onClick={() => moveTopUp(idx)} disabled={idx === 0} title="上へ">↑</button>
              <button type="button" className={BTN_CLASS} onClick={() => moveTopDown(idx)} disabled={idx === defs.length - 1} title="下へ">↓</button>
              <button type="button" className={BTN_DANGER_CLASS} onClick={() => removeTop(idx)} title="削除">✕</button>
            </div>
          );
        }

        if (def.type === "group") {
          const group = def as GroupDef;
          return (
            <div key={idx} className="flex flex-col gap-1 rounded border border-[var(--vscode-panel-border,#444)] p-1.5">
              {/* Group header */}
              <div className="flex items-center gap-1">
                <button type="button" className={BTN_CLASS} onClick={() => toggleGroup(idx)} title={openGroups.has(idx) ? "折りたたむ" : "展開"}>
                  {openGroups.has(idx) ? "▼" : "▶"}
                </button>
                <input
                  type="text"
                  value={group.label}
                  onChange={(e) => setGroupLabel(idx, e.target.value)}
                  className={`${INPUT_CLASS} flex-1`}
                  placeholder="グループ名"
                />
                <button type="button" className={BTN_CLASS} onClick={() => moveTopUp(idx)} disabled={idx === 0} title="上へ">↑</button>
                <button type="button" className={BTN_CLASS} onClick={() => moveTopDown(idx)} disabled={idx === defs.length - 1} title="下へ">↓</button>
                <button type="button" className={BTN_DANGER_CLASS} onClick={() => removeTop(idx)} title="削除">✕</button>
              </div>

              {/* Items */}
              {openGroups.has(idx) && (
                <div className="flex flex-col gap-1 pl-2">
                  {group.items.map((item, itemIdx) => {
                    if (item.type === "separator") {
                      return (
                        <div key={itemIdx} className="flex items-center gap-1 rounded border border-[var(--vscode-panel-border,#333)] p-1">
                          <span className="flex-1 text-[11px] text-[var(--vscode-descriptionForeground,#888)]">── separator ──</span>
                          <button type="button" className={BTN_CLASS} onClick={() => moveItemUp(idx, itemIdx)} disabled={itemIdx === 0} title="上へ">↑</button>
                          <button type="button" className={BTN_CLASS} onClick={() => moveItemDown(idx, itemIdx)} disabled={itemIdx === group.items.length - 1} title="下へ">↓</button>
                          <button type="button" className={BTN_DANGER_CLASS} onClick={() => removeItem(idx, itemIdx)} title="削除">✕</button>
                        </div>
                      );
                    }

                    // type === "item"
                    const it = item as ItemDef;
                    return (
                      <div key={itemIdx} className="flex flex-col gap-0.5 rounded border border-[var(--vscode-panel-border,#333)] p-1">
                        <div className="flex items-center gap-1">
                          <button type="button" className={BTN_CLASS} onClick={() => moveItemUp(idx, itemIdx)} disabled={itemIdx === 0} title="上へ">↑</button>
                          <button type="button" className={BTN_CLASS} onClick={() => moveItemDown(idx, itemIdx)} disabled={itemIdx === group.items.length - 1} title="下へ">↓</button>
                          <button type="button" className={BTN_DANGER_CLASS} onClick={() => removeItem(idx, itemIdx)} title="削除">✕</button>
                        </div>
                        {/* Label */}
                        <input
                          type="text"
                          value={it.label ?? ""}
                          onChange={(e) => setItemLabel(idx, itemIdx, e.target.value)}
                          className={`${INPUT_CLASS} w-full`}
                          placeholder="ラベル"
                        />
                        {/* Icon */}
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] text-[var(--vscode-descriptionForeground,#888)]">icon</label>
                            {it.icon && (
                              <button type="button" className={BTN_CLASS} onClick={() => setItemIcon(idx, itemIdx, "")} title="クリア">✕</button>
                            )}
                          </div>
                          <IconCombobox
                            value={it.icon ?? ""}
                            onChange={(v) => setItemIcon(idx, itemIdx, v)}
                          />
                        </div>
                        {/* Shortcut */}
                        <input
                          type="text"
                          value={it.shortcut ?? ""}
                          onChange={(e) => setItemShortcut(idx, itemIdx, e.target.value)}
                          className={`${INPUT_CLASS} w-full`}
                          placeholder="ショートカット (例: ⌘S, Ctrl+N)"
                        />
                      </div>
                    );
                  })}

                  <div className="flex gap-1">
                    <button type="button" className={BTN_CLASS} onClick={() => addItem(idx)}>+ 項目追加</button>
                    <button type="button" className={BTN_CLASS} onClick={() => addItemSeparator(idx)}>+ 区切り</button>
                  </div>
                </div>
              )}
            </div>
          );
        }

        return null;
      })}

      <div className="flex gap-1">
        <button type="button" className={BTN_CLASS} onClick={addGroup}>+ グループ追加</button>
        <button type="button" className={BTN_CLASS} onClick={addTopSeparator}>+ 区切り追加</button>
      </div>
    </div>
  );
}
