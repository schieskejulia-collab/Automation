'use client';
import { useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';

type Draft = { title:string; location:string; description:string; urgency:string; recommended_action:string };

export default function NewCase() {
  const [file,setFile] = useState<File|null>(null);
  const [note,setNote] = useState('');
  const [draft,setDraft] = useState<Draft|null>(null);
  const [busy,setBusy] = useState(false);
  const [msg,setMsg] = useState('');
  const preview = useMemo(()=>file ? URL.createObjectURL(file) : '',[file]);

  async function generate(){
    if(!file && !note.trim()){ setMsg('Bitte mindestens ein Foto oder eine Notiz hinzufügen.'); return; }
    setBusy(true); setMsg('');
    const fd = new FormData();
    if(file) fd.append('image',file);
    fd.append('note',note);
    try{
      const r = await fetch('/api/draft',{method:'POST',body:fd});
      const d = await r.json();
      if(!r.ok) throw new Error(d.error||'Fehler');
      setDraft(d.draft);
      setMsg(d.mode==='ai' ? 'KI-Entwurf erstellt – noch NICHT freigegeben.' : 'Entwurf erstellt – OpenAI ist noch nicht konfiguriert; bitte besonders sorgfältig prüfen.');
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
        owner_user_id:user.id, created_by:user.id, updated_by:user.id, status:'approved', workflow_type:'repair_report',
        title:draft.title, description:draft.description, object_name:draft.location, internal_note:note,
        priority:draft.urgency==='high'?'high':'normal'
      }).select('id').single();
      if(caseErr) throw caseErr;

      let imagePath:string|null = null;
      if(file){
        imagePath = `${user.id}/${caseRow.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
        const up = await s.storage.from('case-media').upload(imagePath,file,{upsert:false,contentType:file.type});
        if(up.error) throw up.error;
        const {error:mediaErr} = await s.from('case_media').insert({
          case_id:caseRow.id, media_type:'photo', storage_bucket:'case-media', storage_path:imagePath,
          file_name:file.name, mime_type:file.type||null, caption:'Falldokumentation', source:'photo_library', created_by:user.id
        });
        if(mediaErr) throw mediaErr;
      }

      const {error:reportErr} = await s.from('reports').insert({
        user_id:user.id, workflow_id:'repair_report', run_status:'approved', title:draft.title,
        report_date:new Date().toISOString().slice(0,10), location:draft.location, description:draft.description,
        urgency:draft.urgency, recommended_action:draft.recommended_action, image_path:imagePath,
        note, status:'approved', approved_at:new Date().toISOString()
      });
      if(reportErr) throw reportErr;
      setMsg('Freigegeben und in der Historie gespeichert.');
      setDraft(null); setFile(null); setNote('');
    }catch(e){ setMsg(e instanceof Error ? e.message : 'Freigabe fehlgeschlagen.'); }
    finally{ setBusy(false); }
  }

  return <><div className="top"><div className="brand">Neuer Fall</div><div className="badge">Entwurf zuerst</div></div><div className="field"><label>Foto</label><div className="upload"><input type="file" accept="image/*" capture="environment" onChange={e=>setFile(e.target.files?.[0]||null)}/>{preview&&<img className="preview" src={preview} alt="Vorschau"/>}</div></div><div className="field"><label>Deine Notiz</label><textarea className="textarea" placeholder="Was ist passiert? Wo? Was ist dir aufgefallen?" value={note} onChange={e=>setNote(e.target.value)}/></div><button className="btn btnPrimary" style={{width:'100%'}} onClick={generate} disabled={busy}>{busy?'Bitte…':'Berichtsentwurf erzeugen'}</button>{msg&&<div className="status warn">{msg}</div>}{draft&&<><div className="sectionTitle">Entwurf bearbeiten</div><div className="report"><div className="field"><label>Titel</label><input className="input" value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/></div><div className="field"><label>Ort / Bauteil</label><input className="input" value={draft.location} onChange={e=>setDraft({...draft,location:e.target.value})}/></div><div className="field"><label>Beschreibung</label><textarea className="textarea" value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})}/></div><div className="field"><label>Dringlichkeit</label><select className="select" value={draft.urgency} onChange={e=>setDraft({...draft,urgency:e.target.value})}><option value="low">niedrig</option><option value="medium">mittel</option><option value="high">hoch</option></select></div><div className="field"><label>Empfohlener nächster Schritt</label><textarea className="textarea" value={draft.recommended_action} onChange={e=>setDraft({...draft,recommended_action:e.target.value})}/></div><div className="status warn"><strong>Noch nicht freigegeben.</strong> Mila erstellt nur den Entwurf. Erst dein Klick speichert ihn als freigegebenen Bericht.</div><div className="actions"><button className="btn btnSecondary" onClick={()=>setDraft(null)} disabled={busy}>Verwerfen</button><button className="btn btnPrimary" onClick={approve} disabled={busy}>Ausdrücklich freigeben</button></div></div></>}</>;
}
