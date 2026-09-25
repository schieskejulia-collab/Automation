'use client';
import { FormEvent, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setMsg('');
    try {
      const s = supabaseBrowser();
      const { error } = await s.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setMsg('Angemeldet. Du kannst jetzt Fälle dokumentieren.');
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Anmeldung fehlgeschlagen.'); }
    finally { setBusy(false); }
  }

  async function signup() {
    setBusy(true); setMsg('');
    try {
      const s = supabaseBrowser();
      const { error } = await s.auth.signUp({ email, password });
      if (error) throw error;
      setMsg('Konto erstellt. Falls E-Mail-Bestätigung aktiv ist, bestätige bitte die Mail.');
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Registrierung fehlgeschlagen.'); }
    finally { setBusy(false); }
  }

  return <><div className="top"><div className="brand">Anmelden</div></div><form onSubmit={submit}><div className="field"><label>E-Mail</label><input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></div><div className="field"><label>Passwort</label><input className="input" type="password" minLength={6} value={password} onChange={e=>setPassword(e.target.value)} required/></div>{msg&&<div className="status warn">{msg}</div>}<div className="actions"><button className="btn btnPrimary" disabled={busy}>Anmelden</button><button type="button" className="btn btnSecondary" onClick={signup} disabled={busy}>Registrieren</button></div></form></>;
}
