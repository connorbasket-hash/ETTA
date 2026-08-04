import { NextResponse } from 'next/server';
import { getKeywordsWithAssignments, clearKeywords } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sourceType = searchParams.get('sourceType') as 'subject' | 'body' | 'both' | null;

  const keywords = getKeywordsWithAssignments({ sourceType: sourceType || undefined });
  return NextResponse.json({ keywords, total: keywords.length });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const sourceType = searchParams.get('sourceType') as 'subject' | 'body' | 'both' | null;

  const result = clearKeywords(sourceType || undefined);
  return NextResponse.json({ deleted: result.changes });
}
