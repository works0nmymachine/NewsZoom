'use client';

import { useEffect, useRef } from 'react';

/** Zoekveld dat focus krijgt als je via het zoekicoon komt (?zoek=1). */
export function Zoekveld({ waarde, focus }: { waarde: string; focus: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!focus) return;
    // Na de navigatie zet Next.js de focus zelf; daarna pas het zoekveld.
    const t = setTimeout(() => ref.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [focus]);
  return <input ref={ref} type="search" name="q" defaultValue={waarde} placeholder="Zoek in alle berichten" aria-label="Zoeken" enterKeyHint="search" maxLength={100} />;
}
