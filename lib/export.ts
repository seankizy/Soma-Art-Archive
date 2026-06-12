import { jsPDF } from "jspdf";
import { imageUrl } from "./supabase";
import type { Artwork } from "./types";

async function toDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// Generates a visual contact-sheet PDF: image plates with metadata captions,
// laid out like a museum study sheet.
export async function exportVisualPdf(artworks: Artwork[], title = "Soma Archive") {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  const cols = 2;
  const gap = 24;
  const cellW = (pageW - margin * 2 - gap * (cols - 1)) / cols;
  const imgH = cellW * 0.95;
  const capH = 64;
  const cellH = imgH + capH;

  // cover
  doc.setFillColor(244, 239, 230);
  doc.rect(0, 0, pageW, pageH, "F");
  doc.setTextColor(26, 22, 20);
  doc.setFont("times", "normal");
  doc.setFontSize(34);
  doc.text(title, margin, 140);
  doc.setFontSize(11);
  doc.setTextColor(138, 126, 109);
  doc.text(
    `${artworks.length} works · exported ${new Date().toLocaleDateString()}`,
    margin,
    164
  );
  doc.addPage();

  let x = margin, y = margin, count = 0;

  for (const art of artworks) {
    if (count > 0 && count % (cols * 2) === 0) {
      doc.addPage();
      x = margin; y = margin;
    }
    const col = count % cols;
    x = margin + col * (cellW + gap);
    if (col === 0 && count % (cols * 2) !== 0) y += cellH + gap;
    if (count % (cols * 2) === 0) y = margin;

    const url = imageUrl(art.image_path);
    if (url) {
      const data = await toDataUrl(url);
      if (data) {
        try {
          doc.addImage(data, "JPEG", x, y, cellW, imgH, undefined, "FAST");
        } catch { /* skip bad image */ }
      }
    }
    doc.setDrawColor(210, 200, 184);
    doc.rect(x, y, cellW, imgH);

    doc.setTextColor(26, 22, 20);
    doc.setFont("times", "italic");
    doc.setFontSize(12);
    doc.text(doc.splitTextToSize(art.title, cellW), x, y + imgH + 16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(138, 126, 109);
    const meta = [art.artist, art.year, art.medium].filter(Boolean).join(" · ");
    doc.text(doc.splitTextToSize(meta, cellW), x, y + imgH + 32);
    if (art.location)
      doc.text(doc.splitTextToSize(`seen: ${art.location}`, cellW), x, y + imgH + 44);

    count++;
  }

  doc.save(`${title.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}
