# .moc ファイル形式仕様書

**バージョン:** 1.0.0
**ステータス:** 正式仕様

---

## 1. 概要

`.moc` ファイルは、VSCode拡張「Momoc」で作成されるGUIモックアップの定義ファイルです。
TSX（TypeScript JSX）形式をベースとし、人間・GUI・AIエージェントが協調して開発を行うための統合データ形式です。

### 技術スタック

- **CSS**: Tailwind CSS v4（ユーティリティファーストCSS）
- **UIコンポーネント**: shadcn/ui（Radix UI + Tailwind CSSベース）
- importパス `@/components/ui/*` はshadcn/uiコンポーネントを指す
- 導入先にTailwind CSSやshadcn/uiがない場合は、導入先の技術スタックで同等の見た目・レイアウトを再現すること

### 設計原則

- **人間可読性**: TSX部分はそのままReactコンポーネントとして読解可能
- **AI可読性**: メタデータ・メモ・エディタデータがすべてテキストとして読解可能
- **SSOT（Single Source of Truth）**: GUIエディタの状態（craftState）が存在する場合、TSXコードよりcraftStateが正とする。TSXはcraftStateから自動生成される派生データである

---

## 2. ファイル構造

`.moc` ファイルは以下の4セクションで構成されます:

```
┌─────────────────────────────────┐
│ 1. JSDocメタデータブロック       │  必須
│    (@moc-* タグ)                │
├─────────────────────────────────┤
│ 2. importブロック               │  任意
│    (ESモジュールimport文)        │
├─────────────────────────────────┤
│ 3. TSXコンポーネント            │  必須
│    (export default function)     │
├─────────────────────────────────┤
│ 4. エディタデータブロック        │  任意
│    (const __mocEditorData = ``) │
└─────────────────────────────────┘
```

---

## 3. メタデータブロック（JSDocコメント）

ファイル先頭のJSDocコメント内に `@moc-*` タグでメタデータを記述します。

### 3.1 ヘッダー説明文

```typescript
/**
 * Momoc Document (.moc)
 * VSCode拡張「Momoc」で作成されたGUIモックアップの定義ファイルです。
 * 人間・GUI・AIエージェントが協調して開発を行うための統合データ形式です。
 *
 * ファイル構造:
 *   本ファイルはTSX（TypeScript JSX）形式をベースとし、
 *   メタデータと付箋メモをJSDocコメント内に、
 *   エディタ内部状態をテンプレートリテラル変数に格納しています。
 *   TSX部分はそのままReactコンポーネントとして読解可能です。
 *
 * 技術スタック:
 *   CSS: Tailwind CSS v4（ユーティリティファーストCSS）
 *   UIコンポーネント: shadcn/ui（Radix UI + Tailwind CSSベース）
 *   importパス「@/components/ui/*」はshadcn/uiコンポーネントです。
 *   導入先にTailwind CSSやshadcn/uiがない場合は、
 *   導入先の技術スタックで同等の見た目・レイアウトを再現してください。
 *
 * SSOT（Single Source of Truth）:
 *   GUIエディタの状態（craftState）が末尾のエディタデータに存在する場合、
 *   TSXコードよりcraftStateが正となります。
 *   TSXはcraftStateから自動生成される派生データです。
 *   AIエージェントがTSXを編集した場合、GUIエディタ側でcraftStateが再構築されます。
 *
 * メタデータ:
 *   @moc-version  - ドキュメント形式バージョン（必須）
 *   @moc-intent   - このページの目的・意図（任意、人間が記述）
 *   @moc-theme    - テーマ (light | dark)（任意、デフォルト: light）
 *   @moc-layout   - レイアウトモード (flow | absolute)（任意、デフォルト: flow）
 *   @moc-viewport - 対象ビューポート (desktop | tablet | mobile | WxH)（任意、デフォルト: desktop）
 *
 * AI指示メモ:
 *   ユーザーがキャンバス上に配置した、AIエージェントへの指示付箋です。
 *   各メモは @moc-memo タグで記述され、対象要素IDと指示テキストのペアです。
 *   AIはこのメモを読み取り、該当要素に対する修正・提案を行ってください。
 *
 * TSX内コメント規約:
 *   @moc-node <nodeID>  - Craft.jsノードとの対応付け
 *   @moc-role <役割>     - 要素の役割説明
 *   @moc-memo <メモ>     - 付箋メモの概要
 */
```

### 3.2 メタデータタグ

| タグ | 必須/任意 | 型 | デフォルト | 説明 |
|------|-----------|------|-----------|------|
| `@moc-version` | **必須** | `string` | - | ドキュメント形式バージョン（例: `1.0.0`） |
| `@moc-intent` | 任意 | `string` | `""` | ページの目的・意図 |
| `@moc-theme` | 任意 | `"light" \| "dark"` | `"light"` | テーマ |
| `@moc-layout` | 任意 | `"flow" \| "absolute"` | `"flow"` | レイアウトモード |
| `@moc-viewport` | 任意 | `string` | `"desktop"` | `desktop`, `tablet`, `mobile`, または `WxH` 形式 |
| `@moc-memo` | 任意 | - | - | AI指示メモ（複数可） |

### 3.3 AI指示メモ (@moc-memo)

```
@moc-memo #<対象要素ID> "指示テキスト"
```

