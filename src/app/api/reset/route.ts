import { NextResponse } from 'next/server';
import { clearAll } from '@/lib/db';

export async function DELETE() {
  const result = clearAll();
  return NextResponse.json(result);
}
