# shadcn/ui Component Status

shadcn/ui 公式コンポーネントの実装状況と確認状態を管理するチェックリスト。

## ステータス凡例

| ステータス  | 意味                   |
| ----------- | ---------------------- |
| Implemented | 実装済み               |
| Planned     | 実装予定               |
| Not Planned | 実装しない（理由あり） |
| TBD         | 要検討                 |

## コンポーネント一覧

### Core / Form

| Component     | Status      | Confirmed | Notes                                      |
| ------------- | ----------- | --------- | ------------------------------------------ |
| Button        | Implemented | [x]       |                                            |
| Button Group  | TBD         | [ ]       | 欲しいが実装方針は未定                     |
| Input         | Implemented | [x]       |                                            |
| Input Group   | TBD         | [ ]       | 欲しいが表現方法が課題                     |
| Input OTP     | TBD         | [ ]       |                                            |
| Textarea      | Implemented | [x]       |                                            |
| Label         | Implemented | [x]       |                                            |
| Checkbox      | Implemented | [x]       |                                            |
| Radio Group   | Implemented | [x]       |                                            |
| Select        | Implemented | [x]       |                                            |
| Native Select | Not Planned | [x]       | Selectで代用可能                           |
| Combobox      | Planned     | [ ]       | Command ベースで構成                       |
| Switch        | Implemented | [x]       |                                            |
| Slider        | Implemented | [x]       | 横スライダーのみ他は要件等                 |
| Toggle        | Implemented | [x]       | 見た目だけ実装。On/Offのトグルが効かない   |
| Toggle Group  | Implemented | [ ]       |                                            |
| Form          | Implemented | [ ]       |                                            |
| Field         | Not Planned | [x]       | Container で代用可能。将来追加の可能性あり |

### Layout / Container

| Component    | Status      | Confirmed | Notes                                  |
| ------------ | ----------- | --------- | -------------------------------------- |
| Card         | Implemented | [ ]       |                                        |
| Accordion    | Implemented | [ ]       |                                        |
| Collapsible  | Implemented | [ ]       |                                        |
| Tabs         | Implemented | [ ]       |                                        |
| Resizable    | Implemented | [ ]       |                                        |
| Scroll Area  | Implemented | [ ]       |                                        |
| Aspect Ratio | Implemented | [ ]       |                                        |
| Separator    | Implemented | [ ]       |                                        |
| Sidebar      | TBD         | [ ]       |                                        |
| Item         | TBD         | [ ]       | Container で代用可能かも。すみわけ不明 |

### Data Display

| Component  | Status      | Confirmed | Notes                                                        |
| ---------- | ----------- | --------- | ------------------------------------------------------------ |
| Table      | Implemented | [ ]       |                                                              |
| Data Table | TBD         | [ ]       | Table の高機能版（ソート・フィルタ等）                       |
| Badge      | Implemented | [ ]       |                                                              |
| Avatar     | Implemented | [ ]       |                                                              |
| Calendar   | Implemented | [ ]       |                                                              |
| Carousel   | Implemented | [ ]       |                                                              |
| Chart      | Implemented | [ ]       |                                                              |
| Progress   | Implemented | [ ]       |                                                              |
| Skeleton   | Implemented | [ ]       |                                                              |
| Typography | TBD         | [ ]       | 実装方法を要相談                                             |
| Kbd        | TBD         | [ ]       | 実装は簡単。入れてもよい                                     |
| Empty      | TBD         | [ ]       | 空状態表示（データなし・検索結果0件時のアイコン+メッセージ） |
| Spinner    | TBD         | [ ]       |                                                              |

### Overlay / Feedback

| Component     | Status      | Confirmed | Notes                                      |
| ------------- | ----------- | --------- | ------------------------------------------ |
| Dialog        | Implemented | [x]       |                                            |
| Alert Dialog  | Implemented | [x]       |                                            |
| Alert         | Implemented | [x]       | Lucide アイコン選択対応済み                |
| Sheet         | Implemented | [x]       |                                            |
| Drawer        | Implemented | [x]       |                                            |
| Dropdown Menu | Implemented | [ ]       |                                            |
| Context Menu  | Implemented | [ ]       |                                            |
| Popover       | Implemented | [x]       |                                            |
| Hover Card    | Implemented | [ ]       |                                            |
| Tooltip       | Implemented | [x]       |                                            |
| Command       | Implemented | [ ]       |                                            |
| Sonner        | Implemented | [x]       | Toast の後継。ボタン等のイベントとして付与 |
| Toast         | Not Planned | [x]       | Sonner で代替済み                          |

### Navigation

| Component       | Status      | Confirmed | Notes |
| --------------- | ----------- | --------- | ----- |
| Navigation Menu | Implemented | [ ]       |       |
| Menubar         | Implemented | [ ]       |       |
| Breadcrumb      | Implemented | [ ]       |       |
| Pagination      | Implemented | [ ]       |       |

### Composite (複数コンポーネントの組み合わせ)

| Component   | Status  | Confirmed | Notes                     |
| ----------- | ------- | --------- | ------------------------- |
| Date Picker | Planned | [ ]       | Calendar + Popover で構成 |

### Utility

| Component | Status      | Confirmed | Notes                |
| --------- | ----------- | --------- | -------------------- |
| Direction | Not Planned | [x]       | RTL/LTR 制御。後回し |

## Summary

- **Implemented**: 44
- **Planned**: 3 (Native Select, Combobox, Date Picker)
- **TBD**: 8 (Button Group, Input Group, Input OTP, Sidebar, Data Table, Typography, Kbd, Empty, Spinner, Item)
- **Not Planned**: 3 (Toast, Field, Direction)
