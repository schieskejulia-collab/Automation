import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

type Draft={title:string;location:string;description:string;urgency:string;recommended_action:string};

function fallback(note:string):Draft{
  const clean=note.trim();
  return {
    title:clean?clean.slice(0,70):'Dokumentierter Reparaturfall',
    location:'Noch zu prüfen',
    description:clean||'Foto wurde aufgenommen. Beschreibung muss vor Freigabe ergänzt werden.',
    urgency:'medium',
    recommended_action:'Befund fachlich prüfen, Angaben ergänzen und erst danach ausdrücklich freigeben.'
  };
}

export async function POST(req:NextRequest){
  try{
    const form=await req.formData();
    const note=String(form.get('note')||'');
    const image=form.get('image');
    const key=process.env.OPENAI_API_KEY;
    if(!key) return NextResponse.json({draft:fallback(note),mode:'fallback'});

    let imagePart:any=null;
    if(image instanceof File&&image.size){
      const b=Buffer.from(await image.arrayBuffer());
      imagePart={type:'input_image',image_url:`data:${image.type||'image/jpeg'};base64,${b.toString('base64')}`};
    }

    const content:any[]=[{type:'input_text',text:`Erstelle ausschließlich einen sachlichen, editierbaren Berichtsentwurf für einen Bau-/Reparaturfall. Keine Freigabe, keine erfundenen Tatsachen. Nutzer-Notiz: ${note||'(keine)'}. Antworte nur als JSON mit title, location, description, urgency, recommended_action. urgency muss genau low, medium oder high sein.`}];
    if(imagePart) content.push(imagePart);

    const r=await fetch('https://api.openai.com/v1/responses',{
      method:'POST',
      headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},
      body:JSON.stringify({
        model:'gpt-5-mini',
        input:[{role:'user',content}],
        text:{format:{type:'json_schema',name:'report_draft',strict:true,schema:{type:'object',additionalProperties:false,properties:{title:{type:'string'},location:{type:'string'},description:{type:'string'},urgency:{type:'string'},recommended_action:{type:'string'}},required:['title','location','description','urgency','recommended_action']}}}
      })
    });
    if(!r.ok) throw new Error(`OpenAI ${r.status}`);
    const data=await r.json();
    const txt=data.output_text||data.output?.flatMap((x:any)=>x.content||[]).find((x:any)=>x.type==='output_text')?.text;
    if(!txt) throw new Error('Kein Entwurf erhalten');
    return NextResponse.json({draft:JSON.parse(txt),mode:'ai'});
  }catch(e){
    return NextResponse.json({error:e instanceof Error?e.message:'Entwurf konnte nicht erstellt werden.'},{status:500});
  }
}
