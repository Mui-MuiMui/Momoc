# Select コンポーネント仕様

## 概要
`CraftSelect` — ドロップダウンから単一項目を選択するコンポーネント。

---

## 編集画面での挙動

### レンダリング構造
```
<button type="button" className="flex h-9 w-full items-center justify-between ..." style={width/height}>
  <span className="text-muted-foreground">{placeholder}</span>
  <svg><!-- ChevronDown アイコン --></svg>
</button>
```

- 見た目はトリガーボタンのみ。ドロップダウンは開かない（静的表示）
- `className` は button に適用
- `items` / `contentWidth` は編集画面では使用されない

---

## Webプレビューでの挙動

### 生成 TSX 構造（craftToTsx.ts `renderSelect`）
```tsx
<Select>
  <SelectTrigger className={className} style={style}>
    <SelectValue placeholder="{placeholder}" />
  </SelectTrigger>
  <SelectContent style={{ width: contentWidth }}>
    <SelectItem value="Option 1">Option 1</SelectItem>
    <SelectItem value="Option 2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

`tooltipText` がある場合は `TooltipProvider` + `Tooltip` で SelectTrigger をラップ。

### フォールバック実装（previewServer.ts `select`）
- `SelectCtx`（`value/open/triggerRef`）で状態管理
- `SelectTrigger`: useEffect でマウント時に幅を計測し `triggerRef` に格納
- `SelectContent`: `createPortal` で body に portal（fixed, z-[52]）、triggerRef からドロップダウン位置を計算。backdrop は z-[51]。`contentWidth` 未指定時は triggerRef の幅を使用
- `SelectItem`: クリックで `setValue(value)`・`setOpen(false)`

---

## Props 一覧

| prop | 型 | デフォルト | 説明 |
|---|---|---|---|
| items | string | "Option 1,Option 2,Option 3" | カンマ区切りの選択肢（プレビュー専用） |
| placeholder | string | "Select an option" | プレースホルダーテキスト |
| contentWidth | string | "" | ドロップダウンの幅（空 = トリガー幅に追従） |
| width | string | "auto" | トリガーの幅 |
| height | string | "auto" | トリガーの高さ |
| className | string | "" | 追加 Tailwind クラス |
| tooltipText | string | "" | ツールチップテキスト |
| tooltipSide | ""\|"top"\|"right"\|"bottom"\|"left" | "" | ツールチップの表示方向 |
