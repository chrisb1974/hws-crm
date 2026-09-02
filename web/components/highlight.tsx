"use client";

import { Fragment } from "react";
import { fold } from "@/lib/property-list";

/**
 * Surligne le terme recherche. Le repliage accents/casse conserve le nombre de
 * points de code, les index retombent donc sur la chaine d'origine.
 */
export default function Highlight({
  text,
  query,
}: {
  text: string | null | undefined;
  query: string;
}) {
  if (!text) return null;
  if (!query) return <>{text}</>;

  const chars = Array.from(text);
  const haystack = Array.from(fold(text));
  const needle = Array.from(query);

  const parts: { value: string; hit: boolean }[] = [];
  let cursor = 0;

  while (cursor < chars.length) {
    let hit = -1;
    for (let index = cursor; index + needle.length <= haystack.length; index += 1) {
      if (needle.every((char, offset) => haystack[index + offset] === char)) {
        hit = index;
        break;
      }
    }
    if (hit === -1) {
      parts.push({ value: chars.slice(cursor).join(""), hit: false });
      break;
    }
    if (hit > cursor) parts.push({ value: chars.slice(cursor, hit).join(""), hit: false });
    parts.push({ value: chars.slice(hit, hit + needle.length).join(""), hit: true });
    cursor = hit + needle.length;
  }

  return (
    <>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {part.hit ? <mark className="surlignage">{part.value}</mark> : part.value}
        </Fragment>
      ))}
    </>
  );
}
