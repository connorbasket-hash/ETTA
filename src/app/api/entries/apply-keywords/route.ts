import { NextResponse } from 'next/server';
import { applyKeywordsToEntries } from '@/lib/db';

export async function POST() {
  try {
    const { updated, cleared } = applyKeywordsToEntries();

    return NextResponse.json({
      success: true,
      message: `Updated ${updated} entries with keywords, cleared ${cleared} stale assignments`,
      updated,
      cleared,
    });
  } catch (error) {
    console.error('Error applying keywords:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to apply keywords' },
      { status: 500 }
    );
  }
}
