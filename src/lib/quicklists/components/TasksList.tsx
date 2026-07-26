"use client";

import { ListPlus } from "lucide-react";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
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
  onAddFirstItem: () => void;
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
  onAddFirstItem,
}: TasksListProps) => {
  if (tasks.length === 0) {
    return (
      <div className="px-6 py-12 text-center md:mt-8">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ListPlus className="size-7" aria-hidden="true" />
        </div>
        <h2 className="mt-5 text-lg font-semibold text-foreground">
          This list is empty
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          Add the first item and get things moving.
        </p>
        <Button
          type="button"
          variant="link"
          className="mt-4"
          onClick={onAddFirstItem}
        >
          <ListPlus aria-hidden="true" />
          Add your first item
        </Button>
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
