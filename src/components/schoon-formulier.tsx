'use client';

/** GET-formulier dat lege velden weglaat, zodat de adresbalk alleen echte filters bevat. */
export function SchoonFormulier({ action, children }: { action: string; children: React.ReactNode }) {
  return (
    <form action={action} onSubmit={(e) => {
      for (const el of Array.from(e.currentTarget.elements)) {
        if ((el instanceof HTMLInputElement || el instanceof HTMLSelectElement) && el.name && el.value === '') el.disabled = true;
      }
    }}>
      {children}
    </form>
  );
}
