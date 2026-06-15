// 評価スクリプト：決まった質問で、検索と回答の正しさを測る
import fs from "node:fs";
import path from "node:path";
import ollama from "ollama";

const EMBED_MODEL = "bge-m3";
const CHAT_MODEL = "gemma3:4b";
const TOP_K = 3;

const records = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "index.json"), "utf-8")
);

function cosineSimilarity(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

async function retrieve(question) {
  const res = await ollama.embed({ model: EMBED_MODEL, input: question });
  const qVec = res.embeddings[0];
  return records
    .map((r) => ({ ...r, score: cosineSimilarity(qVec, r.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K);
}

// 検索の評価：期待する文書（フォルダ名）が上位に出るか
const retrievalCases = [
  { question: "クロージャとは何ですか", expect: "closures" },
  { question: "配列をループする方法", expect: "loops_and_iteration" },
  { question: "関数の宣言の仕方", expect: "functions" },
  { question: "クロージャでスコープにアクセスする", expect: "closures" },
];

// 回答の評価：参考に無い質問は「見つかりませんでした」と答えるか
const refusalCases = [
  "今日の東京の天気は？",
  "あなたの好きな食べ物は？",
];

async function main() {
  let pass = 0, total = 0;

  console.log("=== 検索の評価（期待する文書が上位に出るか）===");
  for (const c of retrievalCases) {
    total++;
    const top = await retrieve(c.question);
    const hit = top.some((r) => r.file.includes(c.expect));
    if (hit) pass++;
    console.log(`${hit ? "OK " : "NG "} 「${c.question}」→ 期待: ${c.expect}`);
  }

  console.log("\n=== 回答の評価（参考に無い質問を断れるか）===");
  for (const q of refusalCases) {
    total++;
    const top = await retrieve(q);
    const context = top.map((r, i) => `【参考${i + 1}】\n${r.text}`).join("\n\n");
    const prompt = `あなたは、与えられた参考文書だけを根拠に日本語で答えるアシスタントです。
参考文書に書かれていないことは答えず、その場合は「参考文書には情報が見つかりませんでした」と述べてください。

# 参考文書
${context}

# 質問
${q}`;
    const ans = await ollama.chat({
      model: CHAT_MODEL,
      messages: [{ role: "user", content: prompt }],
    });
    const refused = ans.message.content.includes("見つかりませんでした");
    if (refused) pass++;
    console.log(`${refused ? "OK " : "NG "} 「${q}」→ 断れた: ${refused}`);
  }

  console.log(`\n=== 結果: ${pass}/${total} 合格 ===`);
}

main();