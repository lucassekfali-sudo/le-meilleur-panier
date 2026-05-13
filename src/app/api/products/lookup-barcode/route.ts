import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * POST { barcode: "3017620422003" }
 *  → { found: true, name, brand, imageUrl, category }
 *
 * Wraps the public Open Food Facts API. Free, legal, gratuit.
 * https://world.openfoodfacts.org
 */
export async function POST(req: NextRequest) {
  try {
    const { barcode } = await req.json();
    if (!barcode || !/^\d{8,14}$/.test(String(barcode))) {
      return NextResponse.json({ found: false, error: 'Invalid barcode' }, { status: 400 });
    }

    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
      { headers: { 'User-Agent': 'LeMeilleurPanier/2.0 (https://le-meilleur-panier.vercel.app)' } }
    );
    if (!res.ok) {
      return NextResponse.json({ found: false }, { status: 200 });
    }
    const data = await res.json();
    if (data.status !== 1 || !data.product) {
      return NextResponse.json({ found: false }, { status: 200 });
    }
    const p = data.product;
    return NextResponse.json({
      found: true,
      barcode,
      name:
        p.product_name_fr ||
        p.product_name_en ||
        p.product_name ||
        p.generic_name ||
        'Produit',
      brand: p.brands?.split(',')[0]?.trim() || '',
      imageUrl: p.image_front_url || p.image_url || '',
      category: mapCategory(p.categories_tags || []),
      quantity: p.quantity || '',
    });
  } catch (e) {
    console.error('[lookup-barcode] error:', e);
    return NextResponse.json({ found: false, error: 'Internal error' }, { status: 500 });
  }
}

function mapCategory(tags: string[]): string {
  const t = tags.join(' ').toLowerCase();
  if (t.includes('beverage') || t.includes('boisson') || t.includes('soda')) return 'beverages';
  if (t.includes('dairy') || t.includes('milk') || t.includes('yogurt') || t.includes('lait') || t.includes('fromage')) return 'dairy';
  if (t.includes('meat') || t.includes('viande') || t.includes('poisson') || t.includes('fish')) return 'meat';
  if (t.includes('bread') || t.includes('bakery') || t.includes('pain') || t.includes('boulangerie')) return 'bakery';
  if (t.includes('fruit') || t.includes('vegetable') || t.includes('legume')) return 'fruits';
  if (t.includes('frozen') || t.includes('surgelé')) return 'frozen';
  if (t.includes('snack') || t.includes('chocolate') || t.includes('biscuit')) return 'snacks';
  if (t.includes('hygiene') || t.includes('cosmetic')) return 'hygiene';
  if (t.includes('cleaning') || t.includes('household')) return 'household';
  return 'other';
}
