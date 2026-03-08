# Sidebar コンポーネント仕様

## 概要
`CraftSidebar` — ナビゲーションリンクを持つサイドバーと、メインコンテンツ領域（Inset）を組み合わせたレイアウトコンポーネント。折りたたみ対応。

---

## 編集画面での挙動

### レンダリング構造
```
<div className="flex {flex-row|flex-row-reverse}" style={width/height}>
  <!-- Sidebar Panel -->
  <div className="{sidebarBgClass} border-{r|l} ..." style={{ width: effectiveWidth }}>
    <div className="border-b px-2 py-3">
      <Element id="sidebar_header" is={SidebarHeaderSlot} canvas />
    </div>
    <div className="flex flex-col flex-1 overflow-y-auto py-2 gap-0.5 px-2">
      {NavItemList} <!-- sidebarData JSON から生成 -->
    </div>
    <div className="border-t px-2 py-3">
      <Element id="sidebar_footer" is={SidebarFooterSlot} canvas />
    </div>
  </div>
  <!-- Inset Panel -->
  <div className="{insetBgClass} flex flex-col flex-1">
    <button>← / →</button>  <!-- プレビュー時のみ動作 -->
    <Element id="sidebar_inset" is={SidebarInsetSlot} canvas />
  </div>
</div>
```

- 編集画面では折りたたみボタンは動作しない（`useEditor` の `enabled` フラグで無効化）
- `width === "auto"` の場合: 外側 div に `grow` クラス付与、style の width は `calc(sidebarWidth + 40px)` に設定
- `collapsible === "icon"`: 折りたたみ時にサイドバーを 48px に縮小、ナビラベルを非表示
- `collapsible === "offcanvas"`: 折りたたみ時にサイドバーを `hidden` クラスで非表示
- `collapsible === "none"`: トグルボタン非表示

---

## スロット構成

| スロット ID | コンポーネント | 説明 |
|---|---|---|
| sidebar_header | SidebarHeaderSlot | サイドバー上部エリア（ロゴ・タイトル等） |
| sidebar_footer | SidebarFooterSlot | サイドバー下部エリア（ユーザーアバター等） |
| sidebar_inset | SidebarInsetSlot | メインコンテンツ領域（サイドバー横の本体） |

---

## sidebarData JSON 構造

`SidebarMeta` 型の JSON 文字列を `sidebarData` prop に設定する:

```json
{
  "items": [
    { "key": 0, "type": "group-label", "label": "Main" },
    { "key": 1, "type": "item", "label": "Dashboard", "icon": "LayoutDashboard", "active": true },
    { "key": 2, "type": "item", "label": "Inbox", "icon": "Inbox", "badge": "5",
      "badgeBgClass": "bg-primary", "badgeTextClass": "text-primary-foreground" },
    { "key": 3, "type": "separator" },
    { "key": 4, "type": "item", "label": "Settings", "icon": "Settings",
      "children": [
        { "key": 5, "type": "item", "label": "Profile" }
      ],
      "defaultOpen": true }
  ],
  "nextKey": 6
}
```

### SidebarNavItem フィールド

| フィールド | 型 | 説明 |
|---|---|---|
| key | number | 一意識別子 |
| type | "item"\|"group-label"\|"separator" | アイテム種別 |
| label | string | 表示テキスト |
| icon | string | lucide-react アイコン名（depth < 2 のみ表示） |
| active | boolean | アクティブ状態（背景クラス適用） |
| badge | string | バッジテキスト |
| badgeBgClass | string | バッジ背景クラス（省略時 `bg-primary`） |
| badgeTextClass | string | バッジテキストクラス（省略時 `text-primary-foreground`） |
| children | SidebarNavItem[] | サブメニュー（クリックで開閉） |
| defaultOpen | boolean | デフォルトで子メニューを展開するか |

---

## Webプレビューでの挙動

### 生成 TSX 構造（craftToTsx.ts `renderSidebar`）

