import { NextResponse } from 'next/server';
import { runOutlookPythonScript } from '@/lib/outlook-python';

export async function POST() {
  try {
    const { stdout, stderr, code } = await runOutlookPythonScript(
      'outlook_auth.py',
      ['start']
    );

    if (code !== 0) {
      let message = stderr || 'Failed to start Microsoft sign-in';
      try {
        const parsed = JSON.parse(stdout);
        message = parsed.error || message;
      } catch {
        // ignore parse errors
      }
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }

    const data = JSON.parse(stdout);
    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to start sign-in',
      },
      { status: 500 }
    );
  }
}
