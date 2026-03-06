# SIZE_SPEC — サイズプロパティ仕様

## 1. 概要

Momocの全コンポーネントにおける `width` / `height` プロパティの仕様を定義する。
コンポーネントごとの実装差異をなくし、編集画面とWebプレビューの挙動を統一することを目的とする。

---

## 2. 値の定義

| 値 | 意味 | CSS style への変換 |
|---|---|---|
| `"auto"` | shadcn/UIのデフォルト挙動を使用（明示的なデフォルト選択） | `style.width` を付与しない |
| `""` （空文字） | 未指定（幅指定なし） | `style.width` を付与しない |
| `"200px"` / `"50%"` / `"2rem"` 等 | 数値 + 単位による明示指定 | `style={{ width: "200px" }}` 等を付与 |

### 2.1 `"auto"` と `""` の違い

現時点では両者の動作は同一（どちらも `style.width` を付与しない）。
意味的な区別として以下を定義する:

- `"auto"` — ユーザーが「デフォルト」を明示的に選択した状態
- `""` — ユーザーが値を未入力のまま auto をOFFにした状態（「指定なし」）

### 2.2 利用できる単位

PropEditorのUIで選択可能な単位: `px` / `%` / `rem` / `em` / `vw` / `vh`

---

## 3. PropEditor UI 仕様

### 3.1 レイアウト

```
width
[ auto ]          ← トグルボタン（ON時: vscode-button-background で強調）
[ 100    ] [ px ▼ ]  ← auto ON時は opacity-40 + pointer-events-none（入力不可）
```

### 3.2 動作

| 操作 | 保存される値 |
|---|---|
| auto ON（デフォルト） | `"auto"` |
| auto OFF + 数値入力 + 単位選択 | `"100px"`, `"50%"` 等 |
| auto OFF + 数値未入力 | `""` （空文字） |

---

## 4. Craftコンポーネント実装ルール

### 4.1 style の適用条件

```tsx
// 正しい実装パターン
style={{ width: width && width !== "auto" ? width : undefined }}
```

- `"auto"` → `undefined` → `style.width` なし
- `""` → falsy → `undefined` → `style.width` なし
- `"200px"` → `style={{ width: "200px" }}`

### 4.2 wrapper div の w-full 付与ルール

`w-full` をデフォルトで持つコンポーネント（Input、Textarea等）のwrapper divは、
auto時に `className="w-full"` を付与してプレビューと挙動を一致させる。

```tsx
<div
  className={!width || width === "auto" ? "w-full" : undefined}
  style={{ width: width && width !== "auto" ? width : undefined }}
>
```

---

## 5. craftToTsx / previewServer 処理ルール

### 5.1 craftToTsx.ts の buildStyleAttr

```typescript
// normalizeCssSize: "auto" → そのまま返す、単位なし数値 → "px" 付与
// buildStyleAttr: if (w && w !== "auto") で auto/空文字は除外
```

`"auto"` と `""` はどちらも style 属性に出力されない。

### 5.2 previewServer.ts のfallbackパターン

```tsx
// Input / Textarea: style.width がなければ w-full を付与
const cls = cn("...", !style?.width && "w-full", !style?.height && "h-9", className);
```
