import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.resolve('./data/keywords.db'));

// Get the pending entry
const entry = db.prepare(`
  SELECT id, title, date, duration_minutes, jira_issue
  FROM entries
  WHERE project = 'UKG'
    AND status = 'pending'
    AND date >= '2025-01-01'
    AND date <= '2026-01-20'
`).get() as { id: number; title: string; date: string; duration_minutes: number; jira_issue: string };

console.log('Pushing entry to Tempo:');
console.log(entry);

// Get Jira credentials
const jiraUrl = db.prepare("SELECT value FROM settings WHERE key = 'jira_url'").get() as { value: string };
const jiraPat = db.prepare("SELECT value FROM settings WHERE key = 'jira_pat'").get() as { value: string };

const cleanBaseUrl = jiraUrl.value.replace(/\/$/, '');

async function pushWorklog() {
  const apiUrl = `${cleanBaseUrl}/rest/api/2/issue/${entry.jira_issue}/worklog`;

  // Format time
  const hours = Math.floor(entry.duration_minutes / 60);
  const minutes = entry.duration_minutes % 60;
  let timeSpent = '';
  if (hours > 0) timeSpent += `${hours}h `;
  if (minutes > 0) timeSpent += `${minutes}m`;
  if (!timeSpent) timeSpent = '0m';

  const startedDateTime = `${entry.date.split('T')[0]}T09:00:00.000+0000`;

  const body = {
    timeSpent: timeSpent.trim(),
    started: startedDateTime,
    comment: entry.title,
  };

  console.log('\nPOST', apiUrl);
  console.log('Body:', body);

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jiraPat.value}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (response.ok) {
    const data = await response.json();
    console.log('\n✓ Worklog created! ID:', data.id);

    // Update entry status
    const now = new Date().toISOString();
    db.prepare("UPDATE entries SET status = 'pushed', pushed_at = ? WHERE id = ?").run(now, entry.id);
    console.log('✓ Entry marked as pushed');

    // Verify new totals
    const newTotal = db.prepare(`
      SELECT COUNT(*) as count, SUM(duration_minutes) as total
      FROM entries
      WHERE project = 'UKG'
        AND status = 'pushed'
        AND date >= '2025-01-01'
        AND date <= '2026-01-20'
    `).get() as { count: number; total: number };

    const h = Math.floor(newTotal.total / 60);
    const m = newTotal.total % 60;
    console.log(`\nNew UKG pushed total: ${newTotal.count} entries, ${h}h ${m}m`);
  } else {
    const errorText = await response.text();
    console.log('\n✗ Failed to create worklog');
    console.log('Status:', response.status, response.statusText);
    console.log('Error:', errorText);
  }
}

pushWorklog();
