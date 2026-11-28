-- Actualiteit en bronnen: afbeelding en categorieën per feedbericht, taal per bron,
-- een logboek per ingest-ronde en het vorige bezoek per gebruiker (voor "Nieuw").
ALTER TABLE nz_feeditems
  ADD COLUMN afbeelding text CHECK (afbeelding IS NULL OR length(afbeelding) <= 1000),
  ADD COLUMN categorieen text[] NOT NULL DEFAULT '{}';

ALTER TABLE nz_feedbronnen
  ADD COLUMN taal text NOT NULL DEFAULT 'nl',
  ADD COLUMN uitgever text,
  ADD COLUMN laatste_aantal integer;

CREATE TABLE nz_ingest_rondes (
  id bigserial PRIMARY KEY,
  gestart_at timestamptz NOT NULL DEFAULT now(),
  klaar_at timestamptz,
  bronnen integer NOT NULL DEFAULT 0,
  gelukt integer NOT NULL DEFAULT 0,
  mislukt integer NOT NULL DEFAULT 0,
  nieuw integer NOT NULL DEFAULT 0,
  fouten jsonb NOT NULL DEFAULT '[]'
);
CREATE INDEX nz_ingest_rondes_gestart ON nz_ingest_rondes (gestart_at DESC);

-- Een bezoek begint na 30 minuten zonder activiteit; vorige_at is het laatste moment van het vorige bezoek.
CREATE TABLE nz_bezoeken (
  gebruiker uuid PRIMARY KEY REFERENCES nz_gebruikers ON DELETE CASCADE,
  vorige_at timestamptz,
  laatste_at timestamptz NOT NULL DEFAULT now()
);

-- Persoonlijke instellingen: gekozen lokaal gebied en of de eerste keuze (onboarding) is gedaan of overgeslagen.
CREATE TABLE nz_instellingen (
  gebruiker uuid PRIMARY KEY REFERENCES nz_gebruikers ON DELETE CASCADE,
  gebied text CHECK (gebied IS NULL OR length(gebied) <= 100),
  start_klaar_at timestamptz
);
