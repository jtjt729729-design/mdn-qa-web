# MDN JavaScript ガイド Q&A（RAG チャットアプリ）

MDN Web Docs の日本語「JavaScript ガイド」を題材に、ユーザーの質問に対して
**出典つきで・根拠のある回答だけを返す** RAG（検索拡張生成）チャットアプリです。
AI（埋め込み・回答生成）をすべてローカルで無料で動かしています。

## デモ
<img width="800" height="776" alt="image" src="https://github.com/user-attachments/assets/1d303151-8480-423d-ab3c-d4536c006145" />


## 特徴
- 質問に意味的に近い文書を検索し、その文書だけを根拠に回答する（RAG）
- 回答の根拠を、実際の MDN ページへのリンクとして表示する
- 参考文書に無いことは答えず「情報が見つかりませんでした」と返す（ハルシネーション抑制）
- 埋め込み・LLM をローカルで実行（API 課金なし・データが外部に出ない）

## 仕組み
1. 起動時に、MDN ドキュメントを分割・ベクトル化した索引（index.json）を読み込む
2. ユーザーの質問をベクトルに変換する（埋め込みモデル）
3. 索引の中から、コサイン類似度が高い文書を上位 N 件取り出す（検索）
4. 取り出した文書だけを根拠に、LLM が日本語で回答を生成する
5. 回答と、根拠にした文書（MDN へのリンク）を表示する

## ハルシネーション対策
LLM へのプロンプトで「与えられた参考文書だけを根拠に答え、書かれていないことは
答えず『情報が見つかりませんでした』と述べる」よう指示しています。さらに回答の
根拠を出典リンクとして必ず提示するため、利用者がその場で正しさを確認できます。

## 技術構成
- フロントエンド / サーバー: Next.js（App Router）, TypeScript
- スタイル: Tailwind CSS
- 埋め込み（検索用）: bge-m3（多言語対応）on Ollama
- 回答生成（LLM）: gemma3:4b on Ollama
- 検索: コサイン類似度による近傍検索（index.json）

## ローカルでの動かし方
前提: Node.js 20.9 以上、Ollama。

1. Ollama を入れ、必要なモデルを取得する
```
   ollama pull bge-m3
   ollama pull gemma3:4b
```
2. 依存パッケージを入れる
```
   npm install
```
3. 開発サーバーを起動する
```
   npm run dev
```
4. ブラウザで http://localhost:3000 を開く（Ollama が起動している必要があります）

## 索引（index.json）について
index.json は、MDN「JavaScript ガイド」の Markdown を分割し、bge-m3 で
ベクトル化して作成したものを同梱しています。

## データの出典とライセンス
本アプリが扱う文書は MDN Web Docs（Mozilla Contributors）による
「JavaScript ガイド」を元にしています。
- 出典: https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide
- ライセンス: CC-BY-SA 2.5 (https://creativecommons.org/licenses/by-sa/2.5/)
## 評価
決まった質問群で「検索の正確さ」と「参考に無い質問を断れるか」を自動で測る
スクリプト（`eval.mjs`）を用意しています。`node eval.mjs` で実行できます。

- 検索の正確さ: 期待する MDN ページが上位に出るか（4 問）
- ハルシネーション対策: 参考文書に無い質問を「見つかりませんでした」と断れるか（2 問）

直近の結果: **6/6 合格**。