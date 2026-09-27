import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { jsPDF } from 'jspdf';

export const runtime='nodejs';

const fallbackUrl='https://avzjzxhvoahypwaosifd.supabase.co';
const fallbackPublishableKey='sb_publishable_oN-w7C31Vdn4WRLgOxioIg_IzXEtT6j';

function urgencyLabel(value:string){
  if(value==='high') return 'hoch';
  if(value==='low') return 'niedrig';
  return 'mittel';
}

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL||fallbackUrl;
  const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||fallbackPublishableKey;

  const cookieStore=await cookies();
  const s=createServerClient(url,key,{cookies:{getAll(){return cookieStore.getAll()},setAll(){}}});
  const {data,error}=await s.from('reports').select('*').eq('id',id).single();
  if(error||!data) return NextResponse.json({error:'Bericht nicht gefunden oder nicht berechtigt.'},{status:404});

  const pdf=new jsPDF();
  const pageWidth=pdf.internal.pageSize.getWidth();
  const left=20;
  const maxWidth=pageWidth-40;
  let y=20;

  pdf.setFontSize(18);
  pdf.text('Mila Mobile – Falldokumentation',left,y);
  y+=12;
  pdf.setFontSize(10);
  pdf.text(`Bericht-ID: ${data.id}`,left,y); y+=6;
  pdf.text(`Fall-ID: ${data.case_id||'-'}`,left,y); y+=6;
  pdf.text(`Datum: ${data.report_date}`,left,y); y+=6;
  pdf.text(`Freigegeben: ${data.approved_at ? new Date(data.approved_at).toLocaleString('de-DE') : '-'}`,left,y); y+=6;
  pdf.text(`Status: ${data.status}`,left,y); y+=10;

  if(data.image_path){
    try{
      const {data:signed}=await s.storage.from('case-media').createSignedUrl(data.image_path,60);
      if(signed?.signedUrl){
        const imageRes=await fetch(signed.signedUrl);
        if(imageRes.ok){
          const mime=imageRes.headers.get('content-type')||'image/jpeg';
          const bytes=Buffer.from(await imageRes.arrayBuffer());
          const base64=`data:${mime};base64,${bytes.toString('base64')}`;
          const format=mime.includes('png')?'PNG':'JPEG';
          const imgProps=pdf.getImageProperties(base64);
          const targetWidth=Math.min(maxWidth,165);
          const targetHeight=(imgProps.height*targetWidth)/imgProps.width;
          const safeHeight=Math.min(targetHeight,95);
          pdf.addImage(base64,format,left,y,targetWidth,safeHeight);
          y+=safeHeight+10;
        }
      }
    }catch{
      // Bericht bleibt auch dann nutzbar, wenn das Bild nicht eingebettet werden kann.
    }
  }

  const sections:[string,string][]=[
    ['Titel',data.title||'-'],
    ['Ort',data.location||'-'],
    ['Bauteil',data.component||'-'],
    ['Befund',data.finding||data.description||'-'],
    ['Maß / Menge',data.measurement||'-'],
    ['Material',data.material||'-'],
    ['Dringlichkeit',urgencyLabel(data.urgency)],
    ['Maßnahme / nächster Schritt',data.recommended_action||'-'],
    ['Zusätzliche Notiz',data.note||'-']
  ];

  pdf.setFontSize(11);
  for(const [label,value] of sections){
    const lines=pdf.splitTextToSize(String(value),maxWidth);
    const needed=8+(lines.length*6);
    if(y+needed>280){pdf.addPage();y=20;}
    pdf.setFont(undefined,'bold');
    pdf.text(`${label}:`,left,y);
    y+=6;
    pdf.setFont(undefined,'normal');
    for(const line of lines){pdf.text(String(line),left,y);y+=6;}
    y+=4;
  }

  const out=pdf.output('arraybuffer');
  return new NextResponse(out,{headers:{'Content-Type':'application/pdf','Content-Disposition':`inline; filename="mila-report-${id}.pdf"`}});
}
