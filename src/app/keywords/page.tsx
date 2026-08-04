'use client';

import { useState, useEffect, useCallback, useMemo, memo } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { IconPencil } from '@tabler/icons-react';
import Link from 'next/link';
import { DateRangePicker } from '@/components/DateRangePicker';
import { ProjectTaskTypes } from '@/components/ProjectTaskTypes';
import { NavTabs } from '@/components/NavTabs';
import { useSharedData } from '@/lib/data-context';

// ============== TYPES ==============

interface Keyword {
  id: number;
  word: string;
  frequency: number;
  source_type: 'subject' | 'body' | 'both';
  assigned_projects: { id: number; name: string }[];
  assigned_task_types: { id: number; name: string }[];
}

interface Project {
  id: number;
  name: string;
  keyword_count: number;
  keywords?: string[];
  emailPatterns?: string[];
}

interface TaskType {
  id: number;
  name: string;
  keyword_count: number;
  keywords?: string[];
}

interface Favorite {
  id: number;
  jira_key: string;
  jira_name: string;
  short_name: string | null;
}

// ============== HELPERS ==============

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDefaultDates() {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 1);
  return { start: formatDate(start), end: formatDate(end) };
}

// ============== KEYWORD ROW COMPONENT ==============

const KeywordRow = memo(function KeywordRow({
  kw,
  isSelected,
  onToggle,
  onEdit,
}: {
  kw: Keyword;
  isSelected: boolean;
  onToggle: (id: number) => void;
  onEdit: (kw: Keyword) => void;
}) {
  return (
    <div className="flex items-center hover:bg-slate-50 h-[60px] border-t border-slate-100">
      <div className="w-14 p-4 flex items-center justify-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggle(kw.id)}
          className="w-5 h-5 rounded"
        />
      </div>
      <div className="flex-1 p-4 font-medium text-base truncate flex items-center">{kw.word}</div>
      <div className="w-20 p-4 text-base flex items-center justify-center">{kw.frequency}</div>
      <div className="w-24 p-4 flex items-center">
        <span className={`text-sm px-3 py-1 rounded-full font-medium ${kw.source_type === 'subject' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'}`}>
          {kw.source_type === 'subject' ? 'Subject' : 'Body'}
        </span>
      </div>
      <div className="w-40 p-4 overflow-hidden flex items-center">
        {kw.assigned_projects.length > 0 && (
          <div className="flex flex-wrap gap-1 overflow-hidden max-h-[40px]">
            {kw.assigned_projects.map((p) => (
              <span
                key={`p-${p.id}`}
                className="inline-flex items-center px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"
              >
                {p.name}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="w-40 p-4 overflow-hidden flex items-center">
        {kw.assigned_task_types.length > 0 && (
          <div className="flex flex-wrap gap-1 overflow-hidden max-h-[40px]">
            {kw.assigned_task_types.map((t) => (
              <span
                key={`t-${t.id}`}
                className="inline-flex items-center px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium"
              >
                {t.name}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="w-20 p-4 flex items-center justify-center">
        <button
          onClick={() => onEdit(kw)}
          title="Edit assignments"
          className="size-9 aspect-square rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer"
        >
          <IconPencil className="w-4 h-4 text-slate-600" />
        </button>
      </div>
    </div>
  );
});

// ============== MAIN COMPONENT ==============

export default function KeywordsPage() {
  // ============== SHARED STATE FROM CONTEXT ==============
  const {
    projects,
    taskTypes,
    favorites,
    refreshProjects: loadProjects,
    refreshTaskTypes: loadTaskTypes,
    refreshFavorites: loadFavorites
  } = useSharedData();

  // Import state - initialize empty to avoid hydration mismatch, set in useEffect
  const [importStartDate, setImportStartDate] = useState('');
  const [importEndDate, setImportEndDate] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    emails: number;
    meetings: number;
    newItems: number;
    duplicates: number;
    subjectKeywords: number;
    bodyKeywords: number;
    error?: string;
  } | null>(null);
  const [importProgress, setImportProgress] = useState<{
    stage: string;
    percent: number;
    detail?: string;
    newItems?: number;
    duplicates?: number;
  } | null>(null);

  const [outlookNeedsConnect, setOutlookNeedsConnect] = useState(false);

  // Initialize dates on client side to avoid hydration mismatch
  useEffect(() => {
    const defaultDates = getDefaultDates();
    if (!importStartDate) setImportStartDate(defaultDates.start);
    if (!importEndDate) setImportEndDate(defaultDates.end);
  }, []);

  useEffect(() => {
    async function loadOutlookStatus() {
      try {
        const res = await fetch('/api/outlook/status');
        const data = await res.json();
        const needsGraph = data.backend === 'graph';
        setOutlookNeedsConnect(needsGraph && (!data.configured || !data.connected));
      } catch {
        setOutlookNeedsConnect(false);
      }
    }
    loadOutlookStatus();
  }, []);

  // ============== KEYWORD BUILDER STATE ==============
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [keywordsLoading, setKeywordsLoading] = useState(false);
  const [keywordSearch, setKeywordSearch] = useState('');
  const [debouncedKeywordSearch, setDebouncedKeywordSearch] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'subject' | 'body'>('all');
  const [selectedKeywords, setSelectedKeywords] = useState<Set<number>>(new Set());
  const [keywordsPage, setKeywordsPage] = useState(0);
  const KEYWORDS_PER_PAGE = 50;
  const [editingKeyword, setEditingKeyword] = useState<Keyword | null>(null);

  // Project/Task Type editing
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingTaskType, setEditingTaskType] = useState<TaskType | null>(null);
  const [editingProjectName, setEditingProjectName] = useState('');
  const [editingTaskTypeName, setEditingTaskTypeName] = useState('');
  const [newKeywordForProject, setNewKeywordForProject] = useState('');
  const [newKeywordForTaskType, setNewKeywordForTaskType] = useState('');
  const [newEmailPatternForProject, setNewEmailPatternForProject] = useState('');

  // Create mode for projects/task types
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isCreatingTaskType, setIsCreatingTaskType] = useState(false);
  const [creatingProjectName, setCreatingProjectName] = useState('');
  const [creatingTaskTypeName, setCreatingTaskTypeName] = useState('');

  // Favorite editing
  const [editingFavorite, setEditingFavorite] = useState<Favorite | null>(null);
  const [editingFavoriteShortName, setEditingFavoriteShortName] = useState('');

  // Sticky detection for floating card
  const [isProjectCardSticky, setIsProjectCardSticky] = useState(false);
  const [sentinelElement, setSentinelElement] = useState<HTMLDivElement | null>(null);

  // Source stats for import info display
  const [sourceStats, setSourceStats] = useState<{
    totalCount: number;
    emailCount: number;
    meetingCount: number;
    dateRangeStart: string | null;
    dateRangeEnd: string | null;
    lastImportedAt: string | null;
    lastImportDateRangeStart: string | null;
    lastImportDateRangeEnd: string | null;
  } | null>(null);

  // ============== DATA LOADERS ==============

  const loadKeywords = useCallback(async () => {
    setKeywordsLoading(true);
    try {
      const res = await fetch('/api/keywords');
      const data = await res.json();
      setKeywords(data.keywords || []);
    } catch (error) {
      console.error('Failed to load keywords:', error);
    } finally {
      setKeywordsLoading(false);
    }
  }, []);

  const loadSourceStats = useCallback(async () => {
    try {
      const res = await fetch('/api/sources/stats');
      const data = await res.json();
      setSourceStats(data);
    } catch (error) {
      console.error('Failed to load source stats:', error);
    }
  }, []);

  // Load keywords and source stats on mount (projects/taskTypes/favorites come from context)
  useEffect(() => {
    loadKeywords();
    loadSourceStats();
  }, [loadKeywords, loadSourceStats]);

  // Debounce keyword search for smooth filtering
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeywordSearch(keywordSearch);
    }, 150);
    return () => clearTimeout(timer);
  }, [keywordSearch]);

  // Detect when the sticky card is actually stuck
  useEffect(() => {
    if (!sentinelElement) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // When the sentinel is not visible (scrolled past), the card is stuck
        setIsProjectCardSticky(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: '-17px 0px 0px 0px' } // Account for top-4 (16px) + 1px buffer
    );

    observer.observe(sentinelElement);
    return () => observer.disconnect();
  }, [sentinelElement]);

  // ============== FILTERED KEYWORDS ==============

  const filteredKeywords = useMemo(() => {
    let filtered = keywords;

    if (debouncedKeywordSearch.trim()) {
      const search = debouncedKeywordSearch.toLowerCase().trim();
      filtered = filtered.filter((kw) => kw.word.toLowerCase().includes(search));
    }

    if (sourceFilter !== 'all') {
      filtered = filtered.filter((kw) => kw.source_type === sourceFilter || kw.source_type === 'both');
    }

    if (assignmentFilter === 'unassigned') {
      filtered = filtered.filter(
        (kw) => kw.assigned_projects.length === 0 && kw.assigned_task_types.length === 0
      );
    } else if (assignmentFilter === 'assigned') {
      filtered = filtered.filter(
        (kw) => kw.assigned_projects.length > 0 || kw.assigned_task_types.length > 0
      );
    }

    return filtered;
  }, [keywords, debouncedKeywordSearch, sourceFilter, assignmentFilter]);

  // Paginated keywords - only render a subset
  const paginatedKeywords = useMemo(() => {
    const start = keywordsPage * KEYWORDS_PER_PAGE;
    return filteredKeywords.slice(start, start + KEYWORDS_PER_PAGE);
  }, [filteredKeywords, keywordsPage]);

  const totalPages = Math.ceil(filteredKeywords.length / KEYWORDS_PER_PAGE);

  // ============== HANDLERS ==============

  const handleImport = useCallback(async () => {
    if (!importStartDate || !importEndDate) {
      setImportResult({ emails: 0, meetings: 0, newItems: 0, duplicates: 0, subjectKeywords: 0, bodyKeywords: 0, error: 'Please select start and end dates' });
      return;
    }

    setImporting(true);
    setImportResult(null);
    setImportProgress({ stage: 'Starting import...', percent: 0 });

    try {

      const res = await fetch('/api/sources/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate: importStartDate, endDate: importEndDate, types: ['email', 'meeting'] }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || contentType.includes('application/json')) {
        const data = await res.json().catch(() => ({}));
        setImportResult({
          emails: 0,
          meetings: 0,
          newItems: 0,
          duplicates: 0,
          subjectKeywords: 0,
          bodyKeywords: 0,
          error: data.error || `Import failed (${res.status})`,
        });
        setImportProgress(null);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'progress') {
                // Use server-provided percent directly (never goes backwards)
                const percent = data.percent ?? 0;

                setImportProgress({
                  stage: data.message || 'Processing...',
                  percent,
                  newItems: data.newItems,
                  duplicates: data.duplicates
                });
              } else if (data.type === 'complete') {
                if (data.success) {
                  const emailCount = data.counts?.email || 0;
                  const meetingCount = data.counts?.meeting || 0;
                  const newItems = data.newItems || 0;
                  const duplicates = data.duplicates || 0;

                  // Auto-analyze after successful import - DO NOT clear existing keywords
                  let subjectCount = 0;
                  let bodyCount = 0;

                  const streamAnalyze = async (scope: 'subjects' | 'bodies') => {
                    const res = await fetch('/api/keywords/analyze', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ scope, minFrequency: 2, clearExisting: false, startDate: importStartDate, endDate: importEndDate }),
                    });

                    const reader = res.body?.getReader();
                    const decoder = new TextDecoder();

                    if (reader) {
                      while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const chunk = decoder.decode(value);
                        const lines = chunk.split('\n');

                        for (const line of lines) {
                          if (line.startsWith('data: ')) {
                            try {
                              const eventData = JSON.parse(line.slice(6));
                              if (eventData.type === 'progress' && eventData.stage === 'saving') {
                                if (scope === 'subjects') {
                                  subjectCount = eventData.processed || 0;
                                } else {
                                  bodyCount = eventData.processed || 0;
                                }
                                const analyzePercent = scope === 'subjects' ? 96 : 98;
                                setImportProgress({
                                  stage: 'Analyzing keywords...',
                                  percent: analyzePercent,
                                  detail: `${subjectCount} subject, ${bodyCount} body keywords`
                                });
                              } else if (eventData.type === 'complete') {
                                if (scope === 'subjects') {
                                  subjectCount = eventData.total || 0;
                                } else {
                                  bodyCount = eventData.total || 0;
                                }
                              }
                            } catch {
                              // Ignore parse errors
                            }
                          }
                        }
                      }
                    }
                  };

                  try {
                    setImportProgress({ stage: 'Analyzing subject keywords...', percent: 96 });
                    await streamAnalyze('subjects');
                    setImportProgress({ stage: 'Analyzing body keywords...', percent: 98, detail: `${subjectCount} subject keywords found` });
                    await streamAnalyze('bodies');

                    await Promise.all([
                      loadKeywords(),
                      loadProjects(),
                      loadTaskTypes(),
                      loadSourceStats()
                    ]);
                    setImportResult({
                      emails: emailCount,
                      meetings: meetingCount,
                      newItems,
                      duplicates,
                      subjectKeywords: subjectCount,
                      bodyKeywords: bodyCount
                    });
                    setImportProgress(null);
                  } catch {
                    // Keyword analysis failed but import succeeded - still refresh stats
                    await loadSourceStats();
                    setImportResult({
                      emails: emailCount,
                      meetings: meetingCount,
                      newItems,
                      duplicates,
                      subjectKeywords: 0,
                      bodyKeywords: 0
                    });
                    setImportProgress(null);
                  }
                } else {
                  setImportResult({ emails: 0, meetings: 0, newItems: 0, duplicates: 0, subjectKeywords: 0, bodyKeywords: 0, error: data.error || 'Unknown error' });
                  setImportProgress(null);
                }
              } else if (data.type === 'error') {
                setImportResult({ emails: 0, meetings: 0, newItems: 0, duplicates: 0, subjectKeywords: 0, bodyKeywords: 0, error: data.error });
                setImportProgress(null);
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch {
      setImportResult({ emails: 0, meetings: 0, newItems: 0, duplicates: 0, subjectKeywords: 0, bodyKeywords: 0, error: 'Failed to import' });
      setImportProgress(null);
    } finally {
      setImporting(false);
      // Always refresh stats after import attempt
      loadSourceStats();
    }
  }, [importStartDate, importEndDate, loadKeywords, loadProjects, loadTaskTypes, loadSourceStats]);

  const handleBulkAssignToProject = useCallback(async (projectId: string) => {
    if (selectedKeywords.size === 0) return;

    const selectedWords = keywords
      .filter(kw => selectedKeywords.has(kw.id))
      .map(kw => kw.word);

    await Promise.all(
      selectedWords.map(word =>
        fetch(`/api/projects/${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ addKeyword: word }),
        })
      )
    );

    setSelectedKeywords(new Set());
    await Promise.all([loadProjects(), loadKeywords()]);
  }, [selectedKeywords, keywords, loadProjects, loadKeywords]);

  const handleBulkAssignToTaskType = useCallback(async (taskTypeId: string) => {
    if (selectedKeywords.size === 0) return;

    const selectedWords = keywords
      .filter(kw => selectedKeywords.has(kw.id))
      .map(kw => kw.word);

    await Promise.all(
      selectedWords.map(word =>
        fetch(`/api/task-types/${taskTypeId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ addKeyword: word }),
        })
      )
    );

    setSelectedKeywords(new Set());
    await Promise.all([loadTaskTypes(), loadKeywords()]);
  }, [selectedKeywords, keywords, loadTaskTypes, loadKeywords]);

  const openCreateProject = useCallback(() => {
    setCreatingProjectName('');
    setIsCreatingProject(true);
  }, []);

  const handleCreateProject = useCallback(async () => {
    if (!creatingProjectName.trim()) return;
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: creatingProjectName.trim() }),
    });
    if (res.ok) {
      setIsCreatingProject(false);
      setCreatingProjectName('');
      loadProjects();
    }
  }, [creatingProjectName, loadProjects]);

  const openCreateTaskType = useCallback(() => {
    setCreatingTaskTypeName('');
    setIsCreatingTaskType(true);
  }, []);

  const handleCreateTaskType = useCallback(async () => {
    if (!creatingTaskTypeName.trim()) return;
    const res = await fetch('/api/task-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: creatingTaskTypeName.trim() }),
    });
    if (res.ok) {
      setIsCreatingTaskType(false);
      setCreatingTaskTypeName('');
      loadTaskTypes();
    }
  }, [creatingTaskTypeName, loadTaskTypes]);

  const openProjectEditor = useCallback(async (project: Project) => {
    const res = await fetch(`/api/projects/${project.id}`);
    const data = await res.json();
    setEditingProject({ ...project, keywords: data.keywords || [], emailPatterns: data.emailPatterns || [] });
    setEditingProjectName(project.name);
    setNewKeywordForProject('');
    setNewEmailPatternForProject('');
  }, []);

  const openTaskTypeEditor = useCallback(async (taskType: TaskType) => {
    const res = await fetch(`/api/task-types/${taskType.id}`);
    const data = await res.json();
    setEditingTaskType({ ...taskType, keywords: data.keywords || [] });
    setEditingTaskTypeName(taskType.name);
    setNewKeywordForTaskType('');
  }, []);

  const openFavoriteEditor = useCallback((favorite: Favorite) => {
    setEditingFavorite(favorite);
    setEditingFavoriteShortName(favorite.short_name || '');
  }, []);

  const handleUpdateProjectName = useCallback(async () => {
    if (!editingProject || !editingProjectName.trim()) return;

    const res = await fetch(`/api/projects/${editingProject.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editingProjectName.trim() }),
    });

    if (res.ok) {
      const data = await res.json();
      setEditingProject({ ...editingProject, name: data.name, keywords: data.keywords || [] });
      loadProjects();
    }
  }, [editingProject, editingProjectName, loadProjects]);

  const handleUpdateTaskTypeName = useCallback(async () => {
    if (!editingTaskType || !editingTaskTypeName.trim()) return;

    const res = await fetch(`/api/task-types/${editingTaskType.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editingTaskTypeName.trim() }),
    });

    if (res.ok) {
      const data = await res.json();
      setEditingTaskType({ ...editingTaskType, name: data.name, keywords: data.keywords || [] });
      loadTaskTypes();
    }
  }, [editingTaskType, editingTaskTypeName, loadTaskTypes]);

  const handleAddProjectKeyword = useCallback(async () => {
    if (!editingProject || !newKeywordForProject.trim()) return;

    const res = await fetch(`/api/projects/${editingProject.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addKeyword: newKeywordForProject.trim() }),
    });

    if (res.ok) {
      const data = await res.json();
      setEditingProject({ ...editingProject, keywords: data.keywords || [] });
      setNewKeywordForProject('');
      loadProjects();
    }
  }, [editingProject, newKeywordForProject, loadProjects]);

  const handleRemoveProjectKeyword = useCallback(async (keyword: string) => {
    if (!editingProject) return;

    const res = await fetch(`/api/projects/${editingProject.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ removeKeyword: keyword }),
    });

    if (res.ok) {
      const data = await res.json();
      setEditingProject({ ...editingProject, keywords: data.keywords || [] });
      loadProjects();
    }
  }, [editingProject, loadProjects]);

  const handleAddProjectEmailPattern = useCallback(async () => {
    if (!editingProject || !newEmailPatternForProject.trim()) return;

    const res = await fetch(`/api/projects/${editingProject.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addEmailPattern: newEmailPatternForProject.trim() }),
    });

    if (res.ok) {
      const data = await res.json();
      setEditingProject({ ...editingProject, emailPatterns: data.emailPatterns || [] });
      setNewEmailPatternForProject('');
    }
  }, [editingProject, newEmailPatternForProject]);

  const handleRemoveProjectEmailPattern = useCallback(async (pattern: string) => {
    if (!editingProject) return;

    const res = await fetch(`/api/projects/${editingProject.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ removeEmailPattern: pattern }),
    });

    if (res.ok) {
      const data = await res.json();
      setEditingProject({ ...editingProject, emailPatterns: data.emailPatterns || [] });
    }
  }, [editingProject]);

  const handleAddTaskTypeKeyword = useCallback(async () => {
    if (!editingTaskType || !newKeywordForTaskType.trim()) return;

    const res = await fetch(`/api/task-types/${editingTaskType.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addKeyword: newKeywordForTaskType.trim() }),
    });

    if (res.ok) {
      const data = await res.json();
      setEditingTaskType({ ...editingTaskType, keywords: data.keywords || [] });
      setNewKeywordForTaskType('');
      loadTaskTypes();
    }
  }, [editingTaskType, newKeywordForTaskType, loadTaskTypes]);

  const handleRemoveTaskTypeKeyword = useCallback(async (keyword: string) => {
    if (!editingTaskType) return;

    const res = await fetch(`/api/task-types/${editingTaskType.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ removeKeyword: keyword }),
    });

    if (res.ok) {
      const data = await res.json();
      setEditingTaskType({ ...editingTaskType, keywords: data.keywords || [] });
      loadTaskTypes();
    }
  }, [editingTaskType, loadTaskTypes]);

  const saveFavoriteShortName = useCallback(async () => {
    if (!editingFavorite) return;

    await fetch(`/api/favorites/${editingFavorite.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ short_name: editingFavoriteShortName.trim() || null }),
    });

    setEditingFavorite(null);
    loadFavorites();
  }, [editingFavorite, editingFavoriteShortName, loadFavorites]);

  const toggleKeyword = useCallback((id: number) => {
    setSelectedKeywords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const clearKeywordSelection = useCallback(() => {
    setSelectedKeywords(new Set());
  }, []);

  const projectSelectItems = useMemo(() => (
    projects.map((p) => (
      <SelectItem key={p.id} value={String(p.id)}>
        {p.name}
      </SelectItem>
    ))
  ), [projects]);

  const taskTypeSelectItems = useMemo(() => (
    taskTypes.map((t) => (
      <SelectItem key={t.id} value={String(t.id)}>
        {t.name}
      </SelectItem>
    ))
  ), [taskTypes]);

  // ============== RENDER ==============

  return (
    <div className="container mx-auto p-8 lg:p-12 max-w-7xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-bold">Timekeeper</h1>
        <Link href="/settings" prefetch={true}>
          <Button variant="secondary">Settings</Button>
        </Link>
      </div>

      {/* Navigation Tabs */}
      <NavTabs />

      {/* Keyword Builder Content */}
      <div className="space-y-8">
        {outlookNeedsConnect && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="py-4">
              <p className="text-base text-amber-900">
                Outlook is not connected. Open{' '}
                <Link href="/settings" className="font-medium underline">
                  Settings
                </Link>{' '}
                to add your Azure Client ID and sign in with Microsoft 365 before importing.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Import Section - Single Row */}
        <DateRangePicker
          startDate={importStartDate}
          endDate={importEndDate}
          onStartDateChange={setImportStartDate}
          onEndDateChange={setImportEndDate}
          lastImportEndDate={sourceStats?.dateRangeEnd?.split('T')[0]}
        >
          <Button onClick={handleImport} disabled={importing || outlookNeedsConnect}>
            {importing ? 'Importing...' : 'Import'}
          </Button>
        </DateRangePicker>

        {/* Import Progress */}
        {importProgress && (
          <Card>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-base text-slate-600">
                  <span>{importProgress.stage}</span>
                  <span>{importProgress.percent}%</span>
                </div>
                <Progress value={importProgress.percent} className="h-3" />
                {importProgress.detail && (
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>{importProgress.detail}</span>
                    <span>
                      {importProgress.newItems !== undefined && (
                        <span className="text-green-600">{importProgress.newItems} new</span>
                      )}
                      {importProgress.duplicates !== undefined && importProgress.duplicates > 0 && (
                        <span className="text-yellow-600 ml-2">{importProgress.duplicates} skipped</span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Import Error */}
        {importResult && !importProgress && importResult.error && (
          <Card>
            <CardContent>
              <p className="text-base text-red-600">{importResult.error}</p>
            </CardContent>
          </Card>
        )}

        {/* Combined Stats Section */}
        {!importProgress && ((sourceStats?.totalCount ?? 0) > 0 || (importResult && !importResult.error)) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Imported Data</CardTitle>
              {sourceStats?.lastImportedAt && (
                <p className="text-sm text-slate-500 mt-1">
                  Last import: {(() => {
                    const date = new Date(sourceStats.lastImportedAt + 'Z');
                    return date.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    }) + ', ' + date.toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit'
                    });
                  })()}
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Last Scan Results (if available) */}
              {importResult && !importResult.error && (
                <div className="bg-slate-100 rounded-xl p-5">
                  <p className="text-sm font-medium text-slate-600 mb-3">Last Scan Results</p>
                  <div className="grid grid-cols-5 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-slate-800">{importResult.emails + importResult.meetings}</p>
                      <p className="text-xs text-slate-500 font-medium">Total Scanned</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{importResult.emails}</p>
                      <p className="text-xs text-slate-500 font-medium">Emails</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{importResult.meetings}</p>
                      <p className="text-xs text-slate-500 font-medium">Meetings</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-emerald-600">{importResult.newItems}</p>
                      <p className="text-xs text-slate-500 font-medium">Added</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-slate-400">{importResult.duplicates}</p>
                      <p className="text-xs text-slate-500 font-medium">Skipped</p>
                    </div>
                  </div>
                  {(importResult.subjectKeywords > 0 || importResult.bodyKeywords > 0) && (
                    <div className="flex items-center gap-3 text-sm text-slate-600 pt-4 mt-4 border-t border-slate-200">
                      <span className="text-slate-500">Keywords found:</span>
                      <span className="bg-white/60 px-2 py-0.5 rounded font-medium">{importResult.subjectKeywords} subject</span>
                      <span className="bg-white/60 px-2 py-0.5 rounded font-medium">{importResult.bodyKeywords} body</span>
                    </div>
                  )}
                </div>
              )}

              {/* Overall Stats */}
              {sourceStats && sourceStats.totalCount > 0 ? (
                <div className="grid grid-cols-5 gap-4">
                  <div className="bg-slate-100 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-slate-800">{sourceStats.totalCount}</p>
                    <p className="text-sm font-medium text-slate-500 mt-1">Total Items</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-blue-600">{sourceStats.emailCount}</p>
                    <p className="text-sm font-medium text-slate-500 mt-1">Emails</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-green-600">{sourceStats.meetingCount}</p>
                    <p className="text-sm font-medium text-slate-500 mt-1">Meetings</p>
                  </div>
                  <div className="col-span-2 bg-blue-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-slate-500 mb-1">Data Range</p>
                    <p className="text-xl font-semibold text-slate-800">
                      {sourceStats.dateRangeStart && sourceStats.dateRangeEnd
                        ? (() => {
                            const parseDate = (s: string) => {
                              const dateOnly = s.includes('T') ? s.split('T')[0] : s.split(' ')[0];
                              return new Date(dateOnly + 'T00:00:00');
                            };
                            const start = parseDate(sourceStats.dateRangeStart);
                            const end = parseDate(sourceStats.dateRangeEnd);
                            const formatShort = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                            return `${formatShort(start)} – ${formatShort(end)}`;
                          })()
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              ) : !importResult && (
                <div className="bg-slate-50 rounded-lg p-8 text-center">
                  <p className="text-slate-500">No data imported yet.</p>
                  <p className="text-slate-400 text-sm mt-1">Select a date range and click Import to get started.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Empty State - only show when nothing imported and no recent import */}
        {!importProgress && !importResult && (!sourceStats || sourceStats.totalCount === 0) && (
          <Card>
            <CardContent>
              <div className="bg-slate-50 rounded-lg p-8 text-center">
                <p className="text-slate-500">No data imported yet.</p>
                <p className="text-slate-400 text-sm mt-1">Select a date range and click Import to get started.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Projects, Task Types & Favorites */}
        <div ref={setSentinelElement} className="h-0" aria-hidden="true" />
        <div className={`sticky top-4 z-10 rounded-xl transition-shadow duration-200 ${
          isProjectCardSticky ? 'shadow-[0_8px_40px_-4px_rgba(59,130,246,0.25)]' : ''
        }`}>
          <ProjectTaskTypes
            projects={projects}
            taskTypes={taskTypes}
            favorites={favorites}
            onProjectCreate={openCreateProject}
            onProjectEdit={openProjectEditor}
            onTaskTypeCreate={openCreateTaskType}
            onTaskTypeEdit={openTaskTypeEditor}
            onFavoriteEdit={openFavoriteEditor}
          />
        </div>

        {/* Keywords Table */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-xl">Keywords</CardTitle>
                  <p className="text-base text-slate-500 mt-2">Assign to Projects or Task Types ({filteredKeywords.length})</p>
                </div>
                <div className="flex gap-4 items-center">
                  <Input
                    type="text"
                    placeholder="Search keywords..."
                    value={keywordSearch}
                    onChange={(e) => setKeywordSearch(e.target.value)}
                    className="w-56"
                  />
                  <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as 'all' | 'subject' | 'body')}>
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sources</SelectItem>
                      <SelectItem value="subject">Subject</SelectItem>
                      <SelectItem value="body">Body</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={assignmentFilter} onValueChange={(v) => setAssignmentFilter(v as 'all' | 'assigned' | 'unassigned')}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {selectedKeywords.size > 0 && (
                <div className="mb-6 p-4 bg-blue-50 rounded-2xl flex gap-4 items-center flex-wrap">
                  <span className="text-base font-medium">{selectedKeywords.size} selected</span>
                  <Select
                    value="__select__"
                    onValueChange={(v) => {
                      if (v !== '__select__') {
                        handleBulkAssignToProject(v);
                      }
                    }}
                  >
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Add to Project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__select__" disabled>Add to Project</SelectItem>
                      {projectSelectItems}
                    </SelectContent>
                  </Select>
                  <Select
                    value="__select__"
                    onValueChange={(v) => {
                      if (v !== '__select__') {
                        handleBulkAssignToTaskType(v);
                      }
                    }}
                  >
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Add to Task" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__select__" disabled>Add to Task</SelectItem>
                      {taskTypeSelectItems}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    onClick={clearKeywordSelection}
                  >
                    Clear
                  </Button>
                </div>
              )}

              <div className="rounded-2xl overflow-hidden">
                <div className="flex items-center font-medium text-base text-slate-500">
                  <div className="w-14 p-4 flex items-center justify-center"></div>
                  <div className="flex-1 p-4 flex items-center">Word</div>
                  <div className="w-20 p-4 flex items-center justify-center">Count</div>
                  <div className="w-24 p-4 flex items-center">Source</div>
                  <div className="w-40 p-4 flex items-center">Project</div>
                  <div className="w-40 p-4 flex items-center">Task</div>
                  <div className="w-20 p-4"></div>
                </div>
                <div className="h-[500px] overflow-auto">
                  {keywordsLoading ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="flex flex-col items-center gap-3 text-slate-500">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span>Loading keywords...</span>
                      </div>
                    </div>
                  ) : filteredKeywords.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-500">
                      {keywords.length === 0 ? 'No keywords yet. Import entries to extract keywords.' : 'No keywords match the current filters.'}
                    </div>
                  ) : (
                    <div>
                      {paginatedKeywords.map((kw) => (
                        <KeywordRow
                          key={kw.id}
                          kw={kw}
                          isSelected={selectedKeywords.has(kw.id)}
                          onToggle={toggleKeyword}
                          onEdit={setEditingKeyword}
                        />
                      ))}
                    </div>
                  )}
                </div>
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 py-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setKeywordsPage(p => Math.max(0, p - 1))}
                      disabled={keywordsPage === 0}
                      className="text-slate-600 hover:text-slate-900"
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-slate-500 flex items-center">
                      {keywordsPage * KEYWORDS_PER_PAGE + 1}-{Math.min((keywordsPage + 1) * KEYWORDS_PER_PAGE, filteredKeywords.length)} of {filteredKeywords.length}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setKeywordsPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={keywordsPage >= totalPages - 1}
                      className="text-slate-600 hover:text-slate-900"
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
      </div>

      {/* ============== DIALOGS ============== */}

      {/* Create Project Dialog */}
      <Dialog open={isCreatingProject} onOpenChange={setIsCreatingProject}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Create Project</DialogTitle>
            <DialogDescription className="text-base">
              Enter a name for the new project.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-3">
              <Label htmlFor="new-project-name" className="text-base">Project Name</Label>
              <Input
                id="new-project-name"
                value={creatingProjectName}
                onChange={(e) => setCreatingProjectName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                placeholder="Enter project name..."
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreatingProject(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateProject} disabled={!creatingProjectName.trim()}>
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Task Type Dialog */}
      <Dialog open={isCreatingTaskType} onOpenChange={setIsCreatingTaskType}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Create Task Type</DialogTitle>
            <DialogDescription className="text-base">
              Enter a name for the new task type.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-3">
              <Label htmlFor="new-task-type-name" className="text-base">Task Type Name</Label>
              <Input
                id="new-task-type-name"
                value={creatingTaskTypeName}
                onChange={(e) => setCreatingTaskTypeName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateTaskType()}
                placeholder="Enter task type name..."
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreatingTaskType(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTaskType} disabled={!creatingTaskTypeName.trim()}>
              Create Task Type
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Project Editor Dialog */}
      <Dialog open={!!editingProject} onOpenChange={(open) => !open && setEditingProject(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Edit Project</DialogTitle>
            <DialogDescription className="text-base">
              Manage project settings, keywords, and email patterns.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-8 py-6">
            <div className="grid gap-3">
              <Label htmlFor="project-name" className="text-base">Project Name</Label>
              <div className="flex gap-3">
                <Input
                  id="project-name"
                  value={editingProjectName}
                  onChange={(e) => setEditingProjectName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUpdateProjectName()}
                  className="flex-1"
                />
                <Button onClick={handleUpdateProjectName}>
                  Save
                </Button>
              </div>
            </div>

            <div className="grid gap-3">
              <Label htmlFor="project-keyword" className="text-base">Keywords</Label>
              <div className="flex gap-3">
                <Input
                  id="project-keyword"
                  placeholder="Enter a keyword..."
                  value={newKeywordForProject}
                  onChange={(e) => setNewKeywordForProject(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddProjectKeyword()}
                  className="flex-1"
                />
                <Button onClick={handleAddProjectKeyword} variant="secondary">
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 min-h-[52px] p-4 rounded-xl bg-slate-100">
                {editingProject?.keywords?.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                  >
                    {kw}
                    <button
                      onClick={() => handleRemoveProjectKeyword(kw)}
                      className="hover:text-red-600 transition-colors cursor-pointer"
                      aria-label={`Remove ${kw}`}
                    >
                      <span className="text-lg leading-none">&times;</span>
                    </button>
                  </span>
                ))}
                {(!editingProject?.keywords || editingProject.keywords.length === 0) && (
                  <span className="text-muted-foreground text-base">No keywords added</span>
                )}
              </div>
            </div>

            <div className="grid gap-3">
              <div className="space-y-2">
                <Label htmlFor="project-email-pattern" className="text-base">Email Patterns</Label>
                <p className="text-base text-muted-foreground">
                  Associate email addresses or domains (e.g., @ukg.com or john@example.com)
                </p>
              </div>
              <div className="flex gap-3">
                <Input
                  id="project-email-pattern"
                  placeholder="Enter email or domain..."
                  value={newEmailPatternForProject}
                  onChange={(e) => setNewEmailPatternForProject(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddProjectEmailPattern()}
                  className="flex-1"
                />
                <Button onClick={handleAddProjectEmailPattern} variant="secondary">
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 min-h-[52px] p-4 rounded-xl bg-slate-100">
                {editingProject?.emailPatterns?.map((pattern) => (
                  <span
                    key={pattern}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium"
                  >
                    {pattern}
                    <button
                      onClick={() => handleRemoveProjectEmailPattern(pattern)}
                      className="hover:text-red-600 transition-colors cursor-pointer"
                      aria-label={`Remove ${pattern}`}
                    >
                      <span className="text-lg leading-none">&times;</span>
                    </button>
                  </span>
                ))}
                {(!editingProject?.emailPatterns || editingProject.emailPatterns.length === 0) && (
                  <span className="text-muted-foreground text-base">No email patterns added</span>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task Type Editor Dialog */}
      <Dialog open={!!editingTaskType} onOpenChange={(open) => !open && setEditingTaskType(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Edit Task Type</DialogTitle>
            <DialogDescription className="text-base">
              Manage task type settings and keywords.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-8 py-6">
            <div className="grid gap-3">
              <Label htmlFor="task-type-name" className="text-base">Task Type Name</Label>
              <div className="flex gap-3">
                <Input
                  id="task-type-name"
                  value={editingTaskTypeName}
                  onChange={(e) => setEditingTaskTypeName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUpdateTaskTypeName()}
                  className="flex-1"
                />
                <Button onClick={handleUpdateTaskTypeName}>
                  Save
                </Button>
              </div>
            </div>

            <div className="grid gap-3">
              <Label htmlFor="task-type-keyword" className="text-base">Keywords</Label>
              <div className="flex gap-3">
                <Input
                  id="task-type-keyword"
                  placeholder="Enter a keyword..."
                  value={newKeywordForTaskType}
                  onChange={(e) => setNewKeywordForTaskType(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTaskTypeKeyword()}
                  className="flex-1"
                />
                <Button onClick={handleAddTaskTypeKeyword} variant="secondary">
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 min-h-[52px] p-4 rounded-xl bg-slate-100">
                {editingTaskType?.keywords?.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium"
                  >
                    {kw}
                    <button
                      onClick={() => handleRemoveTaskTypeKeyword(kw)}
                      className="hover:text-red-600 transition-colors cursor-pointer"
                      aria-label={`Remove ${kw}`}
                    >
                      <span className="text-lg leading-none">&times;</span>
                    </button>
                  </span>
                ))}
                {(!editingTaskType?.keywords || editingTaskType.keywords.length === 0) && (
                  <span className="text-muted-foreground text-base">No keywords added</span>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Favorite Editor Dialog */}
      <Dialog open={!!editingFavorite} onOpenChange={(open) => !open && setEditingFavorite(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Edit Favorite</DialogTitle>
            <DialogDescription className="text-base">
              Set a short name for quick identification. The Jira key and issue name cannot be changed.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label className="text-muted-foreground text-sm">Jira Issue</Label>
              <p className="font-medium text-base">{editingFavorite?.jira_key}</p>
            </div>

            <div className="grid gap-2">
              <Label className="text-muted-foreground text-sm">Issue Name (from Jira)</Label>
              <p className="text-sm text-slate-600">{editingFavorite?.jira_name}</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="short-name" className="text-base">Short Name (editable)</Label>
              <Input
                id="short-name"
                placeholder="e.g., Sprint Planning"
                value={editingFavoriteShortName}
                onChange={(e) => setEditingFavoriteShortName(e.target.value)}
              />
              <p className="text-xs text-slate-500">
                This name will be displayed instead of the Jira key for easier identification.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setEditingFavorite(null)}>
              Cancel
            </Button>
            <Button onClick={saveFavoriteShortName}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Keyword Assignment Editor Dialog */}
      <Dialog open={!!editingKeyword} onOpenChange={(open) => !open && setEditingKeyword(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Edit Keyword Assignments</DialogTitle>
            <DialogDescription className="text-base">
              Assign &quot;{editingKeyword?.word}&quot; to projects and task types.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid gap-3">
              <Label className="text-base">Projects</Label>
              <div className="flex flex-wrap gap-2 min-h-[44px] p-3 rounded-xl bg-slate-100">
                {editingKeyword?.assigned_projects.map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                  >
                    {p.name}
                    <button
                      onClick={async () => {
                        await fetch(`/api/projects/${p.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ removeKeyword: editingKeyword.word }),
                        });
                        setEditingKeyword({
                          ...editingKeyword,
                          assigned_projects: editingKeyword.assigned_projects.filter(proj => proj.id !== p.id)
                        });
                        loadKeywords();
                        loadProjects();
                      }}
                      className="hover:text-red-600 transition-colors cursor-pointer"
                    >
                      <span className="text-lg leading-none">&times;</span>
                    </button>
                  </span>
                ))}
                {(!editingKeyword?.assigned_projects || editingKeyword.assigned_projects.length === 0) && (
                  <span className="text-muted-foreground text-sm">No projects assigned</span>
                )}
              </div>
              <Select
                value=""
                onValueChange={async (projectId) => {
                  if (!editingKeyword || !projectId) return;
                  const project = projects.find(p => p.id === Number(projectId));
                  if (!project) return;
                  await fetch(`/api/projects/${projectId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ addKeyword: editingKeyword.word }),
                  });
                  setEditingKeyword({
                    ...editingKeyword,
                    assigned_projects: [...editingKeyword.assigned_projects, { id: project.id, name: project.name }]
                  });
                  loadKeywords();
                  loadProjects();
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Add to project..." />
                </SelectTrigger>
                <SelectContent>
                  {projects
                    .filter(p => !editingKeyword?.assigned_projects.some(ap => ap.id === p.id))
                    .map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3">
              <Label className="text-base">Task Types</Label>
              <div className="flex flex-wrap gap-2 min-h-[44px] p-3 rounded-xl bg-slate-100">
                {editingKeyword?.assigned_task_types.map((t) => (
                  <span
                    key={t.id}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium"
                  >
                    {t.name}
                    <button
                      onClick={async () => {
                        await fetch(`/api/task-types/${t.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ removeKeyword: editingKeyword.word }),
                        });
                        setEditingKeyword({
                          ...editingKeyword,
                          assigned_task_types: editingKeyword.assigned_task_types.filter(task => task.id !== t.id)
                        });
                        loadKeywords();
                        loadTaskTypes();
                      }}
                      className="hover:text-red-600 transition-colors cursor-pointer"
                    >
                      <span className="text-lg leading-none">&times;</span>
                    </button>
                  </span>
                ))}
                {(!editingKeyword?.assigned_task_types || editingKeyword.assigned_task_types.length === 0) && (
                  <span className="text-muted-foreground text-sm">No task types assigned</span>
                )}
              </div>
              <Select
                value=""
                onValueChange={async (taskTypeId) => {
                  if (!editingKeyword || !taskTypeId) return;
                  const taskType = taskTypes.find(t => t.id === Number(taskTypeId));
                  if (!taskType) return;
                  await fetch(`/api/task-types/${taskTypeId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ addKeyword: editingKeyword.word }),
                  });
                  setEditingKeyword({
                    ...editingKeyword,
                    assigned_task_types: [...editingKeyword.assigned_task_types, { id: taskType.id, name: taskType.name }]
                  });
                  loadKeywords();
                  loadTaskTypes();
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Add to task type..." />
                </SelectTrigger>
                <SelectContent>
                  {taskTypes
                    .filter(t => !editingKeyword?.assigned_task_types.some(at => at.id === t.id))
                    .map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => setEditingKeyword(null)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
