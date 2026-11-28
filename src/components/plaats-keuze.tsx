'use client';

/** Plaatskeuze die het formulier direct verstuurt. Zonder JavaScript blijft de knop ernaast werken. */
export function PlaatsKeuze({ plaatsen, waarde, label = 'Plaats' }: { plaatsen: string[]; waarde: string; label?: string }) {
  return (
    <select name="plaats" defaultValue={waarde} aria-label={label} onChange={(e) => e.currentTarget.form?.requestSubmit()}>
      <option value="Nederland">Heel Nederland</option>
      {plaatsen.map((p) => <option key={p}>{p}</option>)}
    </select>
  );
}
