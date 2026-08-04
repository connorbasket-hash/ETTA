import { NextResponse } from 'next/server';
import { getProject, updateProject, deleteProject, addProjectKeyword, removeProjectKeyword, addProjectEmailPattern, removeProjectEmailPattern } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = getProject(Number(id));

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  return NextResponse.json(project);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { name, addKeyword, removeKeyword, addEmailPattern, removeEmailPattern } = await request.json();

  const projectId = Number(id);

  // Handle keyword operations
  if (addKeyword) {
    addProjectKeyword(projectId, addKeyword);
    const project = getProject(projectId);
    return NextResponse.json(project);
  }

  if (removeKeyword) {
    removeProjectKeyword(projectId, removeKeyword);
    const project = getProject(projectId);
    return NextResponse.json(project);
  }

  // Handle email pattern operations
  if (addEmailPattern) {
    addProjectEmailPattern(projectId, addEmailPattern);
    const project = getProject(projectId);
    return NextResponse.json(project);
  }

  if (removeEmailPattern) {
    removeProjectEmailPattern(projectId, removeEmailPattern);
    const project = getProject(projectId);
    return NextResponse.json(project);
  }

  // Handle name update
  if (!name) {
    return NextResponse.json({ error: 'name required' }, { status: 400 });
  }

  try {
    updateProject(projectId, name);
    const project = getProject(projectId);
    return NextResponse.json(project);
  } catch {
    return NextResponse.json({ error: 'Project name already exists' }, { status: 409 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  deleteProject(Number(id));
  return NextResponse.json({ success: true });
}
