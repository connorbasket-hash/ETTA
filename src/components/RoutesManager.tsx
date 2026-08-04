'use client';

import { useState, useCallback, useEffect, useMemo, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { IconPlus, IconTrash, IconCheck, IconX, IconLoader2, IconSearch } from '@tabler/icons-react';

interface Project {
  id: number;
  name: string;
}

interface TaskType {
  id: number;
  name: string;
}

interface UnifiedRoute {
  id: number;
  project_id: number | null;
  task_type_id: number | null;
  source_type: 'email' | 'meeting' | null;
  project_name: string | null;
  task_type_name: string | null;
  jira_key: string;
  jira_name: string;
  assigns_task_type_id: number | null;
  assigns_task_type_name: string | null;
}

interface RoutesManagerProps {
  projects: Project[];
  taskTypes: TaskType[];
}

export const RoutesManager = memo(function RoutesManager({ projects, taskTypes }: RoutesManagerProps) {
  const [routes, setRoutes] = useState<UnifiedRoute[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form state
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedTaskTypeId, setSelectedTaskTypeId] = useState<string>('');
  const [selectedSourceType, setSelectedSourceType] = useState<string>('');
  const [selectedAssignsTaskTypeId, setSelectedAssignsTaskTypeId] = useState<string>('');
  const [jiraKey, setJiraKey] = useState('');
  const [creating, setCreating] = useState(false);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProjectId, setFilterProjectId] = useState<string>('all');
  const [filterTaskTypeId, setFilterTaskTypeId] = useState<string>('all');
  const [filterSourceType, setFilterSourceType] = useState<string>('all');

  // Validation state
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    jira_name?: string;
    error?: string;
  } | null>(null);

  const fetchRoutes = useCallback(async () => {
    try {
      const res = await fetch('/api/routes');
      const data = await res.json();
      setRoutes(data.routes || []);
    } catch (error) {
      console.error('Failed to fetch routes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  // Validate Jira key when it changes
  useEffect(() => {
    if (!jiraKey.trim()) {
      setValidationResult(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setValidating(true);
      try {
        const res = await fetch('/api/jira/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jira_key: jiraKey.trim().toUpperCase() }),
        });
        const data = await res.json();
        setValidationResult(data);
      } catch {
        setValidationResult({ valid: false, error: 'Failed to validate' });
      } finally {
        setValidating(false);
      }
    }, 500); // Debounce 500ms

    return () => clearTimeout(timeoutId);
  }, [jiraKey]);

  // Clear assigns_task_type when task_type is selected
  useEffect(() => {
    if (selectedTaskTypeId) {
      setSelectedAssignsTaskTypeId('');
    }
  }, [selectedTaskTypeId]);

  const handleCreateRoute = useCallback(async () => {
    if (!jiraKey.trim() || !validationResult?.valid) {
      return;
    }

    // At least one of task_type_id or source_type must be provided
    if (!selectedTaskTypeId && !selectedSourceType) {
      alert('Please select either a Task Type or Source Type (or both)');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: selectedProjectId ? parseInt(selectedProjectId, 10) : null,
          task_type_id: selectedTaskTypeId ? parseInt(selectedTaskTypeId, 10) : null,
          source_type: selectedSourceType || null,
          jira_key: jiraKey.trim().toUpperCase(),
          assigns_task_type_id: selectedAssignsTaskTypeId ? parseInt(selectedAssignsTaskTypeId, 10) : null,
        }),
      });

      if (res.ok) {
        setSelectedProjectId('');
        setSelectedTaskTypeId('');
        setSelectedSourceType('');
        setSelectedAssignsTaskTypeId('');
        setJiraKey('');
        setValidationResult(null);
        await fetchRoutes();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create route');
      }
    } catch (error) {
      console.error('Failed to create route:', error);
      alert('Failed to create route');
    } finally {
      setCreating(false);
    }
  }, [selectedProjectId, selectedTaskTypeId, selectedSourceType, selectedAssignsTaskTypeId, jiraKey, validationResult, fetchRoutes]);

  const handleDeleteRoute = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/routes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchRoutes();
      }
    } catch (error) {
      console.error('Failed to delete route:', error);
    }
  }, [fetchRoutes]);

  // Determine if we can create
  const hasMatchCriteria = selectedTaskTypeId || selectedSourceType;
  const canCreate = hasMatchCriteria && jiraKey.trim() && validationResult?.valid && !creating;

  // Helper to calculate priority number for sorting
  const getPriorityNumber = (route: UnifiedRoute): number => {
    if (route.project_id && route.task_type_id && route.source_type) return 1;
    if (route.project_id && route.task_type_id) return 2;
    if (route.project_id && route.source_type) return 3;
    if (!route.project_id && route.source_type) return 4;
    return 99;
  };

  // Filter routes based on search and filters, then sort by priority
  const filteredRoutes = useMemo(() => {
    return routes
      .filter((route) => {
        // Search filter - check jira key, jira name, project name, task type name
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const matchesSearch =
            route.jira_key.toLowerCase().includes(query) ||
            route.jira_name.toLowerCase().includes(query) ||
            (route.project_name && route.project_name.toLowerCase().includes(query)) ||
            (route.task_type_name && route.task_type_name.toLowerCase().includes(query)) ||
            (route.source_type && route.source_type.toLowerCase().includes(query)) ||
            (route.assigns_task_type_name && route.assigns_task_type_name.toLowerCase().includes(query));
          if (!matchesSearch) return false;
        }

        // Project filter
        if (filterProjectId !== 'all') {
          if (filterProjectId === '__none__' && route.project_id !== null) {
            return false;
          } else if (filterProjectId !== '__none__' && route.project_id?.toString() !== filterProjectId) {
            return false;
          }
        }

        // Task type filter
        if (filterTaskTypeId !== 'all') {
          if (route.task_type_id?.toString() !== filterTaskTypeId) {
            return false;
          }
        }

        // Source type filter
        if (filterSourceType !== 'all') {
          if (route.source_type !== filterSourceType) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => getPriorityNumber(a) - getPriorityNumber(b));
  }, [routes, searchQuery, filterProjectId, filterTaskTypeId, filterSourceType]);

  // Helper to get route priority info
  const getRoutePriority = (route: UnifiedRoute): { priority: number; label: string; className: string } => {
    if (route.project_id && route.task_type_id && route.source_type) {
      return { priority: 1, label: 'Combined', className: 'bg-violet-100 text-violet-700' };
    } else if (route.project_id && route.task_type_id) {
      return { priority: 2, label: 'Standard', className: 'bg-blue-100 text-blue-700' };
    } else if (route.project_id && route.source_type) {
      return { priority: 3, label: 'Project Fallback', className: 'bg-amber-100 text-amber-700' };
    } else if (!route.project_id && route.source_type) {
      return { priority: 4, label: 'Global Fallback', className: 'bg-slate-200 text-slate-600' };
    } else {
      return { priority: 99, label: 'Unknown', className: 'bg-red-100 text-red-700' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Create New Route */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Create New Route</CardTitle>
          <p className="text-base text-slate-500 mt-2">
            Map criteria to a Jira issue for automatic assignment. Select at least one of Task Type or Source Type.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-start">
            <Select value={selectedProjectId} onValueChange={(v) => setSelectedProjectId(v === '__none__' ? '' : v)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Project (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id.toString()}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedTaskTypeId} onValueChange={(v) => setSelectedTaskTypeId(v === '__none__' ? '' : v)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Task type (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {taskTypes.map((t) => (
                  <SelectItem key={t.id} value={t.id.toString()}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedSourceType} onValueChange={(v) => setSelectedSourceType(v === '__none__' ? '' : v)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Source (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex flex-col gap-1">
              <div className="flex gap-2 items-center">
                <Input
                  placeholder="JIRA-123 *"
                  value={jiraKey}
                  onChange={(e) => setJiraKey(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && canCreate && handleCreateRoute()}
                  className="w-36"
                />
                {validating && (
                  <IconLoader2 className="w-5 h-5 text-slate-400 animate-spin" />
                )}
                {!validating && validationResult?.valid && (
                  <IconCheck className="w-5 h-5 text-green-500" />
                )}
                {!validating && validationResult && !validationResult.valid && (
                  <IconX className="w-5 h-5 text-red-500" />
                )}
              </div>
              {validationResult?.valid && validationResult.jira_name && (
                <span className="text-xs text-green-600 truncate max-w-48">
                  {validationResult.jira_name}
                </span>
              )}
              {validationResult && !validationResult.valid && validationResult.error && (
                <span className="text-xs text-red-500">
                  {validationResult.error}
                </span>
              )}
            </div>

            {/* Show "Assigns Task Type" only when task_type is not selected but source_type is */}
            {!selectedTaskTypeId && selectedSourceType && (
              <Select value={selectedAssignsTaskTypeId} onValueChange={(v) => setSelectedAssignsTaskTypeId(v === '__none__' ? '' : v)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Assigns task type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {taskTypes.map((t) => (
                    <SelectItem key={t.id} value={t.id.toString()}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button
              onClick={handleCreateRoute}
              disabled={!canCreate}
              size="icon"
              title="Create route"
            >
              {creating ? (
                <IconLoader2 className="w-5 h-5 animate-spin" />
              ) : (
                <IconPlus className="w-5 h-5" />
              )}
            </Button>
          </div>
          {!hasMatchCriteria && jiraKey.trim() && (
            <p className="text-amber-600 text-sm mt-2">
              Please select at least one of Task Type or Source Type
            </p>
          )}
        </CardContent>
      </Card>

      {/* Existing Routes */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl">Routes ({filteredRoutes.length}{filteredRoutes.length !== routes.length ? ` of ${routes.length}` : ''})</CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                More specific routes (lower #) are matched first before falling back to broader ones.
              </p>
            </div>
          </div>
          {routes.length > 0 && (
            <div className="flex flex-wrap gap-3 items-center mt-4">
              <div className="relative">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search routes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <Select value={filterProjectId} onValueChange={setFilterProjectId}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All projects</SelectItem>
                  <SelectItem value="__none__">No project</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterTaskTypeId} onValueChange={setFilterTaskTypeId}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All task types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All task types</SelectItem>
                  {taskTypes.map((t) => (
                    <SelectItem key={t.id} value={t.id.toString()}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterSourceType} onValueChange={setFilterSourceType}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="All sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                </SelectContent>
              </Select>
              {(searchQuery || filterProjectId !== 'all' || filterTaskTypeId !== 'all' || filterSourceType !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterProjectId('all');
                    setFilterTaskTypeId('all');
                    setFilterSourceType('all');
                  }}
                  className="text-slate-500 hover:text-slate-700"
                >
                  Clear filters
                </Button>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <IconLoader2 className="w-6 h-6 text-slate-400 animate-spin" />
            </div>
          ) : routes.length === 0 ? (
            <p className="text-slate-400 text-sm py-4">
              No routes configured yet. Create one above.
            </p>
          ) : filteredRoutes.length === 0 ? (
            <p className="text-slate-400 text-sm py-4">
              No routes match your filters.
            </p>
          ) : (
            <div>
              <div className="flex items-center font-semibold text-base text-slate-700">
                <div className="w-16 p-4 text-center">#</div>
                <div className="flex-1 p-4">Project</div>
                <div className="flex-1 p-4">Task Type</div>
                <div className="w-28 p-4">Source</div>
                <div className="flex-[2] p-4">Jira Issue</div>
                <div className="flex-1 p-4">Assigns</div>
                <div className="w-20 p-4"></div>
              </div>
              {filteredRoutes.map((route) => {
                const priorityInfo = getRoutePriority(route);
                return (
                <div key={route.id} className="flex items-center hover:bg-slate-50 transition-colors border-t border-slate-100">
                  <div className="w-16 p-4 text-center">
                    <span className="text-slate-600 font-medium">{priorityInfo.priority}</span>
                  </div>
                  <div className="flex-1 p-4">
                    {route.project_name ? (
                      <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        {route.project_name}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-sm">Any</span>
                    )}
                  </div>
                  <div className="flex-1 p-4">
                    {route.task_type_name ? (
                      <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                        {route.task_type_name}
                      </span>
                    ) : null}
                  </div>
                  <div className="w-28 p-4">
                    {route.source_type ? (
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        route.source_type === 'meeting'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-cyan-100 text-cyan-700'
                      }`}>
                        {route.source_type}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex-[2] p-4">
                    <span className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                      {route.jira_key}
                    </span>
                    <span className="text-slate-500 ml-2 text-sm">{route.jira_name}</span>
                  </div>
                  <div className="flex-1 p-4">
                    {route.assigns_task_type_name ? (
                      <span className="inline-flex items-center px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm font-medium">
                        {route.assigns_task_type_name}
                      </span>
                    ) : null}
                  </div>
                  <div className="w-20 p-4 flex items-center justify-center">
                    <button
                      onClick={() => handleDeleteRoute(route.id)}
                      title="Delete route"
                      className="size-9 aspect-square rounded-full bg-slate-100 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <IconTrash className="w-4 h-4 text-slate-600" />
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
});
