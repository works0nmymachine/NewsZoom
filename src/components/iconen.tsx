// Kleine eigen set lijniconen (24×24, currentColor). Bruikbaar in server- en clientcomponenten.
const PADEN = {
  vandaag: <><path d="M4 5h13v14H6a2 2 0 0 1-2-2z" /><path d="M17 8h3v9a2 2 0 0 1-2 2" /><path d="M7 9h7M7 13h7M7 17h4" /></>,
  ster: <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />,
  kompas: <><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-5 2 2-5z" /></>,
  grafiek: <><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></>,
  kalender: <><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  meer: <><circle cx="6" cy="12" r="1.6" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" /><circle cx="18" cy="12" r="1.6" fill="currentColor" stroke="none" /></>,
  terug: <path d="M15 5l-7 7 7 7" />,
  verder: <path d="M9 5l7 7-7 7" />,
  extern: <><path d="M7 17L17 7" /><path d="M9 7h8v8" /></>,
  zoek: <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></>,
  filter: <><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></>,
  sluiten: <path d="M6 6l12 12M18 6L6 18" />,
  vernieuwen: <><path d="M20 11a8 8 0 1 0-2.3 5.7" /><path d="M20 5v6h-6" /></>,
  omhoog: <path d="M12 19V5M6 11l6-6 6 6" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  instellingen: <><circle cx="12" cy="12" r="3.2" /><path d="M12 2.5v3M12 18.5v3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M2.5 12h3M18.5 12h3M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1" /></>,
  uitloggen: <><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 8l-4 4 4 4M6 12h10" /></>,
  bronnen: <><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1.2" /><circle cx="4.5" cy="12" r="1.2" /><circle cx="4.5" cy="18" r="1.2" /></>,
  verbergen: <><path d="M3 3l18 18" /><path d="M10.6 6.1A9.8 9.8 0 0 1 12 6c5 0 9 6 9 6a15.5 15.5 0 0 1-3 3.4M6.5 7.5C4.3 9 3 12 3 12s4 6 9 6a8.6 8.6 0 0 0 3.5-.7" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  min: <path d="M5 12h14" />,
  laag: <><path d="M12 4l9 5-9 5-9-5z" /><path d="M3 14l9 5 9-5" /></>,
} as const;

export type IcoonNaam = keyof typeof PADEN;

export function Icoon({ naam, grootte = 20, className }: { naam: IcoonNaam; grootte?: number; className?: string }) {
  return (
    <svg className={className ? `icoon ${className}` : 'icoon'} width={grootte} height={grootte} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {PADEN[naam]}
    </svg>
  );
}
