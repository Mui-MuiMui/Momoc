# Typography コンポーネント仕様

## 概要
`CraftTypography` — バリアントに応じた HTML タグと Tailwind クラスでテキストを表示するコンポーネント。子コンポーネントは配置不可。

---

## 編集画面での挙動

```
<!-- ul/ol 以外 -->
<{tag} className={variantClass + className} style={width/height}>
  {text}
</{tag}>

<!-- ul または ol -->
<{tag} className={variantClass + className} style={width/height}>
  <li>item1</li>
  <li>item2</li>
  ...
</{tag}>
```

- `variant` に応じて HTML タグと基本クラスを `VARIANT_CONFIG` から取得
- `ul`/`ol` の場合: `items` をカンマ区切りで分割して `<li>` を並べる
- それ以外の場合: `text` をそのまま表示
- PropEditor で `text` は `ul`/`ol` 選択時に非表示、`items` は `ul`/`ol` 選択時のみ表示

---

## バリアント一覧

| variant | HTML タグ | 主な Tailwind クラス |
|---|---|---|
| h1 | h1 | `scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl` |
| h2 | h2 | `scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0` |
| h3 | h3 | `scroll-m-20 text-2xl font-semibold tracking-tight` |
| h4 | h4 | `scroll-m-20 text-xl font-semibold tracking-tight` |
| p | p | `leading-7 [&:not(:first-child)]:mt-6` |
| blockquote | blockquote | `border-l-4 pl-6 italic bg-transparent` |
| ul | ul | `list-disc [&>li]:mt-2` |
| ol | ol | `list-decimal [&>li]:mt-2` |
| code | code | `relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold` |
| lead | p | `text-xl text-muted-foreground` |
| large | div | `text-lg font-semibold` |
| small | small | `text-sm font-medium leading-none` |
| muted | p | `text-sm text-muted-foreground` |

---

## Webプレビューでの挙動

### 生成 TSX（craftToTsx.ts `renderTypography`）
```tsx
<!-- h1 の例 -->
<h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
  Heading 1
</h1>

<!-- ul の例 -->
<ul className="list-disc [&>li]:mt-2">
  <li>List item 1</li>
  <li>List item 2</li>
  <li>List item 3</li>
</ul>
```

- shadcn/ui のインポートは不要（プレーンな HTML タグを出力）
- `className` が指定されている場合はバリアントクラスと結合して出力
- `style` は `width`/`height` が `"auto"` でない場合のみ出力

---

## Props 一覧

| prop | 型 | デフォルト | 説明 |
|---|---|---|---|
| variant | "h1"\|"h2"\|"h3"\|"h4"\|"p"\|"blockquote"\|"ul"\|"ol"\|"code"\|"lead"\|"large"\|"small"\|"muted" | "h1" | 表示バリアント |
| text | string | "Heading 1" | 表示テキスト（ul/ol では非表示） |
| items | string | "List item 1,List item 2,List item 3" | カンマ区切りのリストアイテム（ul/ol のみ表示） |
| width | string | "auto" | 幅 |
| height | string | "auto" | 高さ |
| className | string | "" | 追加 Tailwind クラス |
