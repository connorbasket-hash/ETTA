import { NextResponse } from 'next/server';
import { renameProjectInEntries } from '@/lib/db';

export async function POST(request: Request) {
  const { oldName, newName } = await request.json();

  if (!oldName || !newName) {
    return NextResponse.json({ error: 'oldName and newName required' }, { status: 400 });
  }

  try {
    const result = renameProjectInEntries(oldName, newName);
    return NextResponse.json({
      success: true,
      updatedCount: result.changes
    });
  } catch (error) {
    console.error('Failed to rename project in entries:', error);
    return NextResponse.json({ error: 'Failed to rename project' }, { status: 500 });
  }
}
