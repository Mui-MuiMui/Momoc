# Button コンポーネント仕様

## 概要
`CraftButton` — テキストとバリアントを持つ汎用ボタン。オーバーレイ（モーダル等）のトリガーにもなれる。

---

## 編集画面での挙動

### レンダリング構造
```
<div className="relative inline-flex flex-col" style={width/height}>
  <button className={buttonVariants({ variant, size }) + className + w-full/h-full} disabled={disabled}>
    {text}
    {linkedMocPath && <span>🔗</span>}
  </button>
  {overlayType !== "none" && <span className="absolute -right-1 -top-2 ...バッジ...">overlay種別</span>}
</div>
```

- `width !== "auto"` の場合: 外側 div の style に width を設定 + button に `w-full` クラスを追加
- `height !== "auto"` の場合: 外側 div の style に height を設定 + button に `h-full` クラスを追加
- `overlayType !== "none"` の場合: ボタン右上に小さいバッジ（青）でオーバーレイ種別を表示
- `linkedMocPath` がある場合: テキスト末尾に鎖アイコンを表示

### 注意
- `className` は外側 div ではなく **button 要素に直接適用**する（v0.0.15 で修正済み）

---

## Webプレビューでの挙動

### 通常ボタン（overlayType = "none"）
shadcn/ui の `<Button>` コンポーネントをそのまま出力。

```tsx
<Button variant={variant} size={size} disabled={disabled} className={className} style={style}>
  {text}
</Button>
```

### オーバーレイ付きボタン（overlayType ≠ "none"）
`craftToTsx.ts` の `renderButton` が overlayType に応じてラップ構造を生成:
- `dialog` → `<Dialog>` + `<DialogTrigger asChild>`
- `alert-dialog` → `<AlertDialog>` + `<AlertDialogTrigger asChild>`
- `sheet` → `<Sheet>` + `<SheetTrigger asChild>`
- `drawer` → `<Drawer>` + `<DrawerTrigger asChild>`
- `popover` → `<Popover>` + `<PopoverTrigger asChild>`
- `dropdown-menu` → `<DropdownMenu>` + `<DropdownMenuTrigger asChild>`

`linkedMocPath` がある場合はオーバーレイ内に `{/* linked: path */}` コメントを出力。

### previewServer フォールバック（button）
- `role="combobox" && ComboboxCtx` の場合: **通常のボタンではなく入力フィールドに変化する**（Combobox で使用）
- その他: variant/size クラスを適用した通常の `<button>`

---

## Props 一覧

| prop | 型 | デフォルト | 説明 |
|---|---|---|---|
| text | string | "Button" | ボタンテキスト |
| variant | "default"\|"destructive"\|"outline"\|"secondary"\|"ghost"\|"link" | "default" | スタイルバリアント |
| size | "default"\|"sm"\|"lg"\|"icon" | "default" | サイズ |
| disabled | boolean | false | 無効状態 |
| overlayType | "none"\|"dialog"\|"alert-dialog"\|"sheet"\|"drawer"\|"popover"\|"dropdown-menu" | "none" | トリガーするオーバーレイ種別 |
| linkedMocPath | string | "" | オーバーレイコンテンツの .moc パス |
| sheetSide | "top"\|"right"\|"bottom"\|"left" | "right" | Sheet の出現方向 |
| alertDialogPattern | "cancel-continue"\|"continue-cancel"\|"yes-no"\|"no-yes"\|"ok-cancel"\|"cancel-ok" | "cancel-continue" | Alert Dialog のボタン配置パターン（overlayType="alert-dialog" 時のみ有効） |
| overlayWidth | string | "" | オーバーレイの幅 |
| overlayHeight | string | "" | オーバーレイの高さ |
| overlayClassName | string | "" | オーバーレイに適用するクラス |
| tooltipText | string | "" | ツールチップテキスト |
| tooltipSide | ""\|"top"\|"right"\|"bottom"\|"left" | "" | ツールチップの表示方向 |
| toastText | string | "" | トースト通知テキスト |
| toastPosition | "bottom-right"\|"bottom-left"\|"top-right"\|"top-left" | "bottom-right" | トースト表示位置 |
| width | string | "auto" | 幅 |
| height | string | "auto" | 高さ |
| className | string | "" | 追加 Tailwind クラス |

---

## 既知の落とし穴

- `className` を外側 div に適用すると、TailwindEditor の Alignment 系（Text Align 等）が効かなくなる。必ず **button 要素**に適用すること
- previewServer の button フォールバックは `role="combobox"` 時に Combobox 用の検索フィールドとして機能するため、この分岐を削除してはならない
