import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';

function top(items: string[], limit = 8) {
  const map = new Map<string, number>();
  for (const raw of items) { const s = String(raw || '').trim(); if (s) map.set(s, (map.get(s) || 0) + 1); }
  return [...map.entries()].sort((a,b)=>b[1]-a[1]).slice(0, limit).map(([label,count])=>({label,count}));
}

export async function POST(req: NextRequest) {
  try {
    const { analyses = [] } = await req.json();
    const safe = Array.isArray(analyses) ? analyses : [];
    const themes = safe.flatMap((x:any)=>[x?.analysis?.subject, ...(x?.creativeDirections||[]).map((d:any)=>d?.title)]);
    const styles = safe.map((x:any)=>x?.analysis?.visualStyle);
    const colors = safe.flatMap((x:any)=>x?.analysis?.colorPalette || []);
    const compositions = safe.map((x:any)=>x?.analysis?.composition);
    const moods = safe.map((x:any)=>x?.analysis?.mood);
    const opportunities = top(safe.flatMap((x:any)=>(x?.creativeDirections||[]).map((d:any)=>d?.concept)), 6);
    return NextResponse.json({
      imageCount: safe.length,
      themes: top(themes), styles: top(styles), colors: top(colors), compositions: top(compositions), moods: top(moods),
      opportunities: opportunities.map(x=>x.label),
    });
  } catch { return NextResponse.json({ error: 'Trend aggregation failed.' }, { status: 400 }); }
}
