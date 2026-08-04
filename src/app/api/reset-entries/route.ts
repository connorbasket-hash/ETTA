import { NextResponse } from 'next/server';
import { clearTransientData } from '@/lib/db';

export async function DELETE() {
  const result = clearTransientData();
  return NextResponse.json(result);
}
