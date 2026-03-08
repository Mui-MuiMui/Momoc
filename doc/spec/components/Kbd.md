# Kbd（キーボードキー表示）仕様

## 概要
`<kbd>` タグ記法 — テキスト文字列の中に `<kbd>キー名</kbd>` を埋め込むことで、キーボードキーのスタイルを適用する書式機能。独立したコンポーネントではなく、複数コンポーネントのテキスト props に対応した横断的な機能。

---

## 使用方法

テキスト入力 props に `<kbd>キー名</kbd>` の形式で記述する:

```
保存 <kbd>Ctrl</kbd>+<kbd>S</kbd>
```

複数の `<kbd>` タグを1つのテキスト内に混在できる。

---

## 編集画面での挙動

`renderKbd` ユーティリティ（`webview-ui/src/utils/renderKbd.tsx`）がテキストを変換する:

- `<kbd>` を含まない場合: 文字列をそのまま表示
- `<kbd>` を含む場合: テキストを `<kbd>` タグで分割し、以下のスタイルを適用:

```
<kbd className="pointer-events-none inline-flex h-5 items-center gap-1 rounded border
  bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground select-none">
  {key}
</kbd>
```

---

## Webプレビューでの挙動

`craftToTsx.ts` の `kbdTextToJsx` 関数が JSX 文字列に変換する:

- 入力: `"Save <kbd>Ctrl</kbd>+<kbd>S</kbd>"`
- 出力: `<>Save <kbd className="pointer-events-none ...">Ctrl</kbd>+<kbd className="...">S</kbd></>`

---

## 対応コンポーネント・Props

| コンポーネント | 対応 prop |
|---|---|
| Button | text |
| ButtonGroup | items[].text |
| Alert | title, description |
| Badge | text |
| Card | title, description |
| Checkbox | label |
| Label | text |
| Switch | label, description |
| Toggle | text |
| Tooltip | triggerText, text |
| Sonner | triggerText, text |
| Text (HTML) | text |

---

## 注意

- `</kbd>` の閉じタグを忘れると変換が機能しない（正確な `<kbd>...</kbd>` 構文が必要）
- ネストした `<kbd>` は非対応
