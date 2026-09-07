import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const results = Array.isArray(body?.results) ? body.results : [];
    const rows = results.flatMap((r: any, i: number) => (r.prompts || []).map((p: any, j: number) => ({
      Image: i + 1,
      Subject: r.analysis?.subject || '',
      Style: r.analysis?.visualStyle || '',
      Mood: r.analysis?.mood || '',
      Prompt_Number: j + 1,
      Prompt_Title: p.title || '',
      Prompt: p.prompt || '',
      Negative_Guidance: (p.negativeGuidance || []).join('; '),
      Confidence: r.confidence ?? ''
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Prompts');
    const analyses = results.map((r: any, i: number) => ({ Image: i + 1, Subject: r.analysis?.subject || '', Environment: r.analysis?.environment || '', Composition: r.analysis?.composition || '', Viewpoint: r.analysis?.viewpoint || '', Lighting: r.analysis?.lighting || '', Colors: (r.analysis?.colorPalette || []).join(', '), Mood: r.analysis?.mood || '', Style: r.analysis?.visualStyle || '' }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(analyses), 'Analysis');
    const bytes = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return new NextResponse(bytes, { status: 200, headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': 'attachment; filename="creative-results.xlsx"' } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Excel export failed.' }, { status: 500 });
  }
}
