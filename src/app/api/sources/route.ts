import { NextResponse } from 'next/server';
import { getSources, clearSources } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || undefined;

  const sources = getSources(type);
  return NextResponse.json({ sources, total: sources.length });
}

export async function DELETE() {
  const result = clearSources();
  return NextResponse.json({ deleted: result.changes });
}
