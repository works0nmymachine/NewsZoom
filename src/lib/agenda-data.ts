import 'server-only';
import type { AgendaKeuze } from './agenda';
import { pool } from './db';
import type { Agenda } from './finance-agenda-types';
import { leesDataBestand } from './inhoud';

export function agenda(): Agenda {
  return leesDataBestand<Agenda>('agenda.json') ?? { evenementen: [], films: [] };
}

export async function agendaKeuzes(gebruiker: string): Promise<AgendaKeuze[]> {
  const { rows } = await pool().query(`SELECT doel_soort, doel_id, actie FROM nz_agendakeuzes WHERE gebruiker = $1`, [gebruiker]);
  return rows.map((r) => ({ doelSoort: r.doel_soort, doelId: r.doel_id, actie: r.actie }));
}

export const vandaagIso = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam' }).format(new Date());
