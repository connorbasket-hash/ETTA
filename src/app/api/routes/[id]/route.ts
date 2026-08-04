import { NextResponse } from 'next/server';
import { getUnifiedRoute, deleteUnifiedRoute } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const routeId = parseInt(id, 10);

  if (isNaN(routeId)) {
    return NextResponse.json({ error: 'Invalid route ID' }, { status: 400 });
  }

  const route = getUnifiedRoute(routeId);

  if (!route) {
    return NextResponse.json({ error: 'Route not found' }, { status: 404 });
  }

  return NextResponse.json({ route });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const routeId = parseInt(id, 10);

  if (isNaN(routeId)) {
    return NextResponse.json({ error: 'Invalid route ID' }, { status: 400 });
  }

  const result = deleteUnifiedRoute(routeId);

  if (result.changes === 0) {
    return NextResponse.json({ error: 'Route not found' }, { status: 404 });
  }

  return NextResponse.json({ deleted: result.changes });
}
