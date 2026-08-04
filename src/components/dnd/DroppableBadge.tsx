'use client';

import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface DroppableBadgeProps {
  id: string;
  type: 'project' | 'taskType' | 'favorite';
  name: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function DroppableBadge({
  id,
  type,
  name,
  children,
  className,
  onClick,
}: DroppableBadgeProps) {
  const { isOver, setNodeRef, active } = useDroppable({
    id,
    data: {
      type,
      name,
    },
  });

  const isValidDropTarget = active?.data.current?.type === 'entry';

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={cn(
        className,
        'transition-all duration-200',
        // Highlight valid drop targets during drag
        isValidDropTarget && 'ring-2 ring-offset-2 animate-pulse',
        isValidDropTarget && type === 'project' && 'ring-blue-400 bg-blue-50',
        isValidDropTarget && type === 'taskType' && 'ring-green-400 bg-green-50',
        isValidDropTarget && type === 'favorite' && 'ring-purple-400 bg-purple-50',
        // Stronger feedback when hovering over drop target
        isOver && 'scale-105 shadow-lg ring-4 animate-none',
        isOver && type === 'project' && 'bg-blue-200 ring-blue-500',
        isOver && type === 'taskType' && 'bg-green-200 ring-green-500',
        isOver && type === 'favorite' && 'bg-purple-200 ring-purple-500',
      )}
    >
      {children}
    </div>
  );
}
