import { NextResponse } from 'next/server';
import { getSource } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sourceId = parseInt(id, 10);

  if (isNaN(sourceId)) {
    return NextResponse.json({ error: 'Invalid source ID' }, { status: 400 });
  }

  const source = getSource(sourceId);

  if (!source) {
    return NextResponse.json({ error: 'Source not found' }, { status: 404 });
  }

  return NextResponse.json({ source });
}
