import { CATEGORIE_ICOON, CATEGORIE_NAAM, type AgendaKeuze } from '@/lib/agenda';
import type { EvenementCategorie } from '@/lib/finance-agenda-types';
import { CategorieKnop } from './agenda-knoppen';

/** Categorieën aan/uit als gekleurde chips met pictogram. Uit = gestreept en grijs. */
export function CategorieFilter({ categorieen, keuzes, aantallen }: {
  categorieen: EvenementCategorie[]; keuzes: AgendaKeuze[]; aantallen?: Map<string, number>;
}) {
  return (
    <div className="cat-rij">
      {categorieen.map((c) => (
        <CategorieKnop key={c} id={c} naam={CATEGORIE_NAAM[c]} icoon={CATEGORIE_ICOON[c]} aantal={aantallen?.get(c)}
          verborgen={keuzes.some((k) => k.doelSoort === 'categorie' && k.doelId === c && k.actie === 'verbergen')} />
      ))}
    </div>
  );
}

export function CategorieLabel({ c }: { c: EvenementCategorie }) {
  return <span className="cat-naam" data-cat={c}><span aria-hidden="true">{CATEGORIE_ICOON[c]}</span> {CATEGORIE_NAAM[c]}</span>;
}
