-- Bronnen die gebruikers zelf toevoegen of pauzeren.
ALTER TABLE nz_feedbronnen
  ADD COLUMN herkomst text NOT NULL DEFAULT 'bestand' CHECK (herkomst IN ('bestand', 'gebruiker')),
  ADD COLUMN gepauzeerd boolean NOT NULL DEFAULT false,
  ADD COLUMN toegevoegd_door uuid REFERENCES nz_gebruikers ON DELETE SET NULL,
  ADD COLUMN aangemaakt_at timestamptz NOT NULL DEFAULT now();

-- Instellingen voor de hele app (provider, model, budget). nz_instellingen is per gebruiker.
CREATE TABLE nz_app_instellingen (
  sleutel text PRIMARY KEY,
  waarde jsonb NOT NULL,
  gewijzigd_at timestamptz NOT NULL DEFAULT now()
);

-- Tokenteller: één rij per aanroep van een taalmodel. Eerst een reservering, daarna de echte kosten.
CREATE TABLE nz_llm_gebruik (
  id bigserial PRIMARY KEY,
  maand text NOT NULL,                       -- YYYY-MM, Europe/Amsterdam
  moment timestamptz NOT NULL DEFAULT now(),
  doel text NOT NULL,                        -- bv. 'achtergrond:verhaal:nl-asml-match-act'
  provider text NOT NULL,
  model text NOT NULL,
  status text NOT NULL DEFAULT 'bezig' CHECK (status IN ('bezig', 'klaar', 'mislukt')),
  geschat_usd numeric NOT NULL,
  kosten_usd numeric,
  invoer_tokens integer NOT NULL DEFAULT 0,
  cache_lees_tokens integer NOT NULL DEFAULT 0,
  cache_schrijf_tokens integer NOT NULL DEFAULT 0,
  uitvoer_tokens integer NOT NULL DEFAULT 0,
  zoekopdrachten integer NOT NULL DEFAULT 0,
  fout text
);
CREATE INDEX nz_llm_gebruik_maand ON nz_llm_gebruik (maand);

-- Automatisch samengestelde achtergrond per verhaal of bericht, met wachtrij-status.
CREATE TABLE nz_achtergronden (
  sleutel text PRIMARY KEY,                  -- 'verhaal:<id>' of 'bericht:<id>'
  status text NOT NULL CHECK (status IN ('wachtend', 'bezig', 'klaar', 'mislukt')),
  invoer jsonb NOT NULL,
  inhoud jsonb,
  provider text,
  model text,
  kosten_usd numeric,
  fout text,
  aangevraagd_door uuid REFERENCES nz_gebruikers ON DELETE SET NULL,
  aangevraagd_at timestamptz NOT NULL DEFAULT now(),
  gestart_at timestamptz,
  klaar_at timestamptz
);
CREATE INDEX nz_achtergronden_wachtrij ON nz_achtergronden (status, aangevraagd_at);
