import { NextResponse } from 'next/server';
import { getUnifiedRouteByNames } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const project = searchParams.get('project');
  const taskType = searchParams.get('taskType');
  const sourceType = searchParams.get('sourceType') as 'email' | 'meeting' | null;

  if (!project) {
    return NextResponse.json(
      { error: 'project query parameter is required' },
      { status: 400 }
    );
  }

  // At least one of taskType or sourceType is required
  if (!taskType && !sourceType) {
    return NextResponse.json(
      { error: 'Either taskType or sourceType query parameter is required' },
      { status: 400 }
    );
  }

  // Validate sourceType if provided
  if (sourceType && sourceType !== 'email' && sourceType !== 'meeting') {
    return NextResponse.json(
      { error: 'sourceType must be "email" or "meeting"' },
      { status: 400 }
    );
  }

  const route = getUnifiedRouteByNames(
    project,
    taskType || null,
    sourceType || null
  );

  if (!route) {
    return NextResponse.json({ route: null });
  }

  return NextResponse.json({
    route: {
      jira_key: route.jira_key,
      jira_name: route.jira_name,
      task_type_name: route.task_type_name,
      source_type: route.source_type,
      assigns_task_type_name: route.assigns_task_type_name,
    },
  });
}
