'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IconMinus, IconPlus } from '@tabler/icons-react';

interface Project {
  id: number;
  name: string;
}

interface TaskType {
  id: number;
  name: string;
}

export interface EntryFormData {
  title: string;
  date: string;
  startTime: string;
  hours: number;
  minutes: number;
  project: string;
  taskType: string;
  jiraIssue: string;
}

interface EntryModalProps {
  mode: 'create' | 'edit';
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: EntryFormData) => void;

  // Available options for dropdowns
  projects: Project[];
  taskTypes: TaskType[];

  // Initial values (set when modal opens)
  initialValues: EntryFormData;

  // Callback when project+taskType change (for route lookup)
  onProjectTaskTypeChange?: (project: string, taskType: string) => void;

  // External jira issue override (from route lookup)
  externalJiraIssue?: string;
}

export function EntryModal({
  mode,
  isOpen,
  onClose,
  onSave,
  projects,
  taskTypes,
  initialValues,
  onProjectTaskTypeChange,
  externalJiraIssue,
}: EntryModalProps) {
  const isCreate = mode === 'create';

  // Internal form state - managed within this component for performance
  const [title, setTitle] = useState(initialValues.title);
  const [date, setDate] = useState(initialValues.date);
  const [startTime, setStartTime] = useState(initialValues.startTime);
  const [hours, setHours] = useState(initialValues.hours);
  const [minutes, setMinutes] = useState(initialValues.minutes);
  const [project, setProject] = useState(initialValues.project);
  const [taskType, setTaskType] = useState(initialValues.taskType);
  const [jiraIssue, setJiraIssue] = useState(initialValues.jiraIssue);

  const effectiveJiraIssue = jiraIssue || externalJiraIssue || '';

  // Notify parent when project/taskType change for route lookup
  const handleProjectChange = useCallback((value: string) => {
    setProject(value);
    onProjectTaskTypeChange?.(value, taskType);
  }, [taskType, onProjectTaskTypeChange]);

  const handleTaskTypeChange = useCallback((value: string) => {
    setTaskType(value);
    onProjectTaskTypeChange?.(project, value);
  }, [project, onProjectTaskTypeChange]);

  const handleSave = useCallback(() => {
    onSave({
      title,
      date,
      startTime,
      hours,
      minutes,
      project,
      taskType,
      jiraIssue: effectiveJiraIssue,
    });
  }, [onSave, title, date, startTime, hours, minutes, project, taskType, effectiveJiraIssue]);

  const handleDurationDecrease = () => {
    const total = hours * 60 + minutes - 15;
    if (total >= 15) {
      setHours(Math.floor(total / 60));
      setMinutes(total % 60);
    }
  };

  const handleDurationIncrease = () => {
    const total = hours * 60 + minutes + 15;
    setHours(Math.floor(total / 60));
    setMinutes(total % 60);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isCreate ? 'Create Manual Entry' : 'Edit Entry'}
          </DialogTitle>
          {isCreate && (
            <DialogDescription>
              Add a time entry not associated with an email or meeting.
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="grid gap-8 py-6">
          <div className="grid gap-3">
            <Label htmlFor="modal-title" className="text-base">Title</Label>
            <Input
              id="modal-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isCreate ? "e.g., Code review for feature X" : undefined}
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="grid gap-3">
              <Label htmlFor="modal-date" className="text-base">Date</Label>
              <Input
                id="modal-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="modal-time" className="text-base">Start Time</Label>
              <Input
                id="modal-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-3">
            <Label className="text-base">Duration</Label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min="0"
                max="23"
                value={hours}
                onChange={(e) => setHours(parseInt(e.target.value) || 0)}
                className="w-24"
              />
              <span className="text-slate-500 text-base">h</span>
              <Input
                type="number"
                min="0"
                max="59"
                step="15"
                value={minutes}
                onChange={(e) => setMinutes(parseInt(e.target.value) || 0)}
                className="w-24"
              />
              <span className="text-slate-500 text-base">m</span>
              <div className="flex gap-2 ml-3">
                <Button
                  variant="secondary"
                  size="icon-sm"
                  onClick={handleDurationDecrease}
                >
                  <IconMinus className="w-5 h-5" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon-sm"
                  onClick={handleDurationIncrease}
                >
                  <IconPlus className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="grid gap-3">
              <Label htmlFor="modal-project" className="text-base">Project</Label>
              <Select value={project} onValueChange={handleProjectChange}>
                <SelectTrigger id="modal-project">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.name}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3">
              <Label htmlFor="modal-taskType" className="text-base">Task Type</Label>
              <Select value={taskType} onValueChange={handleTaskTypeChange}>
                <SelectTrigger id="modal-taskType">
                  <SelectValue placeholder="Select task type" />
                </SelectTrigger>
                <SelectContent>
                  {taskTypes.map((t) => (
                    <SelectItem key={t.id} value={t.name}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3">
            <Label htmlFor="modal-jira" className="text-base">JIRA Issue</Label>
            <Input
              id="modal-jira"
              placeholder="e.g., WSO-129"
              value={effectiveJiraIssue}
              onChange={(e) => setJiraIssue(e.target.value.toUpperCase())}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {isCreate ? 'Create' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
