'use client';

import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  pointerWithin,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { useState, ReactNode, createContext, useContext } from 'react';

interface DragData {
  type: 'entry';
  entryIds: number[];           // All entries being dragged
  primaryEntryId: number;       // The row being physically dragged
  primaryEntryTitle: string;
}

interface DropData {
  type: 'project' | 'taskType' | 'favorite';
  name: string;
}

interface DragState {
  isDragging: boolean;
  draggingEntryIds: number[];
}

interface DndProviderProps {
  children: ReactNode;
  selectedEntryIds: Set<number>;
  onDropOnProject: (entryIds: number[], projectName: string) => Promise<void>;
  onDropOnTaskType: (entryIds: number[], taskTypeName: string) => Promise<void>;
  onDropOnFavorite?: (entryIds: number[], jiraKey: string) => Promise<void>;
}

const DragStateContext = createContext<DragState>({ isDragging: false, draggingEntryIds: [] });

export function useDragState() {
  return useContext(DragStateContext);
}

// Legacy hook for backwards compatibility
export function useIsDragging() {
  const { isDragging } = useContext(DragStateContext);
  return isDragging;
}

export function DndProvider({
  children,
  selectedEntryIds,
  onDropOnProject,
  onDropOnTaskType,
  onDropOnFavorite,
}: DndProviderProps) {
  const [activeEntry, setActiveEntry] = useState<DragData | null>(null);
  const [dragState, setDragState] = useState<DragState>({ isDragging: false, draggingEntryIds: [] });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as DragData;
    setActiveEntry(data);
    setDragState({ isDragging: true, draggingEntryIds: data.entryIds });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveEntry(null);
    setDragState({ isDragging: false, draggingEntryIds: [] });

    if (!over) return;

    const dragData = active.data.current as DragData;
    const dropData = over.data.current as DropData;

    if (!dragData || !dropData) return;

    const entryIds = dragData.entryIds;

    if (dropData.type === 'project') {
      await onDropOnProject(entryIds, dropData.name);
    } else if (dropData.type === 'taskType') {
      await onDropOnTaskType(entryIds, dropData.name);
    } else if (dropData.type === 'favorite' && onDropOnFavorite) {
      await onDropOnFavorite(entryIds, dropData.name);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      autoScroll={false}
    >
      <DragStateContext.Provider value={dragState}>
        {children}
      </DragStateContext.Provider>
      <DragOverlay zIndex={50}>
        {activeEntry ? (
          activeEntry.entryIds.length > 1 ? (
            <div className="px-4 py-2 bg-white shadow-lg rounded-lg border border-blue-300 text-sm max-w-xs flex items-center gap-2">
              <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {activeEntry.entryIds.length}
              </span>
              <span className="truncate">{activeEntry.entryIds.length} entries</span>
            </div>
          ) : (
            <div className="px-4 py-2 bg-white shadow-lg rounded-lg border border-blue-300 text-sm max-w-xs truncate">
              {activeEntry.primaryEntryTitle}
            </div>
          )
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
