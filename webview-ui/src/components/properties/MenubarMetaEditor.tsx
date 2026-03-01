import { useState } from "react";
import { useEditor } from "@craftjs/core";
import type { MenuData, MenuItemDef, TopLevelMenuDef } from "../../crafts/shadcn/CraftMenubar";
import { DEFAULT_MENUBAR_DATA } from "../../crafts/shadcn/CraftMenubar";

const INPUT_CLASS =
  "rounded border border-[var(--vscode-input-border,#3c3c3c)] bg-[var(--vscode-input-background,#3c3c3c)] px-2 py-1 text-xs text-[var(--vscode-input-foreground,#ccc)] focus:outline-none focus:ring-1 focus:ring-[var(--vscode-focusBorder,#007fd4)]";

const BTN_CLASS =
  "rounded border border-[var(--vscode-button-border,transparent)] bg-[var(--vscode-button-secondaryBackground,#3c3c3c)] px-2 py-0.5 text-[11px] text-[var(--vscode-button-secondaryForeground,#ccc)] hover:opacity-90 disabled:opacity-40";

const BTN_DANGER_CLASS =
  "rounded border border-[var(--vscode-button-border,transparent)] bg-[var(--vscode-errorForeground,#f44)] px-2 py-0.5 text-[11px] text-white hover:opacity-90 disabled:opacity-40";

function parseMenuData(raw: string): MenuData {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as MenuData;
    return DEFAULT_MENUBAR_DATA;
  } catch {
    return DEFAULT_MENUBAR_DATA;
  }
}

interface MenubarMetaEditorProps {
  value: string;
  selectedNodeId: string;
}

