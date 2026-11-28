import { agendaActie } from '@/app/acties';
import { CATEGORIE_ICOON, CATEGORIE_NAAM, type AgendaKeuze } from '@/lib/agenda';
import type { EvenementCategorie } from '@/lib/finance-agenda-types';

/** Categorieën aan/uit als gekleurde chips met pictogram. Uit = gestreept en grijs. */
export function CategorieFilter({ categorieen, keuzes, terug, aantallen }: {
  categorieen: EvenementCategorie[]; keuzes: AgendaKeuze[]; terug: string; aantallen?: Map<string, number>;
}) {
  return (
    <div className="cat-rij">
      {categorieen.map((c) => {
        const uit = keuzes.some((k) => k.doelSoort === 'categorie' && k.doelId === c && k.actie === 'verbergen');
        return (
          <form key={c} action={agendaActie}>
            <input type="hidden" name="soort" value="categorie" />
            <input type="hidden" name="id" value={c} />
            <input type="hidden" name="terug" value={terug} />
            <button className="cat-chip" data-cat={c} name="actie" value={uit ? 'wissen' : 'verbergen'} aria-pressed={!uit}
              title={uit ? `${CATEGORIE_NAAM[c]} weer tonen` : `${CATEGORIE_NAAM[c]} verbergen`}>
              <span className="cat-icoon" aria-hidden="true">{CATEGORIE_ICOON[c]}</span>
              <span className="cat-tekst">{CATEGORIE_NAAM[c]}</span>
              {aantallen?.has(c) && <span className="cat-aantal">{aantallen.get(c)}</span>}
            </button>
          </form>
        );
      })}
    </div>
  );
}

export function CategorieLabel({ c }: { c: EvenementCategorie }) {
  return <span className="cat-naam" data-cat={c}><span aria-hidden="true">{CATEGORIE_ICOON[c]}</span> {CATEGORIE_NAAM[c]}</span>;
}
