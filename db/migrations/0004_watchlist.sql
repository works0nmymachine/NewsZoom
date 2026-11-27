-- Persoonlijke watchlist in Finance.
CREATE TABLE nz_watchlist (
  gebruiker uuid NOT NULL REFERENCES nz_gebruikers ON DELETE CASCADE,
  instrument text NOT NULL CHECK (length(instrument) BETWEEN 1 AND 50),
  aangemaakt_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (gebruiker, instrument)
);
