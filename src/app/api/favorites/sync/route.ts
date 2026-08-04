import { NextResponse } from 'next/server';
import { getJiraCredentials, fetchJiraFavorites } from '@/lib/jira';
import { upsertFavoriteFromJira, getFavorites } from '@/lib/db';

export async function POST() {
  try {
    // Get Jira credentials from settings
    const creds = getJiraCredentials();

    if (!creds) {
      return NextResponse.json(
        { success: false, error: 'Jira credentials not configured. Please set up Jira connection in Settings.' },
        { status: 400 }
      );
    }

    // Fetch favorites from Jira
    const result = await fetchJiraFavorites(creds);

    if (!result.success || !result.favorites) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to fetch favorites from Jira' },
        { status: 500 }
      );
    }

    // Upsert each favorite
    let inserted = 0;
    let updated = 0;

    for (const fav of result.favorites) {
      const upsertResult = upsertFavoriteFromJira(fav.jiraKey, fav.jiraName);
      if (upsertResult.inserted) {
        inserted++;
      } else {
        updated++;
      }
    }

    // Return updated favorites list
    const favorites = getFavorites();

    return NextResponse.json({
      success: true,
      inserted,
      updated,
      total: result.favorites.length,
      favorites,
    });
  } catch (error) {
    console.error('Error syncing favorites:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sync favorites' },
      { status: 500 }
    );
  }
}
