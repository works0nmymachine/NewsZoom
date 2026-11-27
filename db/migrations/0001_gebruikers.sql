-- Accounts (craftstudio-login), sessies en persoonlijke voorkeuren.
CREATE TABLE nz_gebruikers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supabase_id uuid UNIQUE,
  email text,
  aangemaakt_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE nz_sessies (
  token_hash bytea PRIMARY KEY,
  gebruiker uuid NOT NULL REFERENCES nz_gebruikers ON DELETE CASCADE,
  aangemaakt_at timestamptz NOT NULL DEFAULT now(),
  verloopt_at timestamptz NOT NULL
);
CREATE INDEX nz_sessies_gebruiker ON nz_sessies (gebruiker);

-- Meer hiervan / Minder hiervan / Verbergen, per verhaal, onderwerp of bron.
CREATE TABLE nz_filterregels (
  id bigserial PRIMARY KEY,
  gebruiker uuid NOT NULL REFERENCES nz_gebruikers ON DELETE CASCADE,
  doel_soort text NOT NULL CHECK (doel_soort IN ('verhaal', 'onderwerp', 'bron')),
  doel_id text NOT NULL CHECK (length(doel_id) BETWEEN 1 AND 200),
  actie text NOT NULL CHECK (actie IN ('meer', 'minder', 'verbergen')),
  aangemaakt_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gebruiker, doel_soort, doel_id)
);

-- Bron toevoegen: voorstel van een gebruiker voor een ontbrekende (lokale) bron.
CREATE TABLE nz_bronvoorstellen (
  id bigserial PRIMARY KEY,
  gebruiker uuid NOT NULL REFERENCES nz_gebruikers ON DELETE CASCADE,
  gebied text NOT NULL,
  naam text NOT NULL CHECK (length(naam) BETWEEN 1 AND 200),
  url text CHECK (url IS NULL OR length(url) <= 500),
  toelichting text CHECK (toelichting IS NULL OR length(toelichting) <= 1000),
  aangemaakt_at timestamptz NOT NULL DEFAULT now()
);

-- Laatste leesmoment per verhaal, voor "Sinds je laatste bezoek".
CREATE TABLE nz_leesmomenten (
  gebruiker uuid NOT NULL REFERENCES nz_gebruikers ON DELETE CASCADE,
  verhaal text NOT NULL,
  gelezen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (gebruiker, verhaal)
);
