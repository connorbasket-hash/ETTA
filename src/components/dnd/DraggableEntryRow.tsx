'use client';

import { useDraggable } from '@dnd-kit/core';
import { ReactNode } from 'react';
import { useDragState } from './DndProvider';

interface DraggableEntryRowProps {
  entryId: number;
  entryTitle: string;
  selectedEntryIds: Set<number>;
  children: ReactNode;
}

export function DraggableEntryRow({
  entryId,
  entryTitle,
  selectedEntryIds,
  children,
}: DraggableEntryRowProps) {
  const { isDragging: someEntryDragging, draggingEntryIds } = useDragState();

  // Include all selected entries in the drag if there's a selection
  const entryIds = selectedEntryIds.size > 0 ? Array.from(selectedEntryIds) : [entryId];

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `entry-${entryId}`,
    data: {
      type: 'entry',
      entryIds,
      primaryEntryId: entryId,
      primaryEntryTitle: entryTitle,
    },
  });

  // Dim this row if it's part of the current drag operation
  const isBeingDraggedAsPartOfSelection = someEntryDragging && draggingEntryIds.includes(entryId);

  const style = {
    opacity: isDragging || isBeingDraggedAsPartOfSelection ? 0.3 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
    touchAction: 'none',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
    >
      {children}
    </div>
  );
}
