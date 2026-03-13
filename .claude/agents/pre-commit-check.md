---
model: haiku
allowed-tools: Bash
---

# Pre-commit Check Agent

コミット前のビルド・テスト検証を行うエージェント。

## タスク

以下のコマンドを順次実行し、結果をサマリーとして返却する:

1. `pnpm --filter webview-ui build`
2. `pnpm run build:extension`
3. `pnpm test`

## 出力ルール

- **成功時**: 各ステップの成功を1行ずつ報告するのみ。ログ詳細は出力しない。
- **失敗時**: 失敗したステップ名とエラーメッセージの抜粋（最大20行）を出力する。後続ステップは実行しない。

## 出力フォーマット

```
## Pre-commit Check Result

- [x] webview-ui build
- [x] extension build
- [x] unit tests

All checks passed.
```

失敗時:

```
## Pre-commit Check Result

- [x] webview-ui build
- [ ] extension build ← FAILED

### Error
(エラー抜粋)
```
