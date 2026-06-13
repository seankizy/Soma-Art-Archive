import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Sonnet reads name cards more accurately than Haiku — worth the small extra cost.
const MODEL = "claude-sonnet-4-6";

type ImgIn = { id: string; mediaType: string; data: string }; // data = base64, no prefix

export async function POST(req: Request) {
  try {
    const { images } = (await req.json()) as { images: ImgIn[] };
    if (!images?.length) return NextResponse.json({ error: "no images" }, { status: 400 });

    const content: any[] = [];
    images.forEach((img) => {
      content.push({ type: "text", text: `--- IMAGE id="${img.id}" ---` });
      content.push({
        type: "image",
        source: { type: "base64", media_type: img.mediaType, data: img.data },
      });
    });

    content.push({
      type: "text",
      text: `You are sorting a batch of photos a collector took while looking at art.
Each image is either:
- "artwork": a photo of an artwork/object itself
- "card": a photo of a wall label, placard, or name card with text about an artwork
- "other": anything else

For every image, classify it. For each "card", transcribe its text into structured fields.
Then PAIR each card with the artwork image it most likely describes. Use visual and semantic
cues (a card reading "bronze, 1972" pairs with a bronze sculpture photo; cards are usually shot
right before or after their artwork). Give a confidence 0-1 and a short reason.

Return ONLY this JSON (no markdown, no commentary):
{
  "items": [
    { "id": "<image id>", "type": "artwork|card|other",
      "card": { "title": "", "artist": "", "year": "", "medium": "", "dimensions": "" } | null,
      "describe": "<one short phrase describing the image, for matching>" }
  ],
  "pairs": [ { "cardId": "<id>", "artworkId": "<id>", "confidence": 0.0, "reason": "" } ]
}
Leave card fields as "" when not legible. Do not invent text that isn't on the card.`,
    });

    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      messages: [{ role: "user", content }],
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
      return NextResponse.json({ error: "could not parse model output", raw: text }, { status: 502 });
    }
    return NextResponse.json(parsed);
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
