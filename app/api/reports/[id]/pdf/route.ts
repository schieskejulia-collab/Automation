import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { jsPDF } from 'jspdf';

export const runtime='nodejs';

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key) return NextResponse.json({error:'Supabase-Konfiguration fehlt.'},{status:500});

  const cookieStore=await cookies();
  const s=createServerClient(url,key,{cookies:{getAll(){return cookieStore.getAll()},setAll(){}}});
  const {data,error}=await s.from('reports').select('*').eq('id',id).single();
  if(error||!data) return NextResponse.json({error:'Bericht nicht gefunden oder nicht berechtigt.'},{status:404});

  const pdf=new jsPDF();
  pdf.setFontSize(18); pdf.text('Mila Mobile – Bericht',20,20); pdf.setFontSize(12);
  const lines=[`Titel: ${data.title}`,`Datum: ${data.report_date}`,`Ort: ${data.location||'-'}`,`Status: ${data.status}`,`Dringlichkeit: ${data.urgency}`,'','Beschreibung:',...pdf.splitTextToSize(data.description,170),'','Empfohlener nächster Schritt:',...pdf.splitTextToSize(data.recommended_action,170)];
  let y=34;
  for(const line of lines){ if(y>280){pdf.addPage();y=20;} pdf.text(String(line),20,y); y+=7; }
  const out=pdf.output('arraybuffer');
  return new NextResponse(out,{headers:{'Content-Type':'application/pdf','Content-Disposition':`inline; filename="mila-report-${id}.pdf"`}});
}
