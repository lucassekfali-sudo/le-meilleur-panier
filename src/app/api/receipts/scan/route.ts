import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * POST multipart/form-data with field "image" (jpg/png/webp).
 *  → { store, date, currency, total, items: [{name, quantity, unitPrice, totalPrice, category}] }
 *
 * Uses Google Gemini 1.5 Flash (free tier: 1500 req/day). Set GEMINI_API_KEY in Vercel env.
 * Image is NOT stored — only the extracted JSON is returned (RGPD-friendly).
 */
export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured on server' },
        { status: 503 }
      );
    }

    const formData = await req.formData();
    const image = formData.get('image') as File | null;
    if (!image) {
      return NextResponse.json({ error: 'Image required' }, { status: 400 });
    }

    // Convert to base64
    const buffer = Buffer.from(await image.arrayBuffer());
    const base64 = buffer.toString('base64');
    const mimeType = image.type || 'image/jpeg';

    const PROMPT = `Tu es un OCR expert spécialisé dans les tickets de caisse de supermarchés (toutes nationalités).
Analyse cette image et retourne UNIQUEMENT un JSON valide avec ce schéma exact :

{
  "store": "Nom du magasin (ex: Carrefour, Lidl, Walmart, Loblaws)",
  "date": "YYYY-MM-DD",
  "currency": "EUR | USD | CAD | CHF | GBP | etc.",
  "total": 47.83,
  "items": [
    {
      "name": "Nom du produit (sans abréviations)",
      "quantity": 1,
      "unitPrice": 1.49,
      "totalPrice": 1.49,
      "category": "fruits | meat | dairy | bakery | beverages | frozen | snacks | household | hygiene | other"
    }
  ]
}

Règles :
1. Si un article est illisible, mets "name": "[ILLISIBLE]" mais garde-le.
2. Décode les abréviations courantes (ex: "BCT" = "Baguette", "YG NAT" = "Yaourt nature").
3. Si quantité non visible, mets 1.
4. Ignore les remises ligne par ligne, ne garde que le prix payé.
5. Ne retourne RIEN d'autre que le JSON (pas de markdown, pas d'explications).`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: PROMPT },
              { inline_data: { mime_type: mimeType, data: base64 } },
            ],
          }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('[scan] Gemini error:', errText);
      return NextResponse.json(
        { error: 'Failed to extract receipt' },
        { status: 502 }
      );
    }

    const geminiData = await geminiRes.json();
    const raw = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) {
      return NextResponse.json({ error: 'Empty Gemini response' }, { status: 502 });
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Try to extract JSON from a markdown-wrapped response
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) {
        try { parsed = JSON.parse(m[0]); } catch { parsed = null; }
      }
    }

    if (!parsed) {
      return NextResponse.json({ error: 'Could not parse receipt' }, { status: 502 });
    }

    return NextResponse.json(parsed);
  } catch (e) {
    console.error('[scan] error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
