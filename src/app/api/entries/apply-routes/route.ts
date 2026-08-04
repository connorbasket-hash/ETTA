import { NextResponse } from 'next/server';
import { applyRoutesToEntries } from '@/lib/db';

export async function POST() {
  try {
    const { updated, cleared } = applyRoutesToEntries();

    return NextResponse.json({
      success: true,
      message: `Updated ${updated} entries with routes, cleared ${cleared} stale assignments`,
      updated,
      cleared,
    });
  } catch (error) {
    console.error('Error applying routes:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to apply routes' },
      { status: 500 }
    );
  }
}
