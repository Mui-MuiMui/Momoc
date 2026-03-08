# Carousel コンポーネント仕様

## 概要
`CraftCarousel` — スライドショー形式のカルーセル。編集画面では最初のスライドのみ表示。

---

## 編集画面での挙動

- `slideMeta` の `keys` に対応するスライド数分の `SlideContentSlot`（canvas）が生成される
- 各スライドは `<Element id="slide_{key}" is={SlideContentSlot} canvas />` として配置
- エディタ上では上部に prev/next ボタンでアクティブスライドを切り替え可能
- `showArrows: true` の場合、orientation に応じて上下または左右にナビゲーションボタンを表示
- `orientation: "vertical"` の場合は上下矢印、`"horizontal"` の場合は左右矢印

```
<div className="relative" style={width/height}>
  <!-- ドラッグハンドルストリップ（ホバーで表示） -->
  <div className="absolute top-0 ...">⠿ Carousel</div>

  <!-- スライドコンテンツスロット（activeKey のもののみ表示） -->
  <div className="overflow-hidden w-full h-full">
    {meta.keys.map(key => (
      <div key={key} style={{ display: key === activeKey ? undefined : "none" }}>
        <Element id={`slide_${key}`} is={SlideContentSlot} canvas />
      </div>
    ))}
  </div>

  <!-- ナビゲーション矢印（showArrows === true の場合） -->
  <button ...>← / ↑</button>
  <button ...>→ / ↓</button>

  <!-- インジケータードット -->
  <div className="absolute bottom-2 flex gap-1.5 ...">
    <span />  <!-- アクティブ: bg-foreground -->
    <span />  <!-- 非アクティブ: bg-foreground/30 -->
  </div>
</div>
```

---

## Props 一覧

| prop | 型 | デフォルト | 説明 |
|---|---|---|---|
| slideMeta | string | `{"keys":[0,1,2],"nextKey":3,"labels":{"0":"Slide 1","1":"Slide 2","2":"Slide 3"}}` | スライド構成 JSON（`SlideMeta` 型） |
| orientation | "horizontal"\|"vertical" | "horizontal" | スライドの移動方向 |
| loop | boolean | false | 最初/最後でループするか |
| showArrows | boolean | true | ナビゲーション矢印を表示するか |
| width | string | "320px" | 幅 |
| height | string | "200px" | 高さ |
| className | string | "" | 追加 Tailwind クラス |
