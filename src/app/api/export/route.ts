import { NextResponse } from 'next/server';
import { getExportData } from '@/lib/db';

export async function GET() {
  const data = getExportData();
  return NextResponse.json(data);
}
