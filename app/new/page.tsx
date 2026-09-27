'use client';
import { useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';

type Draft = {
  title:string;
  location:string;
  component:string;
  finding:string;
  measurement:string;
  material:string;
  description:string;
  urgency:'low'|'medium'|'high';
  recommended_action:string;
};

export default function NewCase() {
  const [file,setFile] = useState<File|null>(null);
  const [location,setLocation] = useState('');
  const [component,setComponent] = useState('');
  const [finding,setFinding] = useState('');
  const [measurement,setMeasurement] = useState('');
  const [material,setMaterial] = useState('');
  const [action,setAction] = useState('');
  const [note,setNote] = useState('');
  const [urgency,setUrgency] = useState<'low'|'medium'|'high'>('medium');
  const [draft,setDraft] = useState<Draft|null>(null);
  const [busy,setBusy] = useState(false);
  const [msg,setMsg] = useState('');
  const preview = useMemo(()=>file ? URL.createObjectURL(file) : '',[file]);

  async function generate(){
    if(!finding.trim() && !note.trim()){
      setMsg('Bitte mindestens einen Befund oder eine Notiz eintragen.');
      return;
    }
    setBusy(true); setMsg('');
    const fd = new FormData();
    fd.append('location',location);
    fd.append('component',component);
    fd.append('finding',finding);
    fd.append('measurement',measurement);
    fd.append('material',material);
    fd.append('action',action);
    fd.append('note',note);
    fd.append('urgency',urgency);
    try{
      const r = await fetch('/api/draft',{method:'POST',body:fd});
      const d = await r.json();
      if(!r.ok) throw new Error(d.error||'Fehler');
      setDraft(d.draft);
      setMsg('Entwurf aus deinen Angaben erstellt – noch NICHT freigegeben.');
    }catch(e){ setMsg(e instanceof Error ? e.message : 'Fehler beim Erstellen.'); }
    finally{ setBusy(false); }
  }

  async function approve(){
    if(!draft) return;
    setBusy(true); setMsg('');
    try{
      const s = supabaseBrowser();
      const {data:{user}} = await s.auth.getUser();
      if(!user) throw new Error('Bitte zuerst anmelden.');
      const {data:caseRow,error:caseErr} = await s.from('cases').insert({
        owner_user_id:user.id,
        created_by:user.id,
        updated_by:user.id,
        status:'approved',
        workflow_type:'repair_report',
        title:draft.title,
        description:draft.description,
        object_name:draft.location,
        component:draft.component,
        internal_note:note,
        priority:draft.urgency==='high'?'high':draft.urgency==='low'?'low':'normal'
      }).select('id').single();
      if(caseErr) throw caseErr;

      let imagePath:string|null = null;
      if(file){
        imagePath = `${user.id}/${caseRow.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
        const up = await s.storage.from('case-media').upload(imagePath,file,{upsert:false,contentType:file.type});
        if(up.error) throw up.error;
        const {error:mediaErr} = await s.from('case_media').insert({
          case_id:caseRow.id,
          media_type:'photo',
          storage_bucket:'case-media',
          storage_path:imagePath,
          file_name:file.name,
          mime_type:file.type||null,
          caption:draft.finding,
          source:'photo_library',
          created_by:user.id
        });
        if(mediaErr) throw mediaErr;
      }

      const approvedAt = new Date().toISOString();
      const {error:reportErr} = await s.from('reports').insert({
        user_id:user.id,
        case_id:caseRow.id,
        workflow_id:'repair_report',
        run_status:'approved',
        title:draft.title,
        report_date:approvedAt.slice(0,10),
        location:draft.location,
        component:draft.component,
        finding:draft.finding,
        measurement:draft.measurement,
        material:draft.material,
        description:draft.description,
        urgency:draft.urgency,
        recommended_action:draft.recommended_action,
        image_path:imagePath,
        note,
        status:'approved',
        approved_at:approvedAt
      });
      if(reportErr) throw reportErr;

      setMsg(`Freigegeben. Fall-ID: ${caseRow.id}`);
      setDraft(null);
      setFile(null);
      setLocation('');
      setComponent('');
      setFinding('');
      setMeasurement('');
      setMaterial('');
      setAction('');
      setNote('');
      setUrgency('medium');
    }catch(e){ setMsg(e instanceof Error ? e.message : 'Freigabe fehlgeschlagen.'); }
    finally{ setBusy(false); }
  }

  return <>
    <div className="top"><div className="brand">Neuer Fall</div><div className="badge">ohne KI-Kosten</div></div>

    <div className="field"><label>Foto</label><div className="upload"><input type="file" accept="image/*" capture="environment" onChange={e=>setFile(e.target.files?.[0]||null)}/>{preview&&<img className="preview" src={preview} alt="Vorschau"/>}</div></div>

    <div className="sectionTitle">Fachliche Angaben</div>
    <div className="field"><label>Ort</label><input className="input" placeholder="z. B. Küche, Baustelle A, Wohnung 3" value={location} onChange={e=>setLocation(e.target.value)}/></div>
    <div className="field"><label>Bauteil</label><input className="input" placeholder="z. B. Tür, Leitung, Wand, Ordner" value={component} onChange={e=>setComponent(e.target.value)}/></div>
    <div className="field"><label>Befund</label><textarea className="textarea" placeholder="Was wurde festgestellt?" value={finding} onChange={e=>setFinding(e.target.value)}/></div>
    <div className="field"><label>Maß / Menge</label><input className="input" placeholder="z. B. 1,20 m × 0,80 m / 3 Stück" value={measurement} onChange={e=>setMeasurement(e.target.value)}/></div>
    <div className="field"><label>Material</label><input className="input" placeholder="z. B. Holz, PVC, Kupfer, noch unbekannt" value={material} onChange={e=>setMaterial(e.target.value)}/></div>
    <div className="field"><label>Maßnahme</label><textarea className="textarea" placeholder="Was soll als Nächstes passieren?" value={action} onChange={e=>setAction(e.target.value)}/></div>
    <div className="field"><label>Dringlichkeit</label><select className="select" value={urgency} onChange={e=>setUrgency(e.target.value as 'low'|'medium'|'high')}><option value="low">niedrig</option><option value="medium">mittel</option><option value="high">hoch</option></select></div>
    <div className="field"><label>Zusätzliche Notiz</label><textarea className="textarea" placeholder="Optional: weitere Beobachtungen oder Hinweise" value={note} onChange={e=>setNote(e.target.value)}/></div>

    <button className="btn btnPrimary" style={{width:'100%'}} onClick={generate} disabled={busy}>{busy?'Bitte…':'Berichtsentwurf erzeugen'}</button>
    {msg&&<div className="status warn">{msg}</div>}

    {draft&&<>
      <div className="sectionTitle">Entwurf bearbeiten</div>
      <div className="report">
        <div className="field"><label>Titel</label><input className="input" value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/></div>
        <div className="field"><label>Ort</label><input className="input" value={draft.location} onChange={e=>setDraft({...draft,location:e.target.value})}/></div>
        <div className="field"><label>Bauteil</label><input className="input" value={draft.component} onChange={e=>setDraft({...draft,component:e.target.value})}/></div>
        <div className="field"><label>Befund</label><textarea className="textarea" value={draft.finding} onChange={e=>setDraft({...draft,finding:e.target.value})}/></div>
        <div className="field"><label>Maß / Menge</label><input className="input" value={draft.measurement} onChange={e=>setDraft({...draft,measurement:e.target.value})}/></div>
        <div className="field"><label>Material</label><input className="input" value={draft.material} onChange={e=>setDraft({...draft,material:e.target.value})}/></div>
        <div className="field"><label>Beschreibung</label><textarea className="textarea" value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})}/></div>
        <div className="field"><label>Dringlichkeit</label><select className="select" value={draft.urgency} onChange={e=>setDraft({...draft,urgency:e.target.value as Draft['urgency']})}><option value="low">niedrig</option><option value="medium">mittel</option><option value="high">hoch</option></select></div>
        <div className="field"><label>Maßnahme / nächster Schritt</label><textarea className="textarea" value={draft.recommended_action} onChange={e=>setDraft({...draft,recommended_action:e.target.value})}/></div>
        <div className="status warn"><strong>Noch nicht freigegeben.</strong> Mila strukturiert nur deine Angaben. Erst dein Klick speichert sie als freigegebenen Bericht.</div>
        <div className="actions"><button className="btn btnSecondary" onClick={()=>setDraft(null)} disabled={busy}>Verwerfen</button><button className="btn btnPrimary" onClick={approve} disabled={busy}>Ausdrücklich freigeben</button></div>
      </div>
    </>}
  </>;
}
