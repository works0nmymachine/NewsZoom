// Slaat feeditems op: nieuw invoegen, bekend en ongewijzigd overslaan, gewijzigde titel of samenvatting bijwerken.
export async function slaItemsOp(db, bron, items) {
  let nieuw = 0;
  for (const i of items) {
    const res = await db.query(
      `INSERT INTO nz_feeditems (bron, guid, url, titel, samenvatting, gepubliceerd)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (bron, guid) DO UPDATE SET titel = EXCLUDED.titel, samenvatting = EXCLUDED.samenvatting,
         url = EXCLUDED.url, gewijzigd_at = now()
       WHERE nz_feeditems.titel IS DISTINCT FROM EXCLUDED.titel OR nz_feeditems.samenvatting IS DISTINCT FROM EXCLUDED.samenvatting
       RETURNING (xmax = 0) AS ingevoegd`,
      [bron, i.guid.slice(0, 500), i.url.slice(0, 1000), i.titel, i.samenvatting, i.gepubliceerd],
    );
    if (res.rows[0]?.ingevoegd) nieuw++;
  }
  return nieuw;
}
