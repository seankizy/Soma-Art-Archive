"use client";
import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { imageUrl } from "@/lib/supabase";
import type { Artwork } from "@/lib/types";

const ACCENTS = ["#ec5a2a", "#1f9488", "#eaa11f", "#a8408f"];
function accentFor(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return ACCENTS[h % ACCENTS.length];
}

export default function ArtworkCard({
  art,
  draggable = false,
}: {
  art: Artwork;
  draggable?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: art.id, disabled: !draggable });

  const url = imageUrl(art.image_path);

  const inner = (
    <div className="group card-hover bg-parchment border hairline rounded-sm overflow-hidden">
      <div className="aspect-[4/5] bg-parchmentDk overflow-hidden">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={art.title}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center label">
            no image
          </div>
        )}
      </div>
      <div className="p-3 space-y-1">
        <div className="font-display text-lg leading-tight">{art.title}</div>
        <div className="text-sm text-faded">
          {art.artist || "Unknown"}{art.year ? `, ${art.year}` : ""}
        </div>
        {art.medium && <div className="label">{art.medium}</div>}
        {art.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {art.tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="text-[0.6rem] px-1.5 py-0.5 rounded-full font-semibold"
                style={{ backgroundColor: accentFor(t) + "22", color: accentFor(t) }}
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (draggable) {
    return (
      <div
        ref={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        {inner}
      </div>
    );
  }

  return <Link href={`/artwork/${art.id}`}>{inner}</Link>;
}
