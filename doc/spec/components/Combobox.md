# Combobox コンポーネント仕様

## 概要
`CraftCombobox` — 選択肢リストから項目を選べるドロップダウン。Webプレビューでは検索・絞り込み・選択が可能。

---

## 編集画面での挙動

### レンダリング構造
```
<button type="button" className="flex h-9 w-full items-center justify-between ..." style={width/height}>
  <span className="text-muted-foreground">{placeholder}</span>
  <svg><!-- ChevronsUpDown アイコン --></svg>
</button>
```

- 見た目はトリガーボタンのみ。ドロップダウンは開かない（静的表示）
- `width !== "auto"` の場合: button の style に width を設定
- `height !== "auto"` の場合: button の style に height を設定
- `className` は button に適用
- `items` / `contentWidth` は編集画面では使用されない（プレビュー専用 prop）

---

## Webプレビューでの挙動

### 生成 TSX 構造（craftToTsx.ts `renderCombobox`）
```tsx
<Popover style={{ width: popoverWidth }}>
  <PopoverTrigger asChild>
    <Button variant="outline" role="combobox" className="w-full justify-between {userClass}" style={{ height }}>
      {placeholder}
      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
    </Button>
  </PopoverTrigger>
  <PopoverContent className="p-0" style={{ width: contentWidth }}>
    <Command>
      <CommandInput placeholder="Search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup>
          <CommandItem value="Apple">Apple</CommandItem>
          ...
        </CommandGroup>
      </CommandList>
    </Command>
  </PopoverContent>
</Popover>
```

- `width: auto` の場合: Popover ラッパーに `width: 100%` を渡して親幅に追従
- `width` 指定ありの場合: Popover ラッパーにその幅を渡す
- `height` は Button に渡す

### フォールバック実装（previewServer.ts）
Combobox は以下のコンポーネントが連携して動作する:

**`Popover` フォールバック**
- `ComboboxCtx`（`open/setOpen/value/setValue/search/setSearch`）を提供。Combobox input は z-10
- `PopoverTrigger`: クリックで `setOpen(!open)` トグル
- `PopoverContent`: `createPortal` で body に portal（fixed, z-[52]）、triggerRef からドロップダウン位置を計算。backdrop は z-[51]

**`Button` フォールバック（`role="combobox"` 分岐）**
- `ComboboxCtx` が存在する場合、通常のボタンではなく **検索入力フィールドに変化する**
- `<input type="text">` を表示し、`comboCtx.search` を `value`、`comboCtx.setSearch` を `onChange` に使用
- フォーカスで `setOpen(true)` を呼ぶ

**`CommandInput` フォールバック**
- `ComboboxCtx` が存在する場合（= Combobox 内部）は `null` を返す（非表示）
- 入力は Button フォールバックの `role="combobox"` 分岐が担うため

**`CommandItem` フォールバック**
- `comboCtx.search` で value に対してフィルタリング（大文字小文字無視）
- クリック時: `comboCtx.setValue(value)`・`comboCtx.setSearch(value)`・`comboCtx.setOpen(false)`
- 選択済みアイテムは `bg-accent text-accent-foreground`

---

## Props 一覧

| prop | 型 | デフォルト | 説明 |
|---|---|---|---|
| items | string | "Apple,Banana,Cherry" | カンマ区切りの選択肢（プレビュー専用） |
| placeholder | string | "Select an option..." | プレースホルダーテキスト |
| linkedMocPath | string | "" | 外部データ参照 .moc パス |
| contentWidth | string | "" | ドロップダウンの幅（空 = トリガー幅に追従） |
| width | string | "auto" | トリガーの幅 |
| height | string | "auto" | トリガーの高さ |
| className | string | "" | 追加 Tailwind クラス |

---

## 既知の落とし穴

- **Combobox の検索フィールドは `CommandInput` ではなく `Button`（role="combobox"）が担う**。`renderCombobox` のトリガーを native `<button>` に変更すると Button フォールバックの `role="combobox"` 分岐が通らなくなり、検索フィールドが消える
- `CommandInput` の `if (comboCtx) return null` は正しい動作。削除してはならない
- import 収集で `Popover`（本体）と `Button` の両方を忘れないこと