shadcn/ui の Sidebar コンポーネントは使用せず、プレーンな HTML + Tailwind で出力される。

```tsx
<div className="flex flex-row overflow-hidden" ref={(el) => { /* DOM操作でtoggle実装 */ }}>
  <aside data-sb-aside className="flex flex-col overflow-hidden bg-muted/50 border-r"
    style={{ width: "240px", minWidth: "240px", flexShrink: 0 }}>
    <div data-sb-header className="border-b px-2 py-3">
      <div className="min-h-[40px]">
        {/* sidebar_header slot children */}
      </div>
    </div>
    <nav className="flex flex-col flex-1 overflow-y-auto py-2 gap-0.5 px-2">
      {/* nav items */}
    </nav>
    <div data-sb-footer className="border-t px-2 py-3">
      <div className="min-h-[40px]">
        {/* sidebar_footer slot children */}
      </div>
    </div>
  </aside>
  <main className="flex flex-col flex-1 overflow-hidden bg-background">
    <div className="flex items-center border-b px-2 py-1">
      <button data-sb-toggle type="button" ...>←</button>
    </div>
    <div className="flex-1 overflow-auto">
      {/* sidebar_inset slot children */}
    </div>
  </main>
</div>
```

### 折りたたみの実装
- React state を使わず `ref` コールバックで DOM に直接イベント登録（`__sbInit` フラグで一度だけ）
- `icon` モード: `data-sb-aside` の width/minWidth を toggle。`data-sb-label` 要素を `display: none` で隠す
- `offcanvas` モード: `data-sb-aside` を `display: none` で非表示
- `headerCollapseMode === "hide"`: icon モード折りたたみ時に `data-sb-header` を `display: none`
- `footerCollapseMode === "hide"`: icon モード折りたたみ時に `data-sb-footer` を `display: none`

---

## Props 一覧

| prop | 型 | デフォルト | 説明 |
|---|---|---|---|
| sidebarData | string | (JSON) | SidebarMeta JSON。ナビアイテム定義 |
| side | "left"\|"right" | "left" | サイドバーの表示位置 |
| collapsible | "icon"\|"offcanvas"\|"none" | "icon" | 折りたたみ方式 |
| sidebarWidth | string | "240px" | サイドバーの幅 |
| headerCollapseMode | "clip"\|"hide" | "clip" | icon モード折りたたみ時のヘッダー表示（hide=非表示） |
| footerCollapseMode | "clip"\|"hide" | "clip" | icon モード折りたたみ時のフッター表示（hide=非表示） |
| sidebarBgClass | string | "" | サイドバー背景クラス（省略時: 編集 `bg-sidebar` / プレビュー `bg-muted/50`） |
| sidebarBorderColor | string | "" | サイドバーボーダーカラークラス |
| sidebarShadow | string | "" | サイドバーシャドウクラス |
| headerBgClass | string | "" | ヘッダー背景クラス |
| headerBorderColor | string | "" | ヘッダーボーダーカラークラス |
| headerShadow | string | "" | ヘッダーシャドウクラス |
| navActiveBgClass | string | "" | アクティブアイテムの背景クラス（省略時 `bg-accent`） |
| navHoverBgClass | string | "" | ホバー時の背景クラス（省略時 `hover:bg-accent`） |
| navTextClass | string | "" | ナビテキスト・アイコンカラークラス |
| navIconClass | string | "" | アイコン専用カラークラス |
| footerBgClass | string | "" | フッター背景クラス |
| footerBorderColor | string | "" | フッターボーダーカラークラス |
| footerShadow | string | "" | フッターシャドウクラス |
| insetBgClass | string | "" | Inset 背景クラス（省略時 `bg-background`） |
| insetBorderColor | string | "" | Inset ボーダーカラークラス |
| insetShadow | string | "" | Inset シャドウクラス |
| width | string | "auto" | 幅（"auto" の場合 `grow` クラス付与） |
| height | string | "auto" | 高さ |
| className | string | "" | 追加 Tailwind クラス |
