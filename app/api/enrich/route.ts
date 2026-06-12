import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Swap to "claude-opus-4-8" if you want richer (pricier) enrichment.
const MODEL = "claude-haiku-4-5-20251001";

export async function POST(req: Request) {
  try {
    const { title, artist, year, medium, location, notes } = await req.json();

    const prompt = `You are an art research assistant helping a collector annotate a personal archive.
Given the artwork below, return a JSON object ONLY (no markdown, no preamble) with this exact shape:
{
  "description": "2-3 sentence art-historical context: movement, significance, technique, what to notice. Be specific and accurate; if uncertain, say so rather than inventing.",
  "links": [ { "label": "short label", "url": "https://..." } ]
}
Provide 2-4 links to reputable sources (museum collection pages, Wikipedia, foundation/estate sites, scholarly references). Do not fabricate URLs you are unsure of; prefer well-known stable sources.

Artwork:
- Title: ${title || "(unknown)"}
- Artist: ${artist || "(unknown)"}
- Year: ${year || "(unknown)"}
- Medium: ${medium || "(unknown)"}
- Where encountered: ${location || "(unknown)"}
- Collector's notes: ${notes || "(none)"}`;

    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = msg.content
      .filter((b) => b.type === "text")
      .map((b: any) => b.text)
      .join("")
      .replace(/```json|```/g, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { description: text, links: [] };
    }

    return NextResponse.json({
      description: parsed.description ?? "",
      links: Array.isArray(parsed.links) ? parsed.links : [],
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
