// Slaat feeditems op: nieuw invoegen, bekend en ongewijzigd overslaan, gewijzigde titel, samenvatting,
// afbeelding of categorieën bijwerken. Gebruikt door de ingest-worker en door Bron toevoegen in de app.
export async function slaItemsOp(db, bron, items) {
  let nieuw = 0;
  for (const i of items) {
    const res = await db.query(
      `INSERT INTO nz_feeditems (bron, guid, url, titel, samenvatting, gepubliceerd, afbeelding, categorieen)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (bron, guid) DO UPDATE SET titel = EXCLUDED.titel, samenvatting = EXCLUDED.samenvatting,
         url = EXCLUDED.url, afbeelding = EXCLUDED.afbeelding, categorieen = EXCLUDED.categorieen, gewijzigd_at = now()
       WHERE nz_feeditems.titel IS DISTINCT FROM EXCLUDED.titel OR nz_feeditems.samenvatting IS DISTINCT FROM EXCLUDED.samenvatting
         OR nz_feeditems.afbeelding IS DISTINCT FROM EXCLUDED.afbeelding OR nz_feeditems.categorieen IS DISTINCT FROM EXCLUDED.categorieen
       RETURNING (xmax = 0) AS ingevoegd`,
      [bron, i.guid.slice(0, 500), i.url.slice(0, 1000), i.titel, i.samenvatting, i.gepubliceerd, i.afbeelding ?? null, i.categorieen ?? []],
    );
    if (res.rows[0]?.ingevoegd) nieuw++;
  }
  return nieuw;
}
