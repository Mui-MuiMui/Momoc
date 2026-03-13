# Momoc

## Rules
詳細なルールは `.claude/rules/` を参照してください。

| ファイル                                                               | 内容                                         |
| ---------------------------------------------------------------------- | -------------------------------------------- |
| [package-manager.md](.claude/rules/package-manager.md)                 | パッケージマネージャの利用（pnpm必須）       |
| [git-workflow.md](.claude/rules/git-workflow.md)                       | Git操作・PRの命名規則                        |
| [implementation-workflow.md](.claude/rules/implementation-workflow.md) | Planモード・一次ソース確認・既存パターン確認 |
| [ui-panels.md](.claude/rules/ui-panels.md)                             | TailwindEditor / PropEditor の区別           |
| [moc-data-policy.md](.claude/rules/moc-data-policy.md)                 | .mocファイルのデータポリシー                 |
| [testing.md](.claude/rules/testing.md)                                 | ユニット/E2Eテストの構成・実行・見直し基準   |
| [subagent-usage.md](.claude/rules/subagent-usage.md)                   | サブエージェントの使用タイミング・使い分け   |

## Agentについて

タスクに応じて以下のサブエージェントを活用してください。

| エージェント                                                           | モデル | 用途                                                   |
| ---------------------------------------------------------------------- | ------ | ------------------------------------------------------ |
| [pre-commit-check](.claude/agents/pre-commit-check.md)                 | haiku  | ビルド+テスト実行、結果サマリー返却                    |
| [craft-component-scaffold](.claude/agents/craft-component-scaffold.md) | sonnet | 新規Craftコンポーネント追加時の既存パターン調査        |
| [impact-analysis](.claude/agents/impact-analysis.md)                   | sonnet | ファイル変更の影響範囲分析                             |
| [code-review](.claude/agents/code-review.md)                           | opus   | コード変更のレビュー（Error/Warning/Suggestion 3段階） |
| [moc-data-validator](.claude/agents/moc-data-validator.md)             | haiku  | .mocファイルとcraft.props定義の整合性検証              |

## Skillについて

動作に合わせて関連するスキルを参照してください。

| ファイル                                                    | 内容                                 |
| ----------------------------------------------------------- | ------------------------------------ |
| [frontend-design](.agents\skills\frontend-design)           | フロントエンドデザインに関するスキル |
| [e2e-testing-patterns](.agents\skills\e2e-testing-patterns) | E2Eテストに関するスキル              |
| [clean-code](.agents\skills\clean-code)                     | コーディングに関するスキル           |
| [drawio-diagram](.agents\skills\drawio-diagram)             | ダイアグラムに関するスキル           |
| [release-notes](.agents\skills\release-notes)               | リリースコメント作成に関するスキル   |