- `#<対象要素ID>`: TSX内の要素を特定するID（`id` 属性値）
- `"指示テキスト"`: AIエージェントへの指示（ダブルクォートで囲む）
- 複数指定可能

---

## 4. importブロック

標準のESモジュールimport文を記述します。

```typescript
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
```

---

## 5. TSXコンポーネント

`export default function` 形式のReactコンポーネントを記述します。

```typescript
export default function LoginForm() {
  return (
    <>
      {/* @moc-node abc123 */}
      {/* @moc-role "ログインフォーム" */}
      <div className="flex min-h-screen items-center justify-center">
        {/* @moc-node def456 */}
        {/* @moc-memo "メールバリデーション必須" */}
        <Input id="emailInput" type="email" placeholder="Email" />
      </div>
    </>
  );
}
```

### 5.1 TSX内コメント規約

GUIエディタがTSXを生成する際、各要素に以下のコメントを付与します:

| コメント | 説明 |
|----------|------|
| `{/* @moc-node <nodeID> */}` | Craft.jsノードIDとの対応付け。すべてのノードに付与 |
| `{/* @moc-role "<役割>" */}` | 要素のroleプロパティ値。roleが設定されている場合に付与 |
| `{/* @moc-memo "<メモ概要>" */}` | 付箋メモの概要テキスト。メモが紐づいている場合に付与 |

これらのコメントはAIエージェントがTSX内の要素を理解するための補助情報です。

---

## 6. エディタデータブロック

GUIエディタの内部状態を保存するためのブロックです。
テンプレートリテラル変数としてファイル末尾に格納されます。

### 6.1 形式

```typescript
const __mocEditorData = `
{
  "craftState": { ... },
  "memos": [ ... ],
  "viewport": { ... }
}
`;
```

### 6.2 フィールド

| フィールド | 必須/任意 | 型 | 説明 |
|-----------|-----------|------|------|
| `craftState` | **必須** | `Record<string, unknown>` | Craft.jsノードツリー |
| `memos` | **必須** | `MocEditorMemo[]` | 付箋メモの完全データ |
| `viewport` | 任意 | `{ mode, width, height }` | ビューポート設定 |

### 6.3 エスケープ規則

テンプレートリテラル内のJSON文字列では、以下のエスケープが必要です:

| 文字 | エスケープ後 |
|------|-------------|
| `` ` `` (バッククォート) | `\`` |
| `${` (テンプレート式) | `\${` |

パーサーはこれらを復元（アンエスケープ）してからJSON.parseします。

### 6.4 JSON整形ルール

- 2スペースインデント
- 改行コード: LF
- 末尾改行あり

---

## 7. 正規化ルール

`.moc` ファイルを保存する際は以下の正規化を行います:

- **改行コード**: LF (`\n`)
- **末尾改行**: あり（ファイル末尾に1つの改行）
- **エディタデータJSON**: 2スペースインデント
- **セクション間**: 空行1行で区切り

---

## 8. 互換性ポリシー

### 8.1 廃止タグ

以下のタグは廃止されました。パーサーはこれらを検出しても無視します:

| 廃止タグ | 理由 |
|----------|------|
| `@moc-id` | ファイルコピー・テンプレート化時のID整合性管理が困難なため |
| `@moc-editor-data` (base64コメントブロック) | 人間・AI可読性が低いため、テンプレートリテラル形式に移行 |

### 8.2 未知フィールドの扱い

- メタデータブロック内の未知の `@moc-*` タグ → **無視する**（エラーにしない）
- エディタデータJSON内の未知フィールド → **無視する**（エラーにしない）
- 将来のバージョンで新しいフィールドが追加される可能性があるため、未知フィールドを見ても処理を中断しない

### 8.3 下位互換

本仕様（v1.0.0正式版）は暫定版との下位互換を**保証しません**。
旧形式ファイルは新バージョンのパーサーで正しく読み込めない場合があります。

---

## 9. 完全なファイル例

```typescript
/**
 * Momoc Document (.moc)
 * VSCode拡張「Momoc」で作成されたGUIモックアップの定義ファイルです。
 * 人間・GUI・AIエージェントが協調して開発を行うための統合データ形式です。
 *
 * ...（ヘッダー説明文省略）...
 *
 * @moc-version 1.0.0
 * @moc-intent Login form mockup
 * @moc-theme light
 * @moc-layout flow
 * @moc-viewport desktop
 *
 * @moc-memo #loginButton "Submit button for login action"
 * @moc-memo #emailInput "Email validation required"
 */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginForm() {
  return (
    <>
      {/* @moc-node ROOT */}
      <div className="flex min-h-screen items-center justify-center">
        {/* @moc-node node1 */}
        {/* @moc-memo "Email validation required" */}
        <Input id="emailInput" type="email" placeholder="Email" />
        {/* @moc-node node2 */}
        {/* @moc-memo "Submit button for login action" */}
        <Button id="loginButton">Login</Button>
      </div>
    </>
  );
}

const __mocEditorData = `
{
  "craftState": {
    "ROOT": {
      "type": { "resolvedName": "CraftContainer" },
      "props": { "className": "flex min-h-screen items-center justify-center" },
      "nodes": ["node1", "node2"],
      "linkedNodes": {},
      "parent": null
    }
  },
  "memos": [],
  "viewport": {
    "mode": "desktop",
    "width": 1280,
    "height": 800
  }
}
`;
```
