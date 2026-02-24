# Momoc
Detailed Specification: Interactive Design-Code Lab (Full Edition)

## 1. 開発コンセプト
人間、GUI、AIエージェント（Claude Code等）が1つのキャンバスを囲み、「相談・指示・自作」をシームレスに切り替えて開発を行うためのVSCode拡張機能。

---

## 2. Webview 実装要件 (Technical Core)

### 2.1 実行環境とセキュリティ
- **Vite-based Webview**: 拡張機能内にReact+Vite環境を構築。
- **CSP (Content Security Policy)**: 動的なコンポーネント実行を許可するため、厳密なNonce管理とローカルサーバー（localhost）経由の通信を許可。
- **Shadow DOM**: Webview内のTailwindスタイルが、VSCode自体のUIや他のエディタ要素に干渉しないよう、プレビュー領域をShadow DOMで完全に隔離する。

### 2.2 動的バンドル・インジェクション
- **ESBuild (Wasm)**: Extension Host（Node.js）側でESBuildを稼働。ユーザーが選択した、またはAgentが生成した`.tsx`パーツを瞬時にWebview実行可能なJSに変換。
- **Hot-Relay**: 変換されたJSを`postMessage`で送り、Webview側のReactが`Suspense`や`lazy`、または動的インポート（Blob URL）を用いて即座に描画を更新する。

---

## 3. 双方向コード同期 (Data Synchronization)

### 3.1 ASTによる連動 (ts-morph)
- **GUI to Code**: Craft.jsのNodeツリーの変更を検知。`ts-morph`を用いて、ターゲットとなるTSXファイルのJSX構造のみを部分的に書き換える。
- **Code to GUI**: ファイルの保存イベント（`onDidSaveTextDocument`）をトリガーにASTを再解析。手動で書き換えられたコードをGUIのノードに逆反映させる。

### 3.2 統合データ形式 (.moc)
- 独自拡張子 `.moc` をカスタムエディタとして登録。
- **構造**: JSON形式。Craft.jsの状態、インポートマップ、人間の意図（メモ）、AI用の平坦化コード（Flat TSX）を内包。

---

## 4. エージェント連携プロトコル (Agent Interaction)

### 4.1 セレクション・コンテキスト
- GUIで要素を選択した瞬間、以下の情報をAgentに送信。
  - ソースコード上の位置（Line/Column）
  - 現在のProps（variant, size等）
  - 計算済みのTailwindクラス名
- これにより、Agentは「今何について相談されているか」を即座に把握する。

### 4.2 インテント・メモ (Intent Memo)
- ユーザーがGUI上に「AIへの指示」を付箋のように配置できる機能。
- Agentはこのメモをスキャンし、具体的なshadcn/uiパーツへの置換やロジックの実装を提案・実行する。

---

## 5. ロードマップ

### Phase 1: Foundation
- Webview + Shadow DOM + Tailwind JIT の基盤構築。
- `.vsuib` ファイルの基本保存・読み込み。

### Phase 2: Dynamic Component
- ESBuildによるローカルTSXのビルドとWebviewへの注入。
- `npx shadcn` 連携による自動パーツ追加。

### Phase 3: Agentic Integration
- Selection Context のエージェントへの自動受け渡し。
- 平坦化エクスポート（Single File Export）機能の実装。
