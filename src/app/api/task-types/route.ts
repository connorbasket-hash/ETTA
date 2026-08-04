import { NextResponse } from 'next/server';
import { getTaskTypes, createTaskType } from '@/lib/db';

export async function GET() {
  const taskTypes = getTaskTypes();
  return NextResponse.json({ taskTypes });
}

export async function POST(request: Request) {
  const { name } = await request.json();

  if (!name) {
    return NextResponse.json({ error: 'name required' }, { status: 400 });
  }

  try {
    const result = createTaskType(name);
    return NextResponse.json({ id: result.lastInsertRowid, name });
  } catch {
    return NextResponse.json({ error: 'Task type name already exists' }, { status: 409 });
  }
}
