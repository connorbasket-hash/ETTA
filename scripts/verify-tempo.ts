import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = './data/keywords.db';
const db = new Database(path.resolve(DB_PATH));

interface Entry {
  id: number;
  title: string;
  date: string;
  duration_minutes: number;
  jira_issue: string | null;
  project: string | null;
  status: string;
  pushed_at: string | null;
}

interface Settings {
  jira_url?: string;
  jira_pat?: string;
}

interface Worklog {
  timeSpentSeconds: number;
  started: string;
  comment?: string;
  id: string;
  author?: { displayName?: string; name?: string };
}

// Get all pushed UKG entries for 2025-2026
const ukgEntries = db.prepare(`
  SELECT id, title, date, duration_minutes, jira_issue, project, status, pushed_at
  FROM entries
  WHERE project = 'UKG'
    AND status = 'pushed'
    AND date >= '2025-01-01'
    AND date <= '2026-12-31'
  ORDER BY date ASC
`).all() as Entry[];

console.log('=== UKG Pushed Entries (2025-2026) ===\n');
console.log(`Total entries: ${ukgEntries.length}`);

// Calculate total time
const totalMinutes = ukgEntries.reduce((sum, e) => sum + e.duration_minutes, 0);
const hours = Math.floor(totalMinutes / 60);
const minutes = totalMinutes % 60;
console.log(`Total time in database: ${hours}h ${minutes}m (${totalMinutes} minutes)\n`);

// Group by Jira issue
const byJira = new Map<string, { count: number; minutes: number; entries: Entry[] }>();
for (const entry of ukgEntries) {
  const key = entry.jira_issue || '(no jira)';
  if (!byJira.has(key)) {
    byJira.set(key, { count: 0, minutes: 0, entries: [] });
  }
  const group = byJira.get(key)!;
  group.count++;
  group.minutes += entry.duration_minutes;
  group.entries.push(entry);
}

console.log('=== Breakdown by Jira Issue ===\n');
for (const [jira, data] of byJira) {
  const h = Math.floor(data.minutes / 60);
  const m = data.minutes % 60;
  console.log(`${jira}: ${data.count} entries, ${h}h ${m}m`);
}

// Get Jira credentials
const settings = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
const settingsMap: Settings = {};
for (const s of settings) {
  (settingsMap as Record<string, string>)[s.key] = s.value;
}

if (!settingsMap.jira_url || !settingsMap.jira_pat) {
  console.log('\n⚠️  Jira credentials not configured. Cannot verify against Tempo.');
  process.exit(0);
}

async function fetchWorklogs(jiraKey: string): Promise<{ worklogs: Worklog[]; error?: string }> {
  const cleanBaseUrl = settingsMap.jira_url!.replace(/\/$/, '');
  const apiUrl = `${cleanBaseUrl}/rest/api/2/issue/${jiraKey}/worklog`;

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${settingsMap.jira_pat}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return { worklogs: [], error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { worklogs: data.worklogs || [] };
  } catch (error) {
    return { worklogs: [], error: String(error) };
  }
}

async function main() {
  console.log('\n=== Fetching Worklogs from Tempo ===\n');

  const jiraIssues = Array.from(byJira.keys()).filter(k => k !== '(no jira)');

  // Fetch all worklogs and build a lookup structure
  const allWorklogs = new Map<string, Worklog[]>(); // key: jiraKey|date, value: worklogs on that day

  for (const jiraKey of jiraIssues) {
    const { worklogs, error } = await fetchWorklogs(jiraKey);

    if (error) {
      console.log(`${jiraKey}: Error fetching - ${error}`);
      continue;
    }

    // Filter worklogs to 2025-2026 date range and index by date
    for (const w of worklogs) {
      const date = w.started.split('T')[0];
      if (date >= '2025-01-01' && date <= '2026-12-31') {
        const key = `${jiraKey}|${date}`;
        if (!allWorklogs.has(key)) {
          allWorklogs.set(key, []);
        }
        allWorklogs.get(key)!.push(w);
      }
    }

    console.log(`${jiraKey}: Fetched ${worklogs.length} worklogs`);
  }

  console.log('\n=== Verifying Each DB Entry Has Matching Tempo Worklog ===\n');

  const missing: Entry[] = [];
  const matched: Entry[] = [];
  let matchedMinutes = 0;

  for (const entry of ukgEntries) {
    if (!entry.jira_issue) {
      console.log(`Entry ${entry.id}: No Jira issue - skipping`);
      continue;
    }

    const date = entry.date.split('T')[0];
    const key = `${entry.jira_issue}|${date}`;
    const dayWorklogs = allWorklogs.get(key) || [];

    // Look for a worklog with matching duration (within 1 minute tolerance)
    const expectedSeconds = entry.duration_minutes * 60;
    const matchingWorklog = dayWorklogs.find(w => {
      const diffSeconds = Math.abs(w.timeSpentSeconds - expectedSeconds);
      return diffSeconds <= 60; // within 1 minute
    });

    if (matchingWorklog) {
      matched.push(entry);
      matchedMinutes += entry.duration_minutes;
      // Remove from pool to prevent double-matching
      const idx = dayWorklogs.indexOf(matchingWorklog);
      dayWorklogs.splice(idx, 1);
    } else {
      missing.push(entry);
    }
  }

  console.log(`Matched: ${matched.length} entries`);
  console.log(`Missing: ${missing.length} entries`);

  if (missing.length > 0) {
    console.log('\n=== Missing Entries (in DB as pushed but not found in Tempo) ===\n');
    for (const entry of missing) {
      const h = Math.floor(entry.duration_minutes / 60);
      const m = entry.duration_minutes % 60;
      console.log(`[${entry.date}] ${entry.jira_issue}: ${h}h ${m}m - "${entry.title.substring(0, 50)}..."`);
    }
  }

  console.log('\n=== Final Summary ===\n');
  const matchedH = Math.floor(matchedMinutes / 60);
  const matchedM = matchedMinutes % 60;
  console.log(`Database total:      ${hours}h ${minutes}m (${totalMinutes} minutes)`);
  console.log(`Verified in Tempo:   ${matchedH}h ${matchedM}m (${matchedMinutes} minutes)`);
  console.log(`Expected:            151h 5m (9065 minutes)`);

  if (missing.length === 0) {
    console.log('\n✓ All pushed entries verified in Tempo!');
  } else {
    const missingMinutes = missing.reduce((sum, e) => sum + e.duration_minutes, 0);
    const mH = Math.floor(missingMinutes / 60);
    const mM = missingMinutes % 60;
    console.log(`\n✗ ${missing.length} entries (${mH}h ${mM}m) not found in Tempo!`);
  }
}

main();
