import { NextResponse } from 'next/server';
import { runOutlookPythonScript } from '@/lib/outlook-python';

export async function POST() {
  try {
    const { stdout, code } = await runOutlookPythonScript('outlook_auth.py', [
      'logout',
    ]);

    if (code !== 0) {
      let message = 'Failed to sign out';
      try {
        const parsed = JSON.parse(stdout);
        message = parsed.error || message;
      } catch {
        // ignore
      }
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Signed out.' });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sign out',
      },
      { status: 500 }
    );
  }
}
