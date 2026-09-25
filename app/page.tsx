import Link from 'next/link';

export default function Home() {
  return (
    <>
      <div className="top">
        <div className="brand">Mila Mobile</div>
        <div className="badge">MVP</div>
      </div>
      <section className="hero">
        <div style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 700 }}>DER FALL IST DAS ZENTRUM</div>
        <h1>Dokumentieren, prüfen, freigeben.</h1>
        <p>Foto und Notiz rein. Mila erstellt ausschließlich einen Berichtsentwurf. Du bearbeitest ihn und gibst ihn ausdrücklich frei.</p>
      </section>
      <div className="sectionTitle">Direkt starten</div>
      <div className="grid">
        <Link href="/new" className="card"><strong>📷 Neuen Fall dokumentieren</strong><span>Foto aufnehmen oder auswählen, Notiz ergänzen und Berichtsentwurf erzeugen.</span></Link>
        <Link href="/history" className="card"><strong>🗂 Berichtshistorie</strong><span>Freigegebene Berichte ansehen und PDF erzeugen.</span></Link>
        <Link href="/auth" className="card"><strong>🔐 Anmelden</strong><span>Supabase-Login für deine eigenen Fälle und Berichte.</span></Link>
      </div>
    </>
  );
}