export function MenubarMetaEditor({ value, selectedNodeId }: MenubarMetaEditorProps) {
  const { actions } = useEditor((state) => ({ nodes: state.nodes }));
  const [openMenus, setOpenMenus] = useState<Set<number>>(new Set([0]));

  const menus = parseMenuData(value);

  function updateMenus(newMenus: MenuData) {
    actions.setProp(selectedNodeId, (props: Record<string, unknown>) => {
      props.menuData = JSON.stringify(newMenus);
    });
  }

  function toggleMenu(idx: number) {
    setOpenMenus((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  // --- Menu-level operations ---

  function addMenu() {
    updateMenus([...menus, { label: "Menu", items: [] }]);
  }

  function removeMenu(idx: number) {
    updateMenus(menus.filter((_, i) => i !== idx));
  }

  function moveMenuUp(idx: number) {
    if (idx === 0) return;
    const next = [...menus];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    updateMenus(next);
  }

  function moveMenuDown(idx: number) {
    if (idx === menus.length - 1) return;
    const next = [...menus];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    updateMenus(next);
  }

  function setMenuLabel(idx: number, label: string) {
    const next = menus.map((m, i) => (i === idx ? { ...m, label } : m));
    updateMenus(next);
  }

  function updateMenuItems(menuIdx: number, items: MenuItemDef[]) {
    const next = menus.map((m, i) => (i === menuIdx ? { ...m, items } : m));
    updateMenus(next);
  }

  // --- Item-level operations ---

  function addItem(menuIdx: number) {
    const menu = menus[menuIdx];
    updateMenuItems(menuIdx, [...menu.items, { type: "item", label: "Item" }]);
  }

  function removeItem(menuIdx: number, itemIdx: number) {
    const menu = menus[menuIdx];
    updateMenuItems(menuIdx, menu.items.filter((_, i) => i !== itemIdx));
  }

  function moveItemUp(menuIdx: number, itemIdx: number) {
    if (itemIdx === 0) return;
    const items = [...menus[menuIdx].items];
    [items[itemIdx - 1], items[itemIdx]] = [items[itemIdx], items[itemIdx - 1]];
    updateMenuItems(menuIdx, items);
  }

  function moveItemDown(menuIdx: number, itemIdx: number) {
    const items = menus[menuIdx].items;
    if (itemIdx === items.length - 1) return;
    const next = [...items];
    [next[itemIdx], next[itemIdx + 1]] = [next[itemIdx + 1], next[itemIdx]];
    updateMenuItems(menuIdx, next);
  }

  function setItemType(menuIdx: number, itemIdx: number, newType: "item" | "checkbox" | "separator") {
    const item = menus[menuIdx].items[itemIdx];
    let converted: MenuItemDef;
    if (newType === "separator") {
      converted = { type: "separator" };
    } else if (newType === "checkbox") {
      const prev = item as { label?: string; shortcut?: string };
      converted = { type: "checkbox", label: prev.label ?? "Item", checked: false, shortcut: prev.shortcut };
    } else {
      const prev = item as { label?: string; shortcut?: string };
      converted = { type: "item", label: prev.label ?? "Item", shortcut: prev.shortcut };
    }
    const items = menus[menuIdx].items.map((it, i) => (i === itemIdx ? converted : it));
    updateMenuItems(menuIdx, items);
  }

  function setItemLabel(menuIdx: number, itemIdx: number, label: string) {
    const items = menus[menuIdx].items.map((it, i) => {
      if (i !== itemIdx) return it;
      return { ...it, label } as MenuItemDef;
    });
    updateMenuItems(menuIdx, items);
  }

  function setItemShortcut(menuIdx: number, itemIdx: number, shortcut: string) {
    const items = menus[menuIdx].items.map((it, i) => {
      if (i !== itemIdx) return it;
      return { ...it, shortcut } as MenuItemDef;
    });
    updateMenuItems(menuIdx, items);
  }

  function toggleItemChecked(menuIdx: number, itemIdx: number) {
    const items = menus[menuIdx].items.map((it, i) => {
      if (i !== itemIdx || it.type !== "checkbox") return it;
      return { ...it, checked: !it.checked } as MenuItemDef;
    });
    updateMenuItems(menuIdx, items);
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-[var(--vscode-descriptionForeground,#888)]">メニュー構成</label>

      {menus.map((menu: TopLevelMenuDef, menuIdx: number) => (
        <div key={menuIdx} className="flex flex-col gap-1 rounded border border-[var(--vscode-panel-border,#444)] p-1.5">
          {/* Menu header row */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              className={BTN_CLASS}
              onClick={() => toggleMenu(menuIdx)}
              title={openMenus.has(menuIdx) ? "折りたたむ" : "展開"}
            >
              {openMenus.has(menuIdx) ? "▼" : "▶"}
            </button>
            <input
              type="text"
              value={menu.label}
              onChange={(e) => setMenuLabel(menuIdx, e.target.value)}
              className={`${INPUT_CLASS} flex-1`}
              placeholder="メニュー名"
            />
            <button type="button" className={BTN_CLASS} onClick={() => moveMenuUp(menuIdx)} disabled={menuIdx === 0} title="上へ">↑</button>
            <button type="button" className={BTN_CLASS} onClick={() => moveMenuDown(menuIdx)} disabled={menuIdx === menus.length - 1} title="下へ">↓</button>
            <button type="button" className={BTN_DANGER_CLASS} onClick={() => removeMenu(menuIdx)} title="削除">✕</button>
          </div>

          {/* Items */}
          {openMenus.has(menuIdx) && (
            <div className="flex flex-col gap-1 pl-2">
              {menu.items.map((item: MenuItemDef, itemIdx: number) => (
                <div key={itemIdx} className="flex flex-col gap-0.5 rounded border border-[var(--vscode-panel-border,#333)] p-1">
                  <div className="flex items-center gap-1">
                    {/* Type selector */}
                    <select
                      value={item.type}
                      onChange={(e) => setItemType(menuIdx, itemIdx, e.target.value as "item" | "checkbox" | "separator")}
                      className={`${INPUT_CLASS} w-[90px]`}
                    >
                      <option value="item">item</option>
                      <option value="checkbox">checkbox</option>
                      <option value="separator">separator</option>
                    </select>

                    {/* Move buttons */}
                    <button type="button" className={BTN_CLASS} onClick={() => moveItemUp(menuIdx, itemIdx)} disabled={itemIdx === 0} title="上へ">↑</button>
                    <button type="button" className={BTN_CLASS} onClick={() => moveItemDown(menuIdx, itemIdx)} disabled={itemIdx === menu.items.length - 1} title="下へ">↓</button>
                    <button type="button" className={BTN_DANGER_CLASS} onClick={() => removeItem(menuIdx, itemIdx)} title="削除">✕</button>
                  </div>

                  {item.type !== "separator" && (
                    <div className="flex flex-col gap-0.5">
                      {/* Label */}
                      <input
                        type="text"
                        value={(item as { label?: string }).label ?? ""}
                        onChange={(e) => setItemLabel(menuIdx, itemIdx, e.target.value)}
                        className={`${INPUT_CLASS} w-full`}
                        placeholder="ラベル"
                      />
                      {/* Shortcut + checked */}
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={(item as { shortcut?: string }).shortcut ?? ""}
                          onChange={(e) => setItemShortcut(menuIdx, itemIdx, e.target.value)}
                          className={`${INPUT_CLASS} flex-1`}
                          placeholder="ショートカット"
                        />
                        {item.type === "checkbox" && (
                          <button
                            type="button"
                            className={`${BTN_CLASS} min-w-[28px]`}
                            onClick={() => toggleItemChecked(menuIdx, itemIdx)}
                            title="チェック切替"
                          >
                            {item.checked ? "☑" : "☐"}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <button type="button" className={BTN_CLASS} onClick={() => addItem(menuIdx)}>
                + 項目追加
              </button>
            </div>
          )}
        </div>
      ))}

      <button type="button" className={BTN_CLASS} onClick={addMenu}>
        + メニュー追加
      </button>
    </div>
  );
}
