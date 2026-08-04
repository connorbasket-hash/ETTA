import { NextResponse } from 'next/server';
import {
  getEffectiveOutlookBackend,
  runOutlookPythonScript,
} from '@/lib/outlook-python';

export async function GET() {
  try {
    const backend = getEffectiveOutlookBackend();
    const { stdout, code } = await runOutlookPythonScript('outlook_auth.py', [
      'status',
    ]);

    if (code !== 0) {
      return NextResponse.json({
        backend,
        configured: false,
        connected: false,
        account: null,
        message: 'Failed to read Outlook auth status.',
      });
    }

    const status = JSON.parse(stdout);
    return NextResponse.json({
      backend,
      ...status,
    });
  } catch (error) {
    return NextResponse.json(
      {
        backend: getEffectiveOutlookBackend(),
        configured: false,
        connected: false,
        account: null,
        message:
          error instanceof Error ? error.message : 'Outlook status check failed',
      },
      { status: 500 }
    );
  }
}
