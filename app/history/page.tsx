'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';

type Report = {
  id: string;
  case_id: string | null;
  title: string;
  report_date: string;
  location: string | null;
  component: string | null;
  finding: string | null;
  measurement: string | null;
  material: string | null;
  description: string;
  urgency: string;
  recommended_action: string;
  status: string;
  approved_at: string | null;
};

export default function History() {
  const [rows, setRows] = useState<Report[]>([]);
  const [msg, setMsg] = useState('Lade…');

  useEffect(() => {
    void (async () => {
      try {
        const s = supabaseBrowser();
        const { data: { user } } = await s.auth.getUser();
        if (!user) {
          setMsg('Bitte zuerst anmelden.');
          return;
        }

        const { data, error } = await s
          .from('reports')
          .select('id,case_id,title,report_date,location,component,finding,measurement,material,description,urgency,recommended_action,status,approved_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setRows((data || []) as Report[]);
        setMsg('');
      } catch (e) {
        setMsg(e instanceof Error ? e.message : 'Historie konnte nicht geladen werden.');
      }
    })();
  }, []);

  return <>
    <div className="top"><div className="brand">Historie</div><div className="badge">{rows.length} Berichte</div></div>
    {msg && <div className="status warn">{msg}</div>}
    {!msg && !rows.length && <div className="empty">Noch keine Berichte vorhanden.</div>}

    <div className="grid">
      {rows.map(r => (
        <div className="card" key={r.id}>
          <strong>{r.title}</strong>
          <span>{r.report_date} · {r.location || 'ohne Ort'} · {r.status}</span>
          {r.case_id && <span style={{fontSize:12}}>Fall-ID: {r.case_id}</span>}
          <div style={{height:10}} />
          {r.component && <span><b>Bauteil:</b> {r.component}</span>}
          {r.finding && <span><b>Befund:</b> {r.finding}</span>}
          {r.measurement && <span><b>Maß/Menge:</b> {r.measurement}</span>}
          {r.material && <span><b>Material:</b> {r.material}</span>}
          <span><b>Maßnahme:</b> {r.recommended_action}</span>
          {r.approved_at && <span style={{fontSize:12}}>Freigegeben: {new Date(r.approved_at).toLocaleString('de-DE')}</span>}
          <div style={{height:14}} />
          <a className="btn btnSecondary" style={{display:'inline-block'}} href={`/api/reports/${r.id}/pdf`} target="_blank" rel="noreferrer">PDF öffnen</a>
        </div>
      ))}
    </div>
  </>;
}
