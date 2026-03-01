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
| Combobox      | Implemented | [x]       | Command ベースで構成                       |
| Switch        | Implemented | [x]       |                                            |
| Slider        | Implemented | [x]       | 横スライダーのみ他は要件等                 |
| Toggle        | Implemented | [x]       |                                            |
| Toggle Group  | Implemented | [x]       |                                            |
| Form          | Implemented | [x]       |                                            |
| Field         | Not Planned | [x]       | Container で代用可能。将来追加の可能性あり |

### Layout / Container

| Component    | Status      | Confirmed | Notes                                  |
| ------------ | ----------- | --------- | -------------------------------------- |
| Card         | Implemented | [x]       |                                        |
| Accordion    | Implemented | [x]       |                                        |
| Collapsible  | Implemented | [x]       |                                        |
| Tabs         | Implemented | [x]       |                                        |
| Resizable    | Implemented | [x]       |                                        |
| Scroll Area  | Implemented | [x]       |                                        |
| Aspect Ratio | Implemented | [x]       |                                        |
| Separator    | Implemented | [x]       |                                        |
| Sidebar      | TBD         | [ ]       |                                        |
| Item         | TBD         | [ ]       | Container で代用可能かも。すみわけ不明 |

### Data Display

| Component   | Status      | Confirmed | Notes                                                        |
| ----------- | ----------- | --------- | ------------------------------------------------------------ |
| Table       | Implemented | [x]       |                                                              |
| Data Table  | Planned     | [ ]       | Table の高機能版（ソート・フィルタ等）                       |
| Badge       | Implemented | [x]       |                                                              |
| Avatar      | Implemented | [x]       |                                                              |
| Calendar    | Implemented | [x]       |                                                              |
| Date Picker | Implemented | [x]       |                                                              |
| Carousel    | Implemented | [ ]       |                                                              |
| Chart       | Implemented | [ ]       |                                                              |
| Progress    | Implemented | [ ]       |                                                              |
| Skeleton    | Implemented | [ ]       |                                                              |
| Typography  | TBD         | [ ]       | 実装方法を要相談                                             |
| Kbd         | TBD         | [ ]       | 実装は簡単。入れてもよい                                     |
| Empty       | TBD         | [ ]       | 空状態表示（データなし・検索結果0件時のアイコン+メッセージ） |
| Spinner     | TBD         | [ ]       |                                                              |

### Overlay / Feedback

| Component     | Status      | Confirmed | Notes                                                           |
| ------------- | ----------- | --------- | --------------------------------------------------------------- |
| Dialog        | Implemented | [x]       |                                                                 |
| Alert Dialog  | Implemented | [x]       |                                                                 |
| Alert         | Implemented | [x]       | Lucide アイコン選択対応済み                                     |
| Sheet         | Implemented | [x]       |                                                                 |
| Drawer        | Implemented | [x]       |                                                                 |
| Dropdown Menu | Implemented | [ ]       |                                                                 |
| Context Menu  | Implemented | [x]       | menuData JSON ベース。contextMenuMocPath でコンテナに紐づけ可能 |
| Popover       | Implemented | [x]       |                                                                 |
| Hover Card    | Implemented | [ ]       |                                                                 |
| Tooltip       | Implemented | [x]       |                                                                 |
| Command       | Implemented | [ ]       |                                                                 |
| Sonner        | Implemented | [x]       | Toast の後継。ボタン等のイベントとして付与                      |
| Toast         | Not Planned | [x]       | Sonner で代替済み                                               |

### Navigation

| Component       | Status      | Confirmed | Notes |
| --------------- | ----------- | --------- | ----- |
| Navigation Menu | Implemented | [x]       |       |
| Menubar         | Implemented | [x]       |       |
| Breadcrumb      | Implemented | [ ]       |       |
| Pagination      | Implemented | [x]       |       |


### Utility

| Component   | Status      | Confirmed | Notes                                           |
| ----------- | ----------- | --------- | ----------------------------------------------- |
| Direction   | Not Planned | [ ]       | RTL/LTR 制御。後回し                            |
| ContextMenu | Not Planned | [ ]       | Overlay/Feedback の Context Menu として実装済み |

## Summary

- **Confirmed**: 41
- **Implemented**: 46
- **Planned**: 1 (Date Picker)
- **TBD**: 9 (Button Group, Input Group, Input OTP, Sidebar, Typography, Kbd, Empty, Spinner, Item)
- **Not Planned**: 5 (Toast, Field, Direction, Native Select, ContextMenu in Utility)
