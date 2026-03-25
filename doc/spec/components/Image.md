# Image コンポーネント仕様

## 概要
`CraftImage` — 画像を表示するコンポーネント。URLまたはワークスペース内の画像ファイルを参照可能。

---

## 編集画面での挙動

### レンダリング構造
```
<!-- src が設定されている場合 -->
<div className={className} style={width/height}>
  <img src={resolvedSrc} alt={alt} style={{ width: "100%", height: "100%", objectFit }} />
</div>

<!-- src が未設定の場合（プレースホルダー） -->
<div className="flex flex-col items-center justify-center gap-2 bg-gray-200 text-gray-400 {className}" style={width/height}>
  <Image size={32} />  <!-- lucide-react アイコン -->
  <span className="text-xs">画像URLを設定</span>
</div>
```

- `src` にワークスペース相対パスが設定されている場合、`useResolvedImageSrc` フックで webview URI に変換
- `clickThrough` は編集画面では使用されない（プレビュー専用 prop）

---

## Webプレビューでの挙動

### 生成 TSX 構造（craftToTsx `defaultRenderer`）
```tsx
<img src="/path/to/image.png" alt="説明" className="..." style={{ width: "300px", height: "200px", objectFit: "contain" }} />
```

- `clickThrough` が `true` の場合: `style` に `pointerEvents: "none"` を追加
  ```tsx
  <img src="..." style={{ width: "300px", height: "200px", pointerEvents: "none" }} />
  ```
- Self-closing タグで出力

### フォールバック実装（previewServer.ts）
プレビューサーバーでは `<img>` はネイティブ HTML 要素のためフォールバック不要。

---

## Props 一覧

| prop | 型 | デフォルト | 説明 |
|---|---|---|---|
| src | string | "" | 画像URL または ワークスペース相対パス |
| alt | string | "" | 代替テキスト |
| width | string | "300px" | 画像の幅 |
| height | string | "200px" | 画像の高さ |
| objectFit | "cover"\|"contain"\|"fill"\|"none"\|"scale-down" | "cover" | オブジェクトフィット |
| keepAspectRatio | boolean | false | アスペクト比を維持（RenderNodeのリサイズハンドルで比率維持） |
| clickThrough | boolean | false | true 時にプレビュー出力で `pointerEvents: "none"` を付与 |
| className | string | "" | 追加 Tailwind クラス |

---

## 既知の落とし穴

- **clickThrough はプレビュー出力専用**。編集画面では常に選択・ドラッグ可能
- `keepAspectRatio` は CSS ではなく RenderNode のドラッグハンドルで比率維持を行う仕組み（`CraftAspectRatio` と同じパターン）
- `objectFit` のデフォルト値 `"cover"` は craftToTsx の defaultProps と一致するため、TSX出力時にデフォルト値と同じ場合は省略される
