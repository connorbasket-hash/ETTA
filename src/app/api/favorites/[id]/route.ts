import { NextResponse } from 'next/server';
import { getFavorite, updateFavoriteShortName, deleteFavorite } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const favorite = getFavorite(Number(id));

  if (!favorite) {
    return NextResponse.json({ error: 'Favorite not found' }, { status: 404 });
  }

  return NextResponse.json(favorite);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { short_name } = await request.json();

  const favoriteId = Number(id);
  const favorite = getFavorite(favoriteId);

  if (!favorite) {
    return NextResponse.json({ error: 'Favorite not found' }, { status: 404 });
  }

  // Only allow updating short_name - jira_key and jira_name are locked
  updateFavoriteShortName(favoriteId, short_name ?? null);
  const updated = getFavorite(favoriteId);
  return NextResponse.json(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  deleteFavorite(Number(id));
  return NextResponse.json({ success: true });
}
