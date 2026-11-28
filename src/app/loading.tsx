export default function Laden() {
  return (
    <main className="pagina laden" aria-busy="true">
      <div className="laden-balk" />
      <span className="sr-only" role="status">Laden…</span>
      {[0, 1, 2].map((n) => <div key={n} className="kaart kaart-laden" aria-hidden="true"><div /><div /><div /></div>)}
    </main>
  );
}
