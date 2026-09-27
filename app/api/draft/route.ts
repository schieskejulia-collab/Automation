import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

type Draft = {
  title: string;
  location: string;
  component: string;
  finding: string;
  measurement: string;
  material: string;
  description: string;
  urgency: 'low' | 'medium' | 'high';
  recommended_action: string;
};

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();

    const location = String(form.get('location') || '').trim();
    const component = String(form.get('component') || '').trim();
    const finding = String(form.get('finding') || '').trim();
    const measurement = String(form.get('measurement') || '').trim();
    const material = String(form.get('material') || '').trim();
    const action = String(form.get('action') || '').trim();
    const note = String(form.get('note') || '').trim();
    const urgencyRaw = String(form.get('urgency') || 'medium');
    const urgency: Draft['urgency'] = urgencyRaw === 'low' || urgencyRaw === 'high' ? urgencyRaw : 'medium';

    if (!finding && !note) {
      return NextResponse.json({ error: 'Bitte mindestens einen Befund oder eine Notiz eintragen.' }, { status: 400 });
    }

    const titleBase = component && finding ? `${component}: ${finding}` : finding || note || 'Dokumentierter Fall';
    const descriptionParts = [finding, note].filter(Boolean);

    const draft: Draft = {
      title: titleBase.slice(0, 100),
      location: location || 'Noch nicht angegeben',
      component: component || 'Noch nicht angegeben',
      finding: finding || note || 'Noch nicht angegeben',
      measurement: measurement || 'Nicht erfasst',
      material: material || 'Nicht erfasst',
      description: descriptionParts.join('\n\n'),
      urgency,
      recommended_action: action || 'Fachlich prüfen, erforderliche Maßnahme festlegen und erst danach ausdrücklich freigeben.'
    };

    return NextResponse.json({ draft, mode: 'manual' });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Entwurf konnte nicht erstellt werden.' }, { status: 500 });
  }
}
