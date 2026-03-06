# ButtonGroup コンポーネント仕様

## 概要
`CraftButtonGroup` — 複数のボタンをグループとして横並びまたは縦並びで表示するコンポーネント。各ボタンはオーバーレイのトリガーやトースト通知の発火が可能。

---

## 編集画面での挙動

```
<div role="group" className={groupCls + className} style={width/height}>
  <div className="relative inline-flex">
    <button className={buttonVariants({ variant, size })} disabled={btn.disabled}>
      {btn.text}
      {btn.linkedMocPath && <span>🔗</span>}
    </button>
    {btn.overlayType !== "none" && <span className="absolute -right-1 -top-2 ...バッジ...">overlay種別</span>}
  </div>
  ...
</div>
```

- `orientation === "vertical"`: `flex flex-col` + 上下の角丸・ボーダーを結合するクラスを適用
- `orientation === "horizontal"`: `flex` + 左右の角丸・ボーダーを結合するクラスを適用
- `variant`/`size` はグループ全体で統一（ボタン個別に上書き不可）
- `btn.linkedMocPath` がある場合: テキスト末尾に鎖アイコンを表示
- `btn.overlayType !== "none"` の場合: ボタン右上に小さいバッジ（青）でオーバーレイ種別を表示

---

## Webプレビューでの挙動

### 生成 TSX（craftToTsx.ts `renderButtonGroup`）
```tsx
<ButtonGroup orientation="horizontal">
  <Button variant="outline">Button 1</Button>
  <Button variant="outline">Button 2</Button>
  <Button variant="outline">Button 3</Button>
</ButtonGroup>
```

- `@/components/ui/button-group` の `<ButtonGroup>` と `@/components/ui/button` の `<Button>` を使用
- グループレベルの `variant`/`size` が各 `<Button>` に適用される（デフォルト値は省略）
- `btn.overlayType !== "none"` の場合: `wrapWithOverlay` で `<Button>` をオーバーレイコンポーネントでラップ
  - `dialog` → `<Dialog>` + `<DialogTrigger asChild>`
  - `alert-dialog` → `<AlertDialog>` + `<AlertDialogTrigger asChild>`
  - `sheet` → `<Sheet>` + `<SheetTrigger asChild>`
  - `drawer` → `<Drawer>` + `<DrawerTrigger asChild>`
  - `popover` → `<Popover>` + `<PopoverTrigger asChild>`
  - `dropdown-menu` → `<DropdownMenu>` + `<DropdownMenuTrigger asChild>`
- `btn.toastText` がある場合（overlayType = "none"）: `onClick={() => toast("...", { position: "..." })}` を付与
- `btn.linkedMocPath` がある場合: オーバーレイ内に `{/* linked: path */}` コメントを出力

### previewServer フォールバック（button-group）
```
ButtonGroup: orientation に応じた flex レイアウトクラスを適用した div
```

---

## buttonData 構造

`buttonData` prop は JSON 文字列（`ButtonDef[]`）として管理される。

| フィールド | 型 | デフォルト | 説明 |
|---|---|---|---|
| text | string | "Button N" | ボタンテキスト（`<kbd>` タグで修飾キー表示可） |
| disabled | boolean | false | 無効状態 |
| overlayType | "none"\|"dialog"\|"alert-dialog"\|"sheet"\|"drawer"\|"popover"\|"dropdown-menu" | "none" | トリガーするオーバーレイ種別 |
| linkedMocPath | string | "" | オーバーレイコンテンツの .moc パス |
| sheetSide | "top"\|"right"\|"bottom"\|"left" | "right" | Sheet の出現方向 |
| overlayWidth | string | "" | オーバーレイの幅 |
| overlayHeight | string | "" | オーバーレイの高さ |
| overlayClassName | string | "" | オーバーレイに適用するクラス |
| toastText | string | "" | トースト通知テキスト |
| toastPosition | "bottom-right"\|"bottom-left"\|"top-right"\|"top-left" | "bottom-right" | トースト表示位置 |

---

## Props 一覧

| prop | 型 | デフォルト | 説明 |
|---|---|---|---|
| buttonData | string (JSON) | `[{"text":"Button 1",...},...]` | ボタン定義の JSON 文字列 |
| orientation | "horizontal"\|"vertical" | "horizontal" | ボタンの並び方向 |
| variant | "default"\|"destructive"\|"outline"\|"secondary"\|"ghost"\|"link" | "outline" | 全ボタン共通のスタイルバリアント |
| size | "default"\|"sm"\|"lg"\|"icon" | "default" | 全ボタン共通のサイズ |
| tooltipText | string | "" | ツールチップテキスト |
| tooltipSide | ""\|"top"\|"right"\|"bottom"\|"left" | "" | ツールチップの表示方向 |
| tooltipTrigger | "hover"\|"focus" | "hover" | ツールチップのトリガー |
| hoverCardMocPath | string | "" | HoverCard コンテンツの .moc パス |
| hoverCardSide | "top"\|"right"\|"bottom"\|"left" | "bottom" | HoverCard の表示方向 |
| hoverCardTrigger | "hover"\|"focus" | "hover" | HoverCard のトリガー |
| contextMenuMocPath | string | "" | ContextMenu コンテンツの .moc パス |
| width | string | "auto" | 幅 |
| height | string | "auto" | 高さ |
| className | string | "" | 追加 Tailwind クラス |
