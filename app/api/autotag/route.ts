import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-haiku-4-5-20251001";

// Suggests tags from the artwork image (+ any known metadata).
export async function POST(req: Request) {
  try {
    const { mediaType, data, title, medium } = await req.json();
    const content: any[] = [];
    if (data) {
      content.push({ type: "image", source: { type: "base64", media_type: mediaType, data } });
    }
    content.push({
      type: "text",
      text: `Suggest 4-7 short, lowercase tags for this artwork for a personal archive.
Mix categories: medium (e.g. "bronze", "marble"), subject ("figurative", "ornament"),
form ("relief", "sculpture"), and mood/style where clear. Single or two-word tags only.
${title ? `Title: ${title}. ` : ""}${medium ? `Medium: ${medium}. ` : ""}
Return ONLY a JSON array of strings, nothing else. Example: ["marble","figurative","relief"]`,
    });

    const msg = await anthropic.messages.create({
      model: MODEL, max_tokens: 256, messages: [{ role: "user", content }],
    });
    const text = msg.content.filter((b) => b.type === "text").map((b: any) => b.text).join("")
      .replace(/```json|```/g, "").trim();
    let tags: string[] = [];
    try { tags = JSON.parse(text); } catch { tags = []; }
    return NextResponse.json({ tags: Array.isArray(tags) ? tags.slice(0, 8) : [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, tags: [] }, { status: 500 });
  }
}
