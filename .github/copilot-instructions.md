# 基本

- 日本語で応答すること
- 必要に応じて、ユーザに質問を行い、要求を明確にすること
- 作業後、作業内容とユーザが次に取れる行動を説明すること
- コマンドの出力が確認できない場合、 get last command / check background terminal を使用して確認すること

## develop

各作業を以下のように定義する。

- 開発は、”要件”の定義から、それを満たす"機能"をリスト化して、機能を実装するための"タスク"に分解することから始める。
- "要件"は、"CONCEPT.md"に記載しているので、参照にする。
- "機能"、"タスク"は、Marakdown形式で、docs/features、docs/taskに保存する。
- 各タスクは、実装に必要なステップに分解し、表や API仕様、DBスキーマ、エンティティ仕様、合格基準などを定義する。
- タスクドキュメントに、コードを直接書かない。(デバッグなどの候補が必要な場合は除く)
- 各ステップのコードは、必要に応じて説明を加える。
- 各ステップのコードは、TDDの原則に従い、テストコードを最初に提供し、その後に実装コードを提供する。
- 最小限のテスト項目と実装コードを提供し、動作確認を行いながら進める。
- 関数は、Arrow Function を原則として使用する。(クラスのメソッド等は除く)
- Typescript による厳密な型チェックを行う。`as any` の仕様は原則として禁止する。
  - どうしても必要な場合は、開発者に問い合わせる。
  - ただし、UTは例外として、型指定がテスト上重要な意味を保つ場合でない場合は、`as any` を使用してもよい。

## components

- Component と、UTのファイルに加え、Storybook も作成する。
- スタイルフレームワークには、Tailwind CSS + daisyUI を使用する。
- Component が複数の責務を持つ場合、サブコンポーネントに分割する。

## git rules

- コミット前に、prettier を使用してコードを整形する。
- コミットメッセージは、日本語で書く。

## use libraries

- 日付の操作には、Day.jsを使用する。
- DBアクセスには、Drizzle ORMを使用する。
- 実装で可読性や保守性、再利用性が向上すると判断した場合、適切なライブラリを提案する。コピーレフトライセンスのライブラリは使用しないこと。

## infrastructure

- クラウドサービスとして、Heroku を使用する。
- DBは、Heroku Postgres を使用する。
- セッション情報の保存には、Heroku Key-Value Store を使用する。

## unit tests

- テストフレームワークは Vitest を使用する。
- `pnpm test:unit` コマンドで実行する。
- component のテストは、 Testing Library for Svelte を使用する。
- テスト対象のファイル名のプレフィックスに `+` がついていても、テストコードのファイルにはつけないこと。
  - Vitest、Svelte の予約語のため。

## documents

- docs/reports/{yyyy-mm-dd HH:MM}-{簡単な内容(英語)}.md : 調査レポート
- docs/features/{yyyy-mm-dd HH:MM}-{簡単な内容(英語)}.md : 機能仕様書
- docs/task/{yyyy-mm-dd HH:MM}-{簡単な内容(英語)}.md : タスク

### コンポーネントの構成規則

プロジェクトルートの `README.md` の同名の項目を参照してください。

## MCPs

### Svelte MCP Server

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

### Available MCP Tools:

#### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

#### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

#### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

#### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.
