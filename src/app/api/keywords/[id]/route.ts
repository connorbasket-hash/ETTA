import { NextResponse } from 'next/server';
import { getKeyword, assignKeyword, deleteKeyword } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const keyword = getKeyword(Number(id));

  if (!keyword) {
    return NextResponse.json({ error: 'Keyword not found' }, { status: 404 });
  }

  return NextResponse.json(keyword);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { projectId, taskTypeId } = await request.json();

  assignKeyword(Number(id), projectId ?? null, taskTypeId ?? null);

  const keyword = getKeyword(Number(id));
  return NextResponse.json(keyword);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  deleteKeyword(Number(id));
  return NextResponse.json({ success: true });
}
