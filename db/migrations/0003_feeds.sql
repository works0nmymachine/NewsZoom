-- Bronnen die de ingest-worker ophaalt, hun controlestatus en de opgehaalde berichten.
CREATE TABLE nz_feedbronnen (
  id text PRIMARY KEY,
  naam text NOT NULL,
  homepage text NOT NULL,
  feed_url text NOT NULL,
  soort text NOT NULL,
  reikwijdte text NOT NULL CHECK (reikwijdte IN ('nederland', 'wereld', 'lokaal')),
  gebied text,
  onderwerpen text[] NOT NULL DEFAULT '{}',
  actief boolean NOT NULL DEFAULT true,
  laatste_controle timestamptz,
  laatste_succes timestamptz,
  laatste_fout text,
  etag text,
  last_modified text
);

CREATE TABLE nz_feeditems (
  id bigserial PRIMARY KEY,
  bron text NOT NULL REFERENCES nz_feedbronnen ON DELETE CASCADE,
  guid text NOT NULL,
  url text NOT NULL,
  titel text NOT NULL,
  samenvatting text NOT NULL DEFAULT '',
  gepubliceerd timestamptz NOT NULL,
  opgehaald_at timestamptz NOT NULL DEFAULT now(),
  gewijzigd_at timestamptz,
  UNIQUE (bron, guid)
);
CREATE INDEX nz_feeditems_gepubliceerd ON nz_feeditems (gepubliceerd DESC);

-- Dagelijkse slotkoersen voor Finance.
CREATE TABLE nz_koersen (
  reeks text NOT NULL,
  datum date NOT NULL,
  slot numeric NOT NULL,
  PRIMARY KEY (reeks, datum)
);
CREATE TABLE nz_koersbronnen (
  reeks text PRIMARY KEY,
  bron text NOT NULL,
  laatste_controle timestamptz,
  laatste_fout text
);
