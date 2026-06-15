import fs from "node:fs";
import path from "node:path";
import ollama from "ollama";

const EMBED_MODEL = "bge-m3";
const CHAT_MODEL = "gemma3:4b";
const TOP_K = 3;

const indexPath = path.join(process.cwd(), "index.json");
const records: { id: number; file: string; text: string; embedding: number[] }[] =
  JSON.parse(fs.readFileSync(indexPath, "utf-8"));

function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ファイルパスから、実際のMDNページのURLを組み立てる
function fileToMdnUrl(file: string): string {
  const parts = file.split(/[\\/]/).filter(Boolean);
  const dataIdx = parts.indexOf("data");
  const segs = parts.slice(dataIdx + 1).filter((p) => p !== "index.md");
  const base = "https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide";
  if (segs.length === 0) return base;
  const slug = segs.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join("/");
  return `${base}/${slug}`;
}

export async function POST(request: Request) {
  const { question } = await request.json();

  const res = await ollama.embed({ model: EMBED_MODEL, input: question });
  const qVec = res.embeddings[0];
  const top = records
    .map((r) => ({ ...r, score: cosineSimilarity(qVec, r.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K);

  const context = top
    .map((r, i) => `【参考${i + 1}】(出典: ${r.file})\n${r.text}`)
    .join("\n\n");

  const prompt = `あなたは、与えられた参考文書だけを根拠に日本語で答えるアシスタントです。
参考文書に書かれていないことは答えず、その場合は「参考文書には情報が見つかりませんでした」と述べてください。
答えるときは、使った参考番号（例：【参考1】）を文中に示してください。

# 参考文書
${context}

# 質問
${question}`;

  const answer = await ollama.chat({
    model: CHAT_MODEL,
    messages: [{ role: "user", content: prompt }],
  });

  // 出典を、重複を除いて { file, url } の形で返す
  const uniqueFiles = [...new Set(top.map((r) => r.file))];
  const sources = uniqueFiles.map((file) => ({ file, url: fileToMdnUrl(file) }));

  return Response.json({ answer: answer.message.content, sources });
}