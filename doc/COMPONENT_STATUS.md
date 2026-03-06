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

| Component     | Status      | Confirmed | Notes                                            |
| ------------- | ----------- | --------- | ------------------------------------------------ |
| Button        | Implemented | [x]       |                                                  |
| Button Group  | Implemented | [x]       | 欲しいが実装方針は未定                           |
| Input         | Implemented | [x]       |                                                  |
| Input Group   | Not Planned | [x]       | コンポーネント登録機能で対応できるので対応しない |
| Input OTP     | TBD         | [ ]       |                                                  |
| Textarea      | Implemented | [x]       |                                                  |
| Label         | Implemented | [x]       |                                                  |
| Checkbox      | Implemented | [x]       |                                                  |
| Radio Group   | Implemented | [x]       |                                                  |
| Select        | Implemented | [x]       |                                                  |
| Native Select | Implemented | [x]       |                                                  |
| Combobox      | Implemented | [x]       | Command ベースで構成                             |
| Switch        | Implemented | [x]       |                                                  |
| Slider        | Implemented | [x]       | 横スライダーのみ他は要件等                       |
| Toggle        | Implemented | [x]       |                                                  |
| Toggle Group  | Implemented | [x]       |                                                  |
| Form          | Implemented | [x]       |                                                  |
| Field         | Not Planned | [x]       | Container で代用可能。将来追加の可能性あり       |

### Layout / Container

| Component    | Status      | Confirmed | Notes                                                                                                                 |
| ------------ | ----------- | --------- | --------------------------------------------------------------------------------------------------------------------- |
| Card         | Implemented | [x]       |                                                                                                                       |
| Accordion    | Implemented | [x]       |                                                                                                                       |
| Collapsible  | Implemented | [x]       |                                                                                                                       |
| Tabs         | Implemented | [x]       |                                                                                                                       |
| Resizable    | Implemented | [x]       |                                                                                                                       |
| Scroll Area  | Implemented | [x]       |                                                                                                                       |
| Aspect Ratio | Implemented | [x]       |                                                                                                                       |
| Separator    | Implemented | [x]       |                                                                                                                       |
| Sidebar      | TBD         | [ ]       |                                                                                                                       |
| Item         | Not Planned | [x]       | Container で代用可能かも。すみわけ不明→多分カード化でもいい気がするし、将来的なコンポーネント化でやった方がよいと判断 |

### Data Display

| Component   | Status      | Confirmed | Notes                                                                                                   |     |
| ----------- | ----------- | --------- | ------------------------------------------------------------------------------------------------------- | --- |
| Table       | Implemented | [x]       |                                                                                                         |     |
| Data Table  | Implemented | [x]       | Table の高機能版（ソート・フィルタ等）                                                                  |     |
| Badge       | Implemented | [x]       |                                                                                                         |     |
| Avatar      | Implemented | [x]       |                                                                                                         |     |
| Calendar    | Implemented | [x]       |                                                                                                         |     |
| Date Picker | Implemented | [x]       |                                                                                                         |     |
| Carousel    | Implemented | [ ]       |                                                                                                         |     |
| Chart       | TBD         | [ ]       | CDNで動かす方法検討中  https://esm.sh/recharts@3.7.0 これかな？                                         |     |
| Progress    | Implemented | [x]       |                                                                                                         |     |
| Skeleton    | Not Planned | [x]       | モックレベルだと使用することがないので実装しない。                                                      |     |
| Typography  | Implemented | [x]       | タグ選択方式を採用                                                                                      |     |
| Kbd         | Implemented | [x]       | 実装は簡単。入れてもよい                                                                                |     |
| Empty       | Not Planned | [x]       | 空状態表示（データなし・検索結果0件時のアイコン+メッセージ）→任意の画面作ればよいと思うのでいったん無し |     |
| Spinner     | Not Planned | [x]       | モックだといらない気がする。要望あれば入れる                                                            |     |

### Overlay / Feedback

| Component     | Status      | Confirmed | Notes                                                           |
| ------------- | ----------- | --------- | --------------------------------------------------------------- |
| Dialog        | Implemented | [x]       |                                                                 |
| Alert Dialog  | Implemented | [x]       |                                                                 |
| Alert         | Implemented | [x]       | Lucide アイコン選択対応済み                                     |
| Sheet         | Implemented | [x]       |                                                                 |
| Drawer        | Implemented | [x]       |                                                                 |
| Dropdown Menu | Implemented | [x]       |                                                                 |
| Context Menu  | Implemented | [x]       | menuData JSON ベース。contextMenuMocPath でコンテナに紐づけ可能 |
| Popover       | Implemented | [x]       |                                                                 |
| Hover Card    | Implemented | [x]       |                                                                 |
| Tooltip       | Implemented | [x]       |                                                                 |
| Command       | Implemented | [x]       |                                                                 |
| Sonner        | Implemented | [x]       | Toast の後継。ボタン等のイベントとして付与                      |
| Toast         | Not Planned | [x]       | Sonner で代替済み                                               |

### Navigation

| Component       | Status      | Confirmed | Notes |
| --------------- | ----------- | --------- | ----- |
| Navigation Menu | Implemented | [x]       |       |
| Menubar         | Implemented | [x]       |       |
| Breadcrumb      | Implemented | [x]       |       |
| Pagination      | Implemented | [x]       |       |


### Utility

| Component | Status      | Confirmed | Notes                |
| --------- | ----------- | --------- | -------------------- |
| Direction | Not Planned | [ ]       | RTL/LTR 制御。後回し |


## Summary

- **Confirmed**: 55
- **Implemented**: 49
- **Planned**: 0
- **TBD**: 3 (chart, Input OTP, Sidebar)
- **Not Planned**: 8 (Toast, Field, Native Select, Direction, ContextMenu in Utility, Input Group, Empty, Spinner, Item)
