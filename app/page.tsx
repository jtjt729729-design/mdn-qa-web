"use client";

import { useState } from "react";

type Source = { file: string; url: string };

export default function Home() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);

  async function ask() {
    if (!question.trim()) return;
    setLoading(true);
    setAnswer("");
    setSources([]);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      setAnswer(data.answer);
      setSources(data.sources);
    } catch {
      setAnswer("エラーが発生しました。Ollamaが起動しているか確認してください。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">MDN JavaScript ガイド Q&A</h1>
      <p className="text-sm text-gray-500 mb-4">
        MDNの日本語「JavaScriptガイド」を根拠に、出典つきで答えます。
      </p>

      <div className="flex gap-2 mb-6">
        <input
          className="flex-1 border rounded px-3 py-2"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="例：クロージャとは何ですか"
          onKeyDown={(e) => { if (e.key === "Enter") ask(); }}
        />
        <button
          className="bg-black text-white rounded px-4 py-2 disabled:opacity-50"
          onClick={ask}
          disabled={loading}
        >
          {loading ? "考え中..." : "質問する"}
        </button>
      </div>

      {answer && (
        <div className="mb-6">
          <h2 className="font-bold mb-2">回答</h2>
          <p className="whitespace-pre-wrap">{answer}</p>
        </div>
      )}

      {sources.length > 0 && (
        <div>
          <h2 className="font-bold mb-2">出典</h2>
          <ul className="list-disc pl-5 text-sm">
            {sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{s.url}</a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}