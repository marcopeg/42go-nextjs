"use client";

import { Clock } from "lucide-react";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { TaskItem } from "./TaskItem";
import { Task } from "../hooks/useQuicklistData";

interface TasksListProps {
  tasks: Task[];
  onToggle: (taskId: string, completed: boolean) => void;
  onDelete: (taskId: string) => void;
  editingId: string | null;
  draftTitle: string;
  onStartEdit: (task: Task) => void;
  onChangeDraft: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  enableDnd?: boolean;
  sortableIds?: string[];
  movingDownIds?: Set<string>;
}

// Sortable wrapper using dnd-kit for pending items
const SortableItem = ({
  task,
  onToggle,
  onDelete,
  isEditing,
  draftTitle,
  onStartEdit,
  onChangeDraft,
  onSaveEdit,
  onCancelEdit,
  movingDown,
}: {
  task: Task;
  onToggle: (taskId: string, completed: boolean) => void;
  onDelete: (taskId: string) => void;
  isEditing: boolean;
  draftTitle: string;
  onStartEdit: (task: Task) => void;
  onChangeDraft: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  movingDown?: boolean;
}) => {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: isEditing });

  return (
    <TaskItem
      task={task}
      onToggle={onToggle}
      onDelete={onDelete}
      isEditing={isEditing}
      draftTitle={draftTitle}
      onStartEdit={onStartEdit}
      onChangeDraft={onChangeDraft}
      onSaveEdit={onSaveEdit}
      onCancelEdit={onCancelEdit}
      sortable={{
        setNodeRef,
        attributes: attributes as unknown as Record<string, unknown>,
        listeners: listeners as unknown as Record<string, unknown>,
        transform,
        transition,
        isDragging,
      }}
      movingDown={movingDown}
    />
  );
};

export const TasksList = ({
  tasks,
  onToggle,
  onDelete,
  editingId,
  draftTitle,
  onStartEdit,
  onChangeDraft,
  onSaveEdit,
  onCancelEdit,
  enableDnd = false,
  sortableIds = [],
  movingDownIds,
}: TasksListProps) => {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No tasks yet</p>
        <p className="text-sm">Tasks will appear here when created</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden md:border md:rounded-md md:mx-6 md:mt-6 md:mb-6">
      <SortableContext
        items={enableDnd ? sortableIds : []}
        strategy={verticalListSortingStrategy}
        disabled={!enableDnd}
      >
        <ul className="divide-y">
          {tasks.map((task) => {
            if (enableDnd && !task.completed_at) {
              return (
                <SortableItem
                  key={task.id}
                  task={task}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  isEditing={editingId === task.id}
                  draftTitle={draftTitle}
                  onStartEdit={onStartEdit}
                  onChangeDraft={onChangeDraft}
                  onSaveEdit={onSaveEdit}
                  onCancelEdit={onCancelEdit}
                  movingDown={!!movingDownIds?.has(task.id)}
                />
              );
            }
            return (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={onToggle}
                onDelete={onDelete}
                isEditing={editingId === task.id}
                draftTitle={draftTitle}
                onStartEdit={onStartEdit}
                onChangeDraft={onChangeDraft}
                onSaveEdit={onSaveEdit}
                onCancelEdit={onCancelEdit}
                sortable={{
                  setNodeRef: () => {},
                  attributes: {},
                  listeners: {},
                  transform: null,
                  transition: undefined,
                  disabled: true,
                }}
                movingDown={!!movingDownIds?.has(task.id)}
              />
            );
          })}
        </ul>
      </SortableContext>
    </div>
  );
};