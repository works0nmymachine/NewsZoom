'use client';

import { useRouter } from 'next/navigation';

/**
 * GET-formulier dat lege velden weglaat, zodat de adresbalk alleen echte filters bevat. Navigeert binnen de app
 * en sluit een omringend paneel. Zonder JavaScript verstuurt de browser het formulier gewoon.
 */
export function SchoonFormulier({ action, children, ...rest }: { action: string; children: React.ReactNode } & React.FormHTMLAttributes<HTMLFormElement>) {
  const router = useRouter();
  return (
    <form {...rest} action={action} onSubmit={(e) => {
      e.preventDefault();
      const zoek = new URLSearchParams();
      for (const [k, v] of new FormData(e.currentTarget)) if (typeof v === 'string' && v.trim() !== '') zoek.append(k, v);
      e.currentTarget.closest('dialog')?.close();
      router.push(zoek.size ? `${action}?${zoek}` : action);
    }}>
      {children}
    </form>
  );
}
