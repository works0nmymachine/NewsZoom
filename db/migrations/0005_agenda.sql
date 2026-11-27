-- Agenda: volgen of verbergen per evenement, locatie (podium) of categorie.
CREATE TABLE nz_agendakeuzes (
  gebruiker uuid NOT NULL REFERENCES nz_gebruikers ON DELETE CASCADE,
  doel_soort text NOT NULL CHECK (doel_soort IN ('evenement', 'categorie', 'locatie')),
  doel_id text NOT NULL CHECK (length(doel_id) BETWEEN 1 AND 200),
  actie text NOT NULL CHECK (actie IN ('volgen', 'verbergen')),
  aangemaakt_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (gebruiker, doel_soort, doel_id)
);
