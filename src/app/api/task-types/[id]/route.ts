import { NextResponse } from 'next/server';
import { getTaskType, updateTaskType, deleteTaskType, addTaskTypeKeyword, removeTaskTypeKeyword } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const taskType = getTaskType(Number(id));

  if (!taskType) {
    return NextResponse.json({ error: 'Task type not found' }, { status: 404 });
  }

  return NextResponse.json(taskType);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { name, addKeyword, removeKeyword } = await request.json();

  const taskTypeId = Number(id);

  // Handle keyword operations
  if (addKeyword) {
    addTaskTypeKeyword(taskTypeId, addKeyword);
    const taskType = getTaskType(taskTypeId);
    return NextResponse.json(taskType);
  }

  if (removeKeyword) {
    removeTaskTypeKeyword(taskTypeId, removeKeyword);
    const taskType = getTaskType(taskTypeId);
    return NextResponse.json(taskType);
  }

  // Handle name update
  if (!name) {
    return NextResponse.json({ error: 'name required' }, { status: 400 });
  }

  try {
    updateTaskType(taskTypeId, name);
    const taskType = getTaskType(taskTypeId);
    return NextResponse.json(taskType);
  } catch {
    return NextResponse.json({ error: 'Task type name already exists' }, { status: 409 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  deleteTaskType(Number(id));
  return NextResponse.json({ success: true });
}
