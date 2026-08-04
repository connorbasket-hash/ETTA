import { NextResponse } from 'next/server';
import { getSourceStats } from '@/lib/db';

export async function GET() {
  const stats = getSourceStats();
  return NextResponse.json(stats);
}
