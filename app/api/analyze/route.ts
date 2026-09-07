import { NextRequest, NextResponse } from 'next/server';
import { withApiKeyRotation } from '@/lib/api-key-pool';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { consumeCredits, grantCredits } from '@/lib/credits';
import { creditsForImages } from '@/lib/billing';
import { allowRequest, clientKey } from '@/lib/request-guard';

export const runtime = 'nodejs';

const MODEL = process.env.OPENAI_VISION_MODEL || 'gpt-5.6-luna';
const MAX_IMAGE_CHARS = 12_000_000;

function parseJson(text: string) {
  const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
  try { return JSON.parse(cleaned); } catch {
    const start = cleaned.indexOf('{'); const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error('AI returned invalid JSON.');
  }
}

function extractText(data: any): string {
  if (typeof data.output_text === 'string') return data.output_text;
  const parts: string[] = [];
  for (const item of data.output ?? []) {
    for (const content of item.content ?? []) if (typeof content.text === 'string') parts.push(content.text);
  }
  return parts.join('\n');
}

function makePrompt(target: string, level: string, count: number) {
  return `You are a creative director for a reference-image inspiration tool. Analyze the supplied reference image, but DO NOT recreate it and do not produce an exact prompt for the image. Extract only broad visual concepts and then invent substantially differentiated creative directions.\n\nTarget generator: ${target}. Differentiation level: ${level}. Generate exactly ${count} distinct prompt directions.\n\nHard rules:\n- Do not preserve the exact composition, camera angle, object arrangement, background, lighting setup, color placement, or distinctive artistic expression.\n- Avoid logos, trademarks, brand identifiers, recognizable copyrighted characters, celebrity likenesses, and signature marks.\n- Keep only high-level inspiration such as subject category, mood, broad palette family, or general visual intent.\n- Each direction must change at least 4 of: composition, viewpoint, environment, lighting, supporting elements, subject treatment, palette relationships, scale, depth, or visual style.\n- Prompts should be commercially useful and descriptive, but not claim copyright clearance or marketplace approval.\n\nReturn ONLY valid JSON matching this schema:\n{\n  "analysis": {"subject":"", "secondaryElements":[], "environment":"", "composition":"", "viewpoint":"", "lighting":"", "colorPalette":[], "mood":"", "visualStyle":"", "distinctiveFeaturesToAvoid":[]},\n  "creativeDirections": [{"title":"", "concept":"", "changes":[]}],\n  "prompts": [{"title":"", "prompt":"", "negativeGuidance":[]}],\n  "confidence": 0.0\n}`;
}

export async function POST(req: NextRequest) {
  let charged = false;
  let charge = 0;
  let refundUserId = '';
  let imageId = '';
  try {
    if (!allowRequest(`analyze:${clientKey(req.headers)}`, 30, 60_000)) return NextResponse.json({ error: 'Too many analysis requests. Please wait a moment.' }, { status: 429 });
    const body = await req.json();
    const { imageDataUrl, target = 'ChatGPT Image', level = 'High', count = 3 } = body ?? {};
    imageId = typeof body?.imageId === 'string' ? body.imageId.slice(0, 100) : '';
    if (typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:image/')) {
      return NextResponse.json({ error: 'A valid imageDataUrl is required.' }, { status: 400 });
    }
    if (imageDataUrl.length > MAX_IMAGE_CHARS) return NextResponse.json({ error: 'Image is too large. Please use an image under roughly 9 MB.' }, { status: 413 });

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
    charge = user ? creditsForImages(1, Math.max(1, Math.min(10, Number(count) || 3))) : 0;
    if (user && supabase) {
      try {
        await consumeCredits(user.id, charge, 'image_analysis', imageId || null);
      } catch (creditError: any) {
        const status = creditError?.message?.includes('INSUFFICIENT_CREDITS') ? 402 : 500;
        return NextResponse.json({ error: status === 402 ? 'Insufficient credits.' : creditError?.message || 'Credit reservation failed.' }, { status });
      }
      charged = true;
      refundUserId = user.id;
    }
    const result = await withApiKeyRotation(async (apiKey) => {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: MODEL,
          input: [{ role: 'user', content: [
            { type: 'input_text', text: makePrompt(target, level, Math.max(1, Math.min(10, Number(count) || 3))) },
            { type: 'input_image', image_url: imageDataUrl, detail: 'high' }
          ] }],
          max_output_tokens: 5000,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        const err: any = new Error(data?.error?.message || `OpenAI request failed (${response.status}).`);
        err.status = response.status; err.code = data?.error?.code;
        throw err;
      }
      return data;
    });

    const parsed = parseJson(extractText(result));
    return NextResponse.json({ imageId, model: MODEL, ...parsed });
  } catch (error: any) {
    // Refund credits when the AI request fails after a successful reservation.
    // This keeps failed provider calls from silently consuming user credits.
    try {
      if (charged && refundUserId) {
        await grantCredits(refundUserId, charge, 'analysis_failed_refund', imageId || null);
      }
    } catch {}
    const status = Number(error?.status) >= 400 && Number(error?.status) < 600 ? Number(error.status) : 500;
    return NextResponse.json({ error: error?.message || 'Analysis failed.' }, { status });
  }
}
