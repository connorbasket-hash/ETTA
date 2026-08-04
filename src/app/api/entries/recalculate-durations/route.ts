import { NextResponse } from 'next/server';
import { getEntries, getSource, updateEntry } from '@/lib/db';
import { calculateEmailDuration } from '@/lib/classifier';

export async function POST() {
  try {
    // Get all entries
    const entries = getEntries();

    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const entry of entries) {
      // Only recalculate email durations
      if (entry.source_type !== 'email') {
        skipped++;
        continue;
      }

      // Need source_id to look up the body
      if (!entry.source_id) {
        skipped++;
        continue;
      }

      try {
        const source = getSource(entry.source_id);
        if (!source) {
          skipped++;
          continue;
        }

        // Calculate new duration based on body character count
        const newDuration = calculateEmailDuration(source.body || '');

        // Only update if duration changed
        if (newDuration !== entry.duration_minutes) {
          updateEntry(entry.id, { duration_minutes: newDuration });
          updated++;
        } else {
          skipped++;
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Entry ${entry.id}: ${errorMsg}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updated} email durations, ${skipped} unchanged/skipped`,
      updated,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error recalculating durations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to recalculate durations' },
      { status: 500 }
    );
  }
}
