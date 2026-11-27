-- Zelf toegevoegde interesses (Interesse toevoegen / Ik mis iets), met eenvoudige afbakening.
CREATE TABLE nz_interesses (
  id bigserial PRIMARY KEY,
  gebruiker uuid NOT NULL REFERENCES nz_gebruikers ON DELETE CASCADE,
  naam text NOT NULL CHECK (length(naam) BETWEEN 1 AND 100),
  zoektermen text[] NOT NULL DEFAULT '{}',
  uitsluitingen text[] NOT NULL DEFAULT '{}',
  gedempt boolean NOT NULL DEFAULT false,
  aangemaakt_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX nz_interesses_gebruiker ON nz_interesses (gebruiker);
