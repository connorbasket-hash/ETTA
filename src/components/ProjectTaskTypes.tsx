'use client';

import { useState, useMemo, useEffect, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IconPlus, IconUpload } from '@tabler/icons-react';
import { DroppableBadge } from '@/components/dnd/DroppableBadge';

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

interface ProjectTaskTypesProps {
  projects: Project[];
  taskTypes: TaskType[];
  favorites: Favorite[];
  onProjectCreate: () => void;
  onProjectEdit: (project: Project) => void;
  onTaskTypeCreate: () => void;
  onTaskTypeEdit: (taskType: TaskType) => void;
  onFavoriteEdit: (favorite: Favorite) => void;
  selectedCount?: number;
  onPushToJira?: () => void;
  isPushing?: boolean;
}

export const ProjectTaskTypes = memo(function ProjectTaskTypes({
  projects,
  taskTypes,
  favorites,
  onProjectCreate,
  onProjectEdit,
  onTaskTypeCreate,
  onTaskTypeEdit,
  onFavoriteEdit,
  selectedCount = 0,
  onPushToJira,
  isPushing = false,
}: ProjectTaskTypesProps) {
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('classificationTab') || 'projects';
    }
    return 'projects';
  });

  // Persist tab selection
  useEffect(() => {
    localStorage.setItem('classificationTab', activeTab);
  }, [activeTab]);

  // Sort all items alphabetically
  const sortedProjects = useMemo(() =>
    [...projects].sort((a, b) => a.name.localeCompare(b.name)),
    [projects]
  );
  const sortedTaskTypes = useMemo(() =>
    [...taskTypes].sort((a, b) => a.name.localeCompare(b.name)),
    [taskTypes]
  );
  const sortedFavorites = useMemo(() =>
    [...favorites].sort((a, b) => {
      const aText = a.short_name || a.jira_name || a.jira_key;
      const bText = b.short_name || b.jira_name || b.jira_key;
      return aText.localeCompare(bText);
    }),
    [favorites]
  );

  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-slate-800">Classify Entries</h3>
            <p className="text-sm text-slate-500 mt-1">Drag entries to assign, or click to manage keywords</p>
          </div>
          {selectedCount > 0 && onPushToJira && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500">{selectedCount} selected</span>
              <Button onClick={onPushToJira} disabled={isPushing} className="bg-slate-900 hover:bg-slate-800">
                <IconUpload className="h-5 w-5 mr-2" />
                Push to Jira
              </Button>
            </div>
          )}
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between mb-6">
            <TabsList>
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="taskTypes">Task Types</TabsTrigger>
              <TabsTrigger value="favorites">Favorites</TabsTrigger>
            </TabsList>

            {activeTab === 'projects' && (
              <Button onClick={onProjectCreate} size="icon" title="Add Project">
                <IconPlus className="w-5 h-5" />
              </Button>
            )}

            {activeTab === 'taskTypes' && (
              <Button onClick={onTaskTypeCreate} size="icon" title="Add Task Type">
                <IconPlus className="w-5 h-5" />
              </Button>
            )}
          </div>

          <TabsContent value="projects">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {sortedProjects.map((p) => (
                  <DroppableBadge
                    key={p.id}
                    id={`project-drop-${p.id}`}
                    type="project"
                    name={p.name}
                    className="px-4 py-2 bg-blue-100 rounded-full cursor-pointer hover:bg-blue-200 transition-colors h-[3.25rem] flex items-center justify-center"
                    onClick={() => onProjectEdit(p)}
                  >
                    <span className="text-sm font-medium text-blue-700 block w-full text-center line-clamp-2" title={p.name}>
                      {p.name} ({p.keyword_count})
                    </span>
                  </DroppableBadge>
                ))}
            </div>
          </TabsContent>

          <TabsContent value="taskTypes">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {sortedTaskTypes.map((t) => (
                  <DroppableBadge
                    key={t.id}
                    id={`tasktype-drop-${t.id}`}
                    type="taskType"
                    name={t.name}
                    className="px-4 py-2 bg-green-100 rounded-full cursor-pointer hover:bg-green-200 transition-colors h-[3.25rem] flex items-center justify-center"
                    onClick={() => onTaskTypeEdit(t)}
                  >
                    <span className="text-sm font-medium text-green-700 block w-full text-center line-clamp-2" title={t.name}>
                      {t.name} ({t.keyword_count})
                    </span>
                  </DroppableBadge>
                ))}
            </div>
          </TabsContent>

          <TabsContent value="favorites">
              {favorites.length === 0 ? (
                <p className="text-slate-400 text-sm">
                  No favorites yet. Go to Settings to load favorites from Jira.
                </p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {sortedFavorites.map((f) => {
                    const displayText = f.short_name || f.jira_name || f.jira_key;
                    return (
                    <DroppableBadge
                      key={f.id}
                      id={`favorite-drop-${f.id}`}
                      type="favorite"
                      name={f.jira_key}
                      className="px-4 py-2 bg-purple-100 rounded-full cursor-pointer hover:bg-purple-200 transition-colors h-[3.25rem] flex items-center justify-center"
                      onClick={() => onFavoriteEdit(f)}
                    >
                      <span className="text-sm font-medium text-purple-700 block w-full text-center line-clamp-2" title={displayText}>
                        {displayText}
                      </span>
                    </DroppableBadge>
                  );})}
                </div>
              )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
});
