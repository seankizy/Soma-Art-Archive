import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-haiku-4-5-20251001";

// The client sends a compact index of the archive + a question. Claude returns
// the matching work ids and a short prose answer. For a personal archive (up to a
// few thousand works) the whole index fits comfortably; beyond that, prefilter with
// full-text search first or move to embeddings (pgvector + Voyage).
export async function POST(req: Request) {
  try {
    const { question, index } = await req.json();
    if (!question || !index?.length) return NextResponse.json({ answer: "", ids: [] });

    const prompt = `You are the search brain of a collector's personal art archive.
Here is the full index (JSON): each entry has id, title, artist, year, medium, tags, location, note.
${JSON.stringify(index)}

The collector asks: "${question}"

Pick the entries that best answer the question and write a brief, helpful reply.
Return ONLY this JSON (no markdown): { "answer": "<2-4 sentences>", "ids": ["<id>", ...] }
Order ids by relevance. If nothing fits, return an empty ids array and say so in answer.`;

    const msg = await anthropic.messages.create({
      model: MODEL, max_tokens: 1024, messages: [{ role: "user", content: prompt }],
    });
    const text = msg.content.filter((b) => b.type === "text").map((b: any) => b.text).join("")
      .replace(/```json|```/g, "").trim();
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = { answer: text, ids: [] }; }
    return NextResponse.json({ answer: parsed.answer ?? "", ids: parsed.ids ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, answer: "", ids: [] }, { status: 500 });
  }
}
