```
▄▄▄      ▄▄▄                            
████▄  ▄████                            
███▀████▀███ ▄███▄ ███▄███▄ ▄███▄ ▄████ 
███  ▀▀  ███ ██ ██ ██ ██ ██ ██ ██ ██    
███      ███ ▀███▀ ██ ██ ██ ▀███▀ ▀████ 
```
![app_icon](./resources/icons/icon_128.png)


# Momoc
Visual Web UI Builder for VSCode  
  
[English](#momocenglish)

## 概要
- このアプリケーションはVSCode上でGUI操作でWebのモック画面を作成する拡張機能です
- Webで実現可能な範囲のデザインを簡易的に作成し、ユーザー(顧客等)との合意形成を行うためのツールです

## ユースケース
- 会議中にイメージを作成(変更)し、ユーザーへイメージ伝達し合意形成を得る
- コンポーネント単位で画面設計を行い統合したものを仕様書へ反映する
- このアプリで作成したデータ(.moc形式)をAIに添付し本番環境への実装を行う

など

## 機能
**主な機能**
- shadcn/ui風のコンポーネントを配置しWebUIのデザイン
- コンポーネント作成モードで絶対座標配置でのコンポーネント作成
- ポップオーバー、ダイアログなどで表示する小画面等の作成、イメージ確認
- Webプレビューによる実際のブラウザでの見た目確認、簡易的な動作確認

**UIコンポーネント配置イメージ**
![SetCompornents_Demo](./doc/demo_image/Momoc_Demo_SetCompornents.gif)


**メモ(付箋)配置イメージ**
![SetMemos_Demo](./doc/demo_image/Momoc_Demo_SetMemos.gif)

<br />

**ファイル仕様**
- [.mocファイル仕様](https://github.com/Mui-MuiMui/moc-spec) (Momocの開発に合わせて変更する可能性があります。)
- [ファイル仕様の概念(思想)](https://github.com/Mui-MuiMui/AINDF) (.mocの元となる考え方、思想です。)

AIネイティブなデータ形式を採用しています。<br/>
そのため、説明なくファイルの状態をAIは理解することができます。<br/>
また、付箋などに記載された意図を読み取ることでAIが実装のする際の手助けをすることができます。<br/>

**対応コンポーネント**

shadcn/ui:
Accordion / Alert / AspectRatio / Avatar / Badge / Breadcrumb / Button /
Calendar / Card / Carousel / Checkbox / Collapsible / Combobox / Command /
ContextMenu / DataTable / DatePicker / DropdownMenu / HoverCard / Input /
Label / Menubar / NavigationMenu / Pagination / Progress / RadioGroup /
Resizable / ScrollArea / Select / Separator / Sidebar / Slider / Switch /
Table / Tabs / Textarea / Toggle / ToggleGroup / Tooltip / Typography

HTML / Layout:
Container / Group / FreeCanvas / Image / PlaceholderImage / Text / Icon



## 始め方

1. 拡張子 `.moc` のファイルを新規作成する
2. VSCode上でそのファイルを開く — Momocエディタが自動起動する
3. パレットからコンポーネントをキャンバスにドラッグして配置する



## 簡易ロードマップ

- [x] MVP作成
- [x] shadcn/uiのコンポーネントを追加(v0.5.6相当)
- [x] プロパティ要素の拡充(作業時:v0.6.xx相当予定)
- [ ] ~~アイコン(SVG)配置機能の追加(作業時:v0.7.xx相当予定だったが既に追加済み)~~
- [ ] UIの整理(作業時:v0.8.xx相当予定)
- [ ] リリース(v1.0.x予定)



---
# Momoc(English)
Visual Web UI Builder for VSCode

[日本語](#momoc)

## Overview
- Momoc is a VSCode extension for creating web mockup screens via GUI on VSCode.
- It is a tool for quickly creating designs within the scope achievable on the web, and building consensus with users (clients, etc.).

## Use Cases
- Create (or modify) mockups during meetings to convey ideas and gain consensus with users.
- Design screens at the component level, integrate them, and reflect the results in specifications.
- Attach data created with this app (.moc format) to AI and implement it in a production environment.

## Features
**Main Features**
- Design Web UIs by placing shadcn/ui-style components
- Create components with absolute positioning in component creation mode
- Create and preview small screens displayed via popovers, dialogs, etc.
- Check actual appearance in the browser via web preview, with basic interaction testing

**UI Component Placement Demo**
![SetCompornents_Demo](./doc/demo_image/Momoc_Demo_SetCompornents.gif)


**Memo (Sticky Note) Placement Demo**
![SetMemos_Demo](./doc/demo_image/Momoc_Demo_SetMemos.gif)

<br />

**File Specification**
- [.moc File Specification](https://github.com/Mui-MuiMui/moc-spec) (Subject to change alongside Momoc development.)
- [Core Philosophy & Concepts](https://github.com/Mui-MuiMui/AINDF) (The underlying philosophy behind the .moc format.)

Momoc uses an AI-native data format.<br/>
This means AI can understand the state of your files without any additional explanation.<br/>
It also allows AI to assist with implementation by reading the intent written on sticky notes and annotations.<br/>

**Supported Components**

shadcn/ui:
Accordion / Alert / AspectRatio / Avatar / Badge / Breadcrumb / Button /
Calendar / Card / Carousel / Checkbox / Collapsible / Combobox / Command /
ContextMenu / DataTable / DatePicker / DropdownMenu / HoverCard / Input /
Label / Menubar / NavigationMenu / Pagination / Progress / RadioGroup /
Resizable / ScrollArea / Select / Separator / Sidebar / Slider / Switch /
Table / Tabs / Textarea / Toggle / ToggleGroup / Tooltip / Typography

HTML / Layout:
Container / Group / FreeCanvas / Image / PlaceholderImage / Text / Icon



## Getting Started

1. Create a new file with the `.moc` extension
2. Open the file in VSCode — the Momoc editor launches automatically
3. Drag components from the palette onto the canvas



## Roadmap

- [x] Build MVP
- [x] Add shadcn/ui components (around v0.5.6)
- [x] Expand property options (expected around v0.6.xx)
- [ ] ~~Add icon (SVG) placement feature (was expected around v0.7.xx, but already added)~~
- [ ] UI/UX polish (expected around v0.8.xx)
- [ ] Release (v1.0.x planned)