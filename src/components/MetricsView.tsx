'use client';

import { useState, useCallback, useEffect, useMemo, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangePicker } from '@/components/DateRangePicker';
import { IconLoader2, IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface Route {
  id: number;
  project_id: number | null;
  task_type_id: number | null;
  source_type: 'email' | 'meeting' | null;
  jira_key: string;
  jira_name: string;
  project_name: string | null;
  task_type_name: string | null;
}

interface Entry {
  id: number;
  source_id: number | null;
  source_type: 'email' | 'meeting' | 'manual';
  title: string;
  date: string;
  start_time: string | null;
  duration_minutes: number;
  context_minutes: number;
  jira_issue: string | null;
  project: string | null;
  task_type: string | null;
  status: 'pending' | 'pushed' | 'excluded';
  pushed_at: string | null;
  created_at: string;
}

interface ProjectMetrics {
  projectName: string;
  totalMinutes: number;
  untrackedMinutes: number;
  pushedMinutes: number;
  taskTypes: {
    taskTypeName: string;
    totalMinutes: number;
    untrackedMinutes: number;
    pushedMinutes: number;
    entryCount: number;
  }[];
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export const MetricsView = memo(function MetricsView() {
  // Date range state - initialize empty to avoid hydration mismatch, set in useEffect
  const [metricsStartDate, setMetricsStartDate] = useState<string>('');
  const [metricsEndDate, setMetricsEndDate] = useState<string>('');

  // Initialize dates on client side to avoid hydration mismatch
  useEffect(() => {
    if (!metricsStartDate) {
      const saved = localStorage.getItem('metricsStartDate');
      if (saved) {
        setMetricsStartDate(saved);
      } else {
        const today = new Date();
        setMetricsStartDate(formatDate(new Date(today.getFullYear(), today.getMonth(), 1)));
      }
    }
    if (!metricsEndDate) {
      const saved = localStorage.getItem('metricsEndDate');
      if (saved) {
        setMetricsEndDate(saved);
      } else {
        setMetricsEndDate(formatDate(new Date()));
      }
    }
  }, []);

  // Data state
  const [entries, setEntries] = useState<Entry[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // UI state for collapsible sections
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  // Chart filter state
  const [selectedChartProjects, setSelectedChartProjects] = useState<Set<string>>(new Set());
  const [cumulativeChart, setCumulativeChart] = useState<boolean>(true);

  // Calculate chart granularity based on date range
  const chartGranularity = useMemo((): 'hourly' | 'daily' | 'weekly' | 'monthly' => {
    const start = new Date(metricsStartDate);
    const end = new Date(metricsEndDate);

    // Calculate days difference
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff <= 7) return 'hourly';

    // Calculate months difference
    const monthsDiff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());

    if (monthsDiff <= 1) return 'daily';
    if (monthsDiff <= 6) return 'weekly';
    return 'monthly';
  }, [metricsStartDate, metricsEndDate]);

  // Fetch entries
  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (metricsStartDate) params.append('startDate', metricsStartDate);
      if (metricsEndDate) params.append('endDate', metricsEndDate);
      const res = await fetch(`/api/entries?${params}`);
      const data = await res.json();
      setEntries(data.entries || []);
    } catch (error) {
      console.error('Failed to fetch entries:', error);
    } finally {
      setLoading(false);
    }
  }, [metricsStartDate, metricsEndDate]);

  // Fetch routes on mount
  const fetchRoutes = useCallback(async () => {
    try {
      const res = await fetch('/api/routes');
      const data = await res.json();
      setRoutes(data.routes || []);
    } catch (error) {
      console.error('Failed to fetch routes:', error);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
    fetchRoutes();
  }, [fetchEntries, fetchRoutes]);

  // Persist dates to localStorage (skip if empty/initializing)
  useEffect(() => {
    if (metricsStartDate) localStorage.setItem('metricsStartDate', metricsStartDate);
    if (metricsEndDate) localStorage.setItem('metricsEndDate', metricsEndDate);
  }, [metricsStartDate, metricsEndDate]);

  // Aggregate metrics by project and task type (excluding excluded entries)
  const aggregatedMetrics = useMemo(() => {
    const projectMap = new Map<string, Map<string, { minutes: number; untrackedMinutes: number; pushedMinutes: number; count: number }>>();

    for (const entry of entries) {
      if (entry.status === 'excluded') continue;
      const projectKey = entry.project || 'Unassigned';
      const taskTypeKey = entry.task_type || 'Unassigned';

      if (!projectMap.has(projectKey)) {
        projectMap.set(projectKey, new Map());
      }

      const taskTypeMap = projectMap.get(projectKey)!;
      if (!taskTypeMap.has(taskTypeKey)) {
        taskTypeMap.set(taskTypeKey, { minutes: 0, untrackedMinutes: 0, pushedMinutes: 0, count: 0 });
      }

      const current = taskTypeMap.get(taskTypeKey)!;
      current.minutes += entry.duration_minutes;
      current.count += 1;

      // Track hours without Jira issue assigned
      if (!entry.jira_issue) {
        current.untrackedMinutes += entry.duration_minutes;
      }

      // Track hours that have been pushed
      if (entry.status === 'pushed') {
        current.pushedMinutes += entry.duration_minutes;
      }
    }

    // Convert to array and sort
    const result: ProjectMetrics[] = [];
    for (const [projectName, taskTypeMap] of projectMap) {
      const taskTypes: ProjectMetrics['taskTypes'] = [];
      let projectTotal = 0;
      let projectUntracked = 0;
      let projectPushed = 0;

      for (const [taskTypeName, data] of taskTypeMap) {
        taskTypes.push({
          taskTypeName,
          totalMinutes: data.minutes,
          untrackedMinutes: data.untrackedMinutes,
          pushedMinutes: data.pushedMinutes,
          entryCount: data.count,
        });
        projectTotal += data.minutes;
        projectUntracked += data.untrackedMinutes;
        projectPushed += data.pushedMinutes;
      }

      // Sort task types by hours descending
      taskTypes.sort((a, b) => b.totalMinutes - a.totalMinutes);

      result.push({
        projectName,
        totalMinutes: projectTotal,
        untrackedMinutes: projectUntracked,
        pushedMinutes: projectPushed,
        taskTypes,
      });
    }

    // Sort projects: "Unassigned" last, others by hours descending
    result.sort((a, b) => {
      if (a.projectName === 'Unassigned') return 1;
      if (b.projectName === 'Unassigned') return -1;
      return b.totalMinutes - a.totalMinutes;
    });

    return result;
  }, [entries]);

  // Compute chart data grouped by project with dynamic granularity
  const periodChartData = useMemo(() => {
    // Group entries by period and project
    const periodMap = new Map<string, Map<string, number>>();
    const projectSet = new Set<string>();

    // Helper to get period key based on granularity
    const getPeriodKey = (date: Date, startTime: string | null): string => {
      if (chartGranularity === 'hourly') {
        // Group by hour - use start_time if available, otherwise use noon
        const hour = startTime ? parseInt(startTime.split(':')[0], 10) : 12;
        return `${formatDate(date)}T${String(hour).padStart(2, '0')}:00`;
      } else if (chartGranularity === 'daily') {
        return formatDate(date);
      } else if (chartGranularity === 'weekly') {
        // Get week start (Monday)
        const dayOfWeek = date.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - daysToMonday);
        return formatDate(weekStart);
      } else {
        // Monthly - first of month
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
      }
    };

    // Helper to format date label for display
    const formatDateLabel = (dateKey: string): string => {
      if (chartGranularity === 'hourly') {
        const [datePart, timePart] = dateKey.split('T');
        const date = new Date(datePart);
        const hour = parseInt(timePart.split(':')[0], 10);
        const ampm = hour >= 12 ? 'pm' : 'am';
        const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return `${date.getMonth() + 1}/${date.getDate()} ${hour12}${ampm}`;
      }
      const date = new Date(dateKey);
      if (chartGranularity === 'monthly') {
        return `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      }
      return `${date.getMonth() + 1}/${date.getDate()}`;
    };

    for (const entry of entries) {
      if (entry.status === 'excluded') continue;

      const projectKey = entry.project || 'Unassigned';
      projectSet.add(projectKey);

      const entryDate = new Date(entry.date);
      const periodKey = getPeriodKey(entryDate, entry.start_time);

      if (!periodMap.has(periodKey)) {
        periodMap.set(periodKey, new Map());
      }

      const projectMap = periodMap.get(periodKey)!;
      const currentMinutes = projectMap.get(projectKey) || 0;
      projectMap.set(projectKey, currentMinutes + entry.duration_minutes);
    }

    // Get all periods sorted
    const allPeriods = Array.from(periodMap.keys()).sort();
    if (allPeriods.length === 0) {
      return { chartData: [], projects: [] };
    }

    const projects = Array.from(projectSet).sort((a, b) => {
      if (a === 'Unassigned') return 1;
      if (b === 'Unassigned') return -1;
      return a.localeCompare(b);
    });

    const chartData = allPeriods.map(periodKey => {
      const data: Record<string, string | number> = {
        date: formatDateLabel(periodKey),
      };

      const projectMinutes = periodMap.get(periodKey)!;
      let totalMinutes = 0;
      for (const project of projects) {
        const mins = projectMinutes.get(project) || 0;
        totalMinutes += mins;
        // Convert minutes to hours
        data[project] = Number((mins / 60).toFixed(1));
      }
      // Add total
      data['Total'] = Number((totalMinutes / 60).toFixed(1));

      return data;
    });

    return { chartData, projects };
  }, [entries, chartGranularity]);

  // Compute cumulative chart data
  const cumulativeChartData = useMemo(() => {
    if (periodChartData.chartData.length === 0) return [];

    const cumulative: Record<string, number> = {};
    periodChartData.projects.forEach(p => cumulative[p] = 0);
    cumulative['Total'] = 0;

    return periodChartData.chartData.map(week => {
      const data: Record<string, string | number> = { date: week.date };

      periodChartData.projects.forEach(project => {
        cumulative[project] += (week[project] as number) || 0;
        data[project] = Number(cumulative[project].toFixed(1));
      });

      cumulative['Total'] += (week['Total'] as number) || 0;
      data['Total'] = Number(cumulative['Total'].toFixed(1));

      return data;
    });
  }, [periodChartData]);

  // Color palette for projects
  const projectColors = useMemo(() => {
    const colors = [
      '#3b82f6', // blue
      '#10b981', // emerald
      '#f59e0b', // amber
      '#ef4444', // red
      '#8b5cf6', // violet
      '#ec4899', // pink
      '#06b6d4', // cyan
      '#84cc16', // lime
      '#f97316', // orange
      '#6366f1', // indigo
    ];

    const colorMap: Record<string, string> = {};
    periodChartData.projects.forEach((project, index) => {
      if (project === 'Unassigned') {
        colorMap[project] = '#94a3b8'; // slate for unassigned
      } else {
        colorMap[project] = colors[index % colors.length];
      }
    });

    return colorMap;
  }, [periodChartData.projects]);

  // Filter projects for chart display
  const filteredChartProjects = useMemo(() => {
    if (selectedChartProjects.size === 0) {
      return periodChartData.projects;
    }
    return periodChartData.projects.filter(p => selectedChartProjects.has(p));
  }, [periodChartData.projects, selectedChartProjects]);

  const toggleChartProject = (project: string) => {
    setSelectedChartProjects(prev => {
      const next = new Set(prev);
      if (next.has(project)) {
        next.delete(project);
      } else {
        next.add(project);
      }
      return next;
    });
  };

  const clearChartFilter = () => {
    setSelectedChartProjects(new Set());
  };

  // Create lookup maps for jira_key
  const { specificLookup, projectFallbackLookup } = useMemo(() => {
    const specific = new Map<string, string>();
    const fallback = new Map<string, string>();

    for (const route of routes) {
      if (route.project_name && route.task_type_name) {
        // Specific project + task type route
        const key = `${route.project_name}|${route.task_type_name}`;
        specific.set(key, route.jira_key);
      } else if (route.project_name && !route.task_type_name) {
        // Project-level fallback (no task type specified)
        // Only set if not already set (first one wins)
        if (!fallback.has(route.project_name)) {
          fallback.set(route.project_name, route.jira_key);
        }
      }
    }
    return { specificLookup: specific, projectFallbackLookup: fallback };
  }, [routes]);

  // Helper to get jira_key for a project/task type combination (with fallback)
  const getJiraForRoute = (projectName: string, taskTypeName: string): string | null => {
    // First try specific project + task type match
    const specificKey = `${projectName}|${taskTypeName}`;
    const specific = specificLookup.get(specificKey);
    if (specific) return specific;

    // Fall back to project-level route
    return projectFallbackLookup.get(projectName) || null;
  };

  const activeEntries = useMemo(() => {
    return entries.filter(entry => entry.status !== 'excluded');
  }, [entries]);

  const grandTotalMinutes = useMemo(() => {
    return activeEntries.reduce((sum, entry) => sum + entry.duration_minutes, 0);
  }, [activeEntries]);

  const grandTotalUntrackedMinutes = useMemo(() => {
    return activeEntries
      .filter(entry => !entry.jira_issue)
      .reduce((sum, entry) => sum + entry.duration_minutes, 0);
  }, [activeEntries]);

  const grandTotalPushedMinutes = useMemo(() => {
    return activeEntries
      .filter(entry => entry.status === 'pushed')
      .reduce((sum, entry) => sum + entry.duration_minutes, 0);
  }, [activeEntries]);

  const toggleProjectExpanded = (projectName: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectName)) {
        next.delete(projectName);
      } else {
        next.add(projectName);
      }
      return next;
    });
  };

  return (
    <div className="space-y-8">
      {/* Date Range Selection */}
      <DateRangePicker
        startDate={metricsStartDate}
        endDate={metricsEndDate}
        onStartDateChange={setMetricsStartDate}
        onEndDateChange={setMetricsEndDate}
        showAllTime
      />

      {/* Weekly Hours Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">
                {chartGranularity === 'hourly' ? 'Hourly' : chartGranularity === 'daily' ? 'Daily' : chartGranularity === 'weekly' ? 'Weekly' : 'Monthly'} Hours by Project
              </CardTitle>
            <div className="flex items-center gap-4">
              {selectedChartProjects.size > 0 && (
                <button
                  onClick={clearChartFilter}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Clear filter
                </button>
              )}
              <button
                onClick={() => setCumulativeChart(!cumulativeChart)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  cumulativeChart
                    ? 'opacity-100'
                    : 'opacity-40'
                }`}
                style={{
                  backgroundColor: cumulativeChart ? '#3b82f620' : '#3b82f610',
                  color: '#3b82f6',
                  border: '1px solid #3b82f6',
                }}
              >
                Cumulative
              </button>
            </div>
          </div>
          {/* Project filter chips */}
          {periodChartData.projects.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {/* Total chip */}
              <button
                onClick={() => toggleChartProject('Total')}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedChartProjects.has('Total')
                    ? 'opacity-100'
                    : 'opacity-40'
                }`}
                style={{
                  backgroundColor: selectedChartProjects.has('Total') ? '#00000020' : '#00000010',
                  color: '#000000',
                  border: '1px solid #000000',
                }}
              >
                Total
              </button>
              {periodChartData.projects.map((project) => (
                <button
                  key={project}
                  onClick={() => toggleChartProject(project)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedChartProjects.size === 0 || selectedChartProjects.has(project)
                      ? 'opacity-100'
                      : 'opacity-40'
                  }`}
                  style={{
                    backgroundColor: `${projectColors[project]}20`,
                    color: projectColors[project],
                    border: `1px solid ${projectColors[project]}`,
                  }}
                >
                  {project}
                </button>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <IconLoader2 className="w-6 h-6 text-slate-400 animate-spin" />
            </div>
          ) : periodChartData.chartData.length === 0 ? (
            <p className="text-slate-400 text-sm py-4">
              No data for this date range.
            </p>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cumulativeChart ? cumulativeChartData : periodChartData.chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                  />
                  <YAxis
                    type="number"
                    scale="linear"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    label={{ value: 'Hours', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      // Sort by value descending
                      const sorted = [...payload].sort((a, b) => (b.value as number) - (a.value as number));
                      return (
                        <div style={{
                          backgroundColor: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          fontSize: '12px',
                        }}>
                          <div style={{ fontWeight: 600, marginBottom: '4px' }}>{label}</div>
                          {sorted.map((entry) => (
                            <div key={entry.dataKey} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 0' }}>
                              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: entry.color, flexShrink: 0 }} />
                              <span style={{ color: '#64748b' }}>{entry.dataKey}:</span>
                              <span style={{ fontWeight: 500 }}>{entry.value}h</span>
                            </div>
                          ))}
                        </div>
                      );
                    }}
                  />
                  {/* Total line - shown when selected */}
                  {selectedChartProjects.has('Total') && (
                    <Line
                      key="Total"
                      type="monotone"
                      dataKey="Total"
                      stroke="#000000"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  )}
                  {filteredChartProjects.map((project) => (
                    <Line
                      key={project}
                      type="monotone"
                      dataKey={project}
                      stroke={projectColors[project]}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metrics Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Time Distribution</CardTitle>
          <p className="text-base text-slate-500 mt-2">
            {activeEntries.length} entries | {formatDuration(grandTotalMinutes)} total
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <IconLoader2 className="w-6 h-6 text-slate-400 animate-spin" />
            </div>
          ) : entries.length === 0 ? (
            <p className="text-slate-400 text-sm py-4">
              No entries for this date range.
            </p>
          ) : (
            <div>
              {/* Header Row */}
              <div className="flex items-center font-semibold text-base text-slate-700">
                <div className="w-12 p-4"></div>
                <div className="flex-1 p-4">Category</div>
                <div className="w-32 p-4">Jira</div>
                <div className="w-28 p-4 text-right">Hours</div>
                <div className="w-28 p-4 text-right">Untracked</div>
                <div className="w-28 p-4 text-right">Pushed</div>
                <div className="w-28 p-4 text-right">Delta</div>
              </div>

              {/* Project Rows */}
              {aggregatedMetrics.map((project) => (
                <div key={project.projectName}>
                  {/* Project Header Row */}
                  <div
                    className="flex items-center hover:bg-slate-50 border-t border-slate-200 cursor-pointer transition-colors"
                    onClick={() => toggleProjectExpanded(project.projectName)}
                  >
                    <div className="w-12 p-4 flex items-center justify-center">
                      {expandedProjects.has(project.projectName) ? (
                        <IconChevronDown className="w-5 h-5 text-slate-400" />
                      ) : (
                        <IconChevronRight className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 p-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        project.projectName === 'Unassigned'
                          ? 'bg-slate-200 text-slate-600'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {project.projectName}
                      </span>
                    </div>
                    <div className="w-32 p-4"></div>
                    <div className="w-28 p-4 text-right font-semibold">
                      {formatDuration(project.totalMinutes)}
                    </div>
                    <div className="w-28 p-4 text-right font-semibold">
                      {formatDuration(project.untrackedMinutes)}
                    </div>
                    <div className="w-28 p-4 text-right font-semibold">
                      {formatDuration(project.pushedMinutes)}
                    </div>
                    <div className="w-28 p-4 text-right">
                      {(() => {
                        const delta = project.totalMinutes - project.pushedMinutes;
                        return delta > 0 ? (
                          <span className="text-red-700 font-bold">{formatDuration(delta)}</span>
                        ) : (
                          <span>{formatDuration(0)}</span>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Task Type Rows (collapsible) */}
                  {expandedProjects.has(project.projectName) && (
                    project.taskTypes.map((taskType) => (
                      <div
                        key={`${project.projectName}-${taskType.taskTypeName}`}
                        className="flex items-center hover:bg-slate-50 border-t border-slate-100 transition-colors"
                      >
                        <div className="w-12 p-4"></div>
                        <div className="flex-1 p-4 pl-12">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            taskType.taskTypeName === 'Unassigned'
                              ? 'bg-slate-200 text-slate-600'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {taskType.taskTypeName}
                          </span>
                        </div>
                        <div className="w-32 p-4">
                          {(() => {
                            const jiraKey = getJiraForRoute(project.projectName, taskType.taskTypeName);
                            return jiraKey ? (
                              <Badge variant="purple-light" className="text-xs px-2 py-0.5">
                                {jiraKey}
                              </Badge>
                            ) : null;
                          })()}
                        </div>
                        <div className="w-28 p-4 text-right">
                          {formatDuration(taskType.totalMinutes)}
                        </div>
                        <div className="w-28 p-4 text-right">
                          {formatDuration(taskType.untrackedMinutes)}
                        </div>
                        <div className="w-28 p-4 text-right">
                          {formatDuration(taskType.pushedMinutes)}
                        </div>
                        <div className="w-28 p-4 text-right">
                          {(() => {
                            const delta = taskType.totalMinutes - taskType.pushedMinutes;
                            return delta > 0 ? (
                              <span className="text-red-700 font-bold">{formatDuration(delta)}</span>
                            ) : (
                              <span>{formatDuration(0)}</span>
                            );
                          })()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ))}

              {/* Grand Total Row */}
              <div className="flex items-center font-semibold border-t border-slate-300">
                <div className="w-12 p-4"></div>
                <div className="flex-1 p-4 text-slate-700">Grand Total</div>
                <div className="w-32 p-4"></div>
                <div className="w-28 p-4 text-right text-slate-900">
                  {formatDuration(grandTotalMinutes)}
                </div>
                <div className="w-28 p-4 text-right text-slate-900">
                  {formatDuration(grandTotalUntrackedMinutes)}
                </div>
                <div className="w-28 p-4 text-right text-slate-900">
                  {formatDuration(grandTotalPushedMinutes)}
                </div>
                <div className="w-28 p-4 text-right">
                  {(() => {
                    const delta = grandTotalMinutes - grandTotalPushedMinutes;
                    return delta > 0 ? (
                      <span className="text-red-700 font-bold">{formatDuration(delta)}</span>
                    ) : (
                      <span>{formatDuration(0)}</span>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
});
