import { NextResponse } from 'next/server';
import { getProjects, createProject } from '@/lib/db';

export async function GET() {
  const projects = getProjects();
  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const { name } = await request.json();

  if (!name) {
    return NextResponse.json({ error: 'name required' }, { status: 400 });
  }

  try {
    const result = createProject(name);
    return NextResponse.json({ id: result.lastInsertRowid, name });
  } catch {
    return NextResponse.json({ error: 'Project name already exists' }, { status: 409 });
  }
}
