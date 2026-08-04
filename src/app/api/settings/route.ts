import { NextResponse } from 'next/server';
import { getAllSettings, setSetting } from '@/lib/db';

export async function GET() {
  const settings = getAllSettings();
  return NextResponse.json({ settings });
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'Settings object required' }, { status: 400 });
    }

    for (const [key, value] of Object.entries(body)) {
      if (typeof value === 'string') {
        setSetting(key, value);
      } else if (value === null || value === undefined) {
        // Skip null/undefined values
      } else {
        // Convert non-string values to JSON
        setSetting(key, JSON.stringify(value));
      }
    }

    const settings = getAllSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
