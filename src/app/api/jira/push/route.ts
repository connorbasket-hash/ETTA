import { NextResponse } from 'next/server';
import { getJiraCredentials, pushWorklogs, WorklogInput } from '@/lib/jira';
import { getEntry, bulkUpdateEntries } from '@/lib/db';

// Server-side lock to prevent concurrent pushes
let isPushInProgress = false;

export async function POST(request: Request) {
  // Check if a push is already in progress
  if (isPushInProgress) {
    return NextResponse.json(
      { success: false, error: 'A push is already in progress. Please wait for it to complete.' },
      { status: 409 }
    );
  }

  isPushInProgress = true;
  try {
    const { entryIds } = await request.json();

    if (!entryIds || !Array.isArray(entryIds) || entryIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'entryIds array required' },
        { status: 400 }
      );
    }

    // Get Jira credentials
    const creds = getJiraCredentials();
    if (!creds) {
      return NextResponse.json(
        { success: false, error: 'Jira credentials not configured. Please go to Settings.' },
        { status: 400 }
      );
    }

    // Get entries and validate
    const worklogs: { entryId: number; worklog: WorklogInput }[] = [];
    const skipped: { entryId: number; reason: string }[] = [];

    for (const entryId of entryIds) {
      const entry = getEntry(entryId);

      if (!entry) {
        skipped.push({ entryId, reason: 'Entry not found' });
        continue;
      }

      if (!entry.jira_issue) {
        skipped.push({ entryId, reason: 'No Jira issue assigned' });
        continue;
      }

      if (entry.status === 'pushed') {
        skipped.push({ entryId, reason: 'Already pushed' });
        continue;
      }

      worklogs.push({
        entryId,
        worklog: {
          issueKey: entry.jira_issue,
          timeSpentMinutes: entry.duration_minutes + (entry.context_minutes || 0),
          startedDate: entry.date,
          comment: entry.title,
        },
      });
    }

    if (worklogs.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid entries to push',
        skipped,
      });
    }

    // Push to Jira
    const result = await pushWorklogs(
      creds,
      worklogs.map((w) => w.worklog)
    );

    // Update entry statuses based on results
    const pushedAt = new Date().toISOString();
    const successfulIds: number[] = [];
    const failedEntries: { entryId: number; error: string }[] = [];

    result.results.forEach((r, index) => {
      const entryId = worklogs[index].entryId;
      if (r.result.success) {
        successfulIds.push(entryId);
      } else {
        failedEntries.push({ entryId, error: r.result.error || 'Unknown error' });
      }
    });

    // Bulk update successful entries
    if (successfulIds.length > 0) {
      bulkUpdateEntries(successfulIds, { status: 'pushed', pushed_at: pushedAt });
    }

    // Build response - partial success is still success, but with warnings
    const hasFailures = failedEntries.length > 0;
    const hasSuccesses = successfulIds.length > 0;

    // Only fail completely if nothing succeeded
    const success = hasSuccesses;

    // Build error message for any failures
    let error: string | undefined;
    if (hasFailures) {
      const failureMessages = failedEntries.map(f => `Entry ${f.entryId}: ${f.error}`);
      error = `${failedEntries.length} entries failed to push:\n${failureMessages.join('\n')}`;
    }

    return NextResponse.json({
      success,
      pushed: result.pushed,
      failed: result.failed,
      skipped: skipped.length,
      failedEntries,
      skippedEntries: skipped,
      error,
    });
  } catch (error) {
    console.error('Error pushing to Jira:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to push to Jira' },
      { status: 500 }
    );
  } finally {
    isPushInProgress = false;
  }
}
