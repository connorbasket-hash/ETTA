import { NextResponse } from 'next/server';
import { getEntry, updateEntry, deleteEntry } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const entryId = parseInt(id, 10);

  if (isNaN(entryId)) {
    return NextResponse.json({ error: 'Invalid entry ID' }, { status: 400 });
  }

  const entry = getEntry(entryId);

  if (!entry) {
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
  }

  return NextResponse.json({ entry });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const entryId = parseInt(id, 10);

    if (isNaN(entryId)) {
      return NextResponse.json({ error: 'Invalid entry ID' }, { status: 400 });
    }

    const body = await request.json();

    const result = updateEntry(entryId, body);

    if (result.changes === 0) {
      const entry = getEntry(entryId);
      if (!entry) {
        return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
      }
    }

    return NextResponse.json({ updated: result.changes });
  } catch (error) {
    console.error('Error updating entry:', error);
    return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const entryId = parseInt(id, 10);

  if (isNaN(entryId)) {
    return NextResponse.json({ error: 'Invalid entry ID' }, { status: 400 });
  }

  const result = deleteEntry(entryId);

  if (result.changes === 0) {
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
  }

  return NextResponse.json({ deleted: result.changes });
}
