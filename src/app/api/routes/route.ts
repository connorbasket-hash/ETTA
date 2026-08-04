import { NextResponse } from 'next/server';
import { getUnifiedRoutes, createUnifiedRoute, checkUnifiedRouteDuplicate } from '@/lib/db';
import { getJiraCredentials, validateJiraIssue } from '@/lib/jira';

export async function GET() {
  const routes = getUnifiedRoutes();
  return NextResponse.json({ routes });
}

export async function POST(request: Request) {
  const { project_id, task_type_id, source_type, jira_key, assigns_task_type_id } = await request.json();

  // Validate required fields
  if (!jira_key) {
    return NextResponse.json(
      { error: 'jira_key is required' },
      { status: 400 }
    );
  }

  // At least one of task_type_id or source_type must be provided
  if (!task_type_id && !source_type) {
    return NextResponse.json(
      { error: 'Either task_type_id or source_type (or both) is required' },
      { status: 400 }
    );
  }

  // Validate source_type if provided
  if (source_type && source_type !== 'email' && source_type !== 'meeting') {
    return NextResponse.json(
      { error: 'source_type must be "email" or "meeting"' },
      { status: 400 }
    );
  }

  // Check for duplicate route
  const isDuplicate = checkUnifiedRouteDuplicate(
    project_id || null,
    task_type_id || null,
    source_type || null
  );
  if (isDuplicate) {
    return NextResponse.json(
      { error: 'A route already exists for this combination of project, task type, and source type' },
      { status: 409 }
    );
  }

  // Validate Jira issue
  const creds = getJiraCredentials();
  if (!creds) {
    return NextResponse.json(
      { error: 'Jira credentials not configured. Please set up Jira in Settings.' },
      { status: 400 }
    );
  }

  const validation = await validateJiraIssue(creds, jira_key);
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error || 'Invalid Jira issue' },
      { status: 400 }
    );
  }

  try {
    const result = createUnifiedRoute(
      project_id || null,
      task_type_id || null,
      source_type || null,
      jira_key,
      validation.jiraName!,
      assigns_task_type_id || null
    );
    return NextResponse.json({
      id: result.id,
      project_id: project_id || null,
      task_type_id: task_type_id || null,
      source_type: source_type || null,
      jira_key,
      jira_name: validation.jiraName,
      assigns_task_type_id: assigns_task_type_id || null,
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to create route' },
      { status: 500 }
    );
  }
}
