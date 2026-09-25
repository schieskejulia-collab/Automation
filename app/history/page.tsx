'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';

type Report={id:string;title:string;report_date:string;location:string|null;description:string;urgency:string;recommended_action:string;status:string;approved_at:string|null};

export default function History(){
  const [rows,setRows]=useState<Report[]>([]);
  const [msg,setMsg]=useState('Lade…');
  useEffect(()=>{(async()=>{
    try{
      const s=supabaseBrowser();
      const {data:{user}}=await s.auth.getUser();
      if(!user){setMsg('Bitte zuerst anmelden.');return;}
      const {data,error}=await s.from('reports').select('id,title,report_date,location,description,urgency,recommended_action,status,approved_at').eq('user_id',user.id).order('created_at',{ascending:false});
      if(error) throw error;
      setRows((data||[]) as Report[]); setMsg('');
    }catch(e){setMsg(e instanceof Error?e.message:'Historie konnte nicht geladen werden.');}
  })()},[]);

  return <><div className="top"><div className="brand">Historie</div><div className="badge">{rows.length} Berichte</div></div>{msg&&<div className="status warn">{msg}</div>}{!msg&&!rows.length&&<div className="empty">Noch keine Berichte vorhanden.</div>}<div className="grid">{rows.map(r=><div className="card" key={r.id}><strong>{r.title}</strong><span>{r.report_date} · {r.location||'ohne Ort'} · {r.status}</span><div style={{height:10}}/><span>{r.description}</span><div style={{height:14}}/><a className="btn btnSecondary" style={{display:'inline-block'}} href={`/api/reports/${r.id}/pdf`} target="_blank">PDF öffnen</a></div>)}</div></>;
}
