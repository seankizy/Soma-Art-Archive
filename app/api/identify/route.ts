import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Sonnet for better visual recognition of artworks without name cards.
const MODEL = "claude-sonnet-4-6";

// Extend Vercel function timeout to 60s.
export const maxDuration = 60;

type ImgIn = { id: string; mediaType: string; data: string };

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
      text: `You are an expert art historian helping a collector archive artworks they photographed in museums and galleries.

Each image is one of:
- "artwork": a photo of an artwork (painting, sculpture, drawing, print, etc.)
- "card": a photo of a wall label, placard, or name card with text about an artwork
- "other": anything else (people, architecture, etc.)

YOUR TWO TASKS:

TASK 1 — CLASSIFY AND EXTRACT/IDENTIFY:
For each image:
- If it's a "card": transcribe ALL visible text into structured fields. Read carefully — artist names often appear as the FIRST line or in larger text. Transcribe exactly what you see.
- If it's an "artwork": use your art history knowledge to identify it visually. Even without a name card, you can often recognize the artist's style, period, medium, and sometimes the specific work. Provide your best identification — do not leave fields blank if you can make a reasonable identification. Include confidence in your describe field.

TASK 2 — PAIR cards with their artwork photos.
Cards are usually shot immediately before or after the artwork they describe. Use visual similarity (a card saying "oil on canvas, red and black" pairs with a red/black painting) and sequence proximity.

Return ONLY this JSON (no markdown):
{
  "items": [
    {
      "id": "<image id>",
      "type": "artwork|card|other",
      "card": {
        "title": "<exact text from card>",
        "artist": "<exact artist name from card — this is critical, look for it carefully>",
        "year": "<year or date range>",
        "medium": "<medium/technique>",
        "dimensions": "<dimensions if shown>"
      } | null,
      "visual": {
        "title": "<your best identification of this artwork's title>",
        "artist": "<artist name based on style/recognition — e.g. 'Mark Rothko', 'Pablo Picasso'>",
        "year": "<estimated year or period>",
        "medium": "<medium you can see — oil on canvas, bronze, etc.>",
        "confidence": "<high|medium|low>"
      } | null,
      "describe": "<one phrase: subject, style, dominant colors>"
    }
  ],
  "pairs": [
    { "cardId": "<id>", "artworkId": "<id>", "confidence": 0.0, "reason": "<brief>" }
  ]
}

Rules:
- For "card" items: set "card" field with transcribed text, set "visual" to null
- For "artwork" items: set "visual" field with your identification, set "card" to null  
- Artist names on cards often appear prominently — read the ENTIRE label text carefully
- For visual identification: draw on your full art history knowledge. If you recognize the style as Rothko, say "Mark Rothko". If you're unsure, give your best guess with low confidence.
- Never leave "visual" completely empty for an artwork — always attempt identification`,
    });

    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 3000,
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
