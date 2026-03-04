---
name: release-notes
description: "Generates bilingual (Japanese + English) release notes in a code block. Use this skill when the user asks to create release comments, release notes, or changelog entries."
user-invocable: true
risk: safe
---

# Release Notes Skill

リリースコメントを日本語・英語のバイリンガル形式でコードブロックとして生成します。

> **Note:** リリース作業（GitHubリリース作成・公開・タグ打ちなど）は人間が行います。このskillはリリースコメントの文章を生成するだけです。

## 出力フォーマット

日本語セクションと英語セクションを `---` で分離して出力します。

````markdown
```markdown
## {タイトル}

大まかな変更内容を1〜3文でまとめる（日本語）。

<details>
<summary>詳細</summary>

### 変更点

- 変更1の説明
- 変更2の説明

### 修正

- バグ修正1

</details>

---

## {タイトル}

Summary of changes in 1–3 sentences (English).

<details>
<summary>Details</summary>

### Changes

- Description of change 1
- Description of change 2

### Fixes

- Bug fix 1

</details>
```
````

## ルール

1. **タイトルのデフォルトは現在のブランチ名** — ユーザーが指定していない場合は `git branch --show-current` で取得したブランチ名をタイトルに使用する。
2. **リリース作業は人間が行う** — コメント生成のみ行い、GitHub リリース作成・タグ打ち・公開などの操作は一切行わない。
3. **日本語と英語は分離** — 日本語リリースコメントを先に記載し、`---` を挟んで英語リリースコメントを続ける。同一行に混在させない。
4. **詳細は `<details>` タグ内に** — 変更点・修正・その他のセクションに分けて箇条書きで記載。
5. **コードブロックで出力** — 出力全体を ` ```markdown ``` ` で囲む。
6. **git log や差分から自動収集** — 可能であれば `git log` や変更ファイルの内容からリリース内容を読み取る。

## 生成手順

1. タイトルを確認（未指定の場合は `git branch --show-current` でブランチ名を取得してデフォルトとする）
2. 現在のブランチの変更内容を調査（git log、コミットメッセージ、変更ファイル）
3. 変更を「機能追加」「バグ修正」「改善」「その他」に分類
4. 日本語セクションを生成
5. `---` セパレーターを挟んで英語セクションを生成
6. 全体をコードブロックで出力
