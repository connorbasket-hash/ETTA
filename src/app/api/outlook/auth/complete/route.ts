import { NextResponse } from 'next/server';
import { runOutlookPythonScript } from '@/lib/outlook-python';

export async function POST() {
  try {
    const { stdout, stderr, code } = await runOutlookPythonScript(
      'outlook_auth.py',
      ['complete'],
      { timeoutMs: 180_000 }
    );

    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(stdout || '{}');
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: stderr || 'Invalid response from auth script',
        },
        { status: 500 }
      );
    }

    if (data.pending) {
      return NextResponse.json({
        success: false,
        pending: true,
        message: data.message || 'Waiting for sign-in to complete...',
      });
    }

    if (code !== 0 || data.success === false) {
      return NextResponse.json(
        {
          success: false,
          error:
            (data.error as string) ||
            (data.message as string) ||
            stderr ||
            'Sign-in failed',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      account: data.account,
      message: data.message,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Sign-in failed',
      },
      { status: 500 }
    );
  }
}
