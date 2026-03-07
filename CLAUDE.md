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

## Skillについて

動作に合わせて関連するスキルを参照してください。

- **フロントエンドデザインに関するスキル**
  - [frontend-design](.agents\skills\frontend-design)
- **E2Eテストに関するスキル**
  - [e2e-testing-patterns](.agents\skills\e2e-testing-patterns)
- **コーディングに関するスキル**
  - [clean-code](.agents\skills\clean-code)
- **ダイアグラムに関するスキル**
  - [drawio-diagram](.agents\skills\drawio-diagram)
- **リリースコメント作成に関するスキル**
  - [release-notes](.agents\skills\release-notes)
