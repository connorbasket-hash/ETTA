import { NextResponse } from 'next/server';
import { bulkAssignKeywords } from '@/lib/db';

export async function PUT(request: Request) {
  const { ids, projectId, taskTypeId } = await request.json();

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids array required' }, { status: 400 });
  }

  const result = bulkAssignKeywords(ids, projectId ?? null, taskTypeId ?? null);

  return NextResponse.json({ updated: result.changes });
}
