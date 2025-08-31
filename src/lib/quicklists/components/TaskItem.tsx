"use client";

import { useEffect, useRef } from "react";
import { CheckCircle2, Circle, Trash2, GripVertical } from "lucide-react";
import { CSS, type Transform } from "@dnd-kit/utilities";
import { DisplayDate } from "@/42go/components/DisplayDate";
import { Task } from "../hooks/useQuicklistData";

interface SortableProps {
  setNodeRef: (node: HTMLElement | null) => void;
  attributes: Record<string, unknown>;
  listeners: Record<string, unknown>;
  transform: Transform | null;
  transition: string | undefined;
  isDragging?: boolean;
  disabled?: boolean;
}

export interface TaskItemProps {
  task: Task;
  onToggle: (taskId: string, completed: boolean) => void;
  onDelete: (taskId: string) => void;
  isEditing: boolean;
  draftTitle: string;
  onStartEdit: (task: Task) => void;
  onChangeDraft: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  sortable?: SortableProps;
  movingDown?: boolean;
}

export const TaskItem = ({
  task,
  onToggle,
  onDelete,
  isEditing,
  draftTitle,
  onStartEdit,
  onChangeDraft,
  onSaveEdit,
  onCancelEdit,
  sortable,
  movingDown,
}: TaskItemProps) => {
  const isCompleted = task.completed_at !== null;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    onToggle(task.id, !isCompleted);
  };

  useEffect(() => {
    if (isEditing) {
      const isDesktop =
        typeof window !== "undefined" && window.innerWidth >= 768;
      if (isDesktop) {
        const el = inputRef.current;
        if (el) {
          el.focus();
          el.select();
        }
      }
    }
  }, [isEditing]);

  return (
    <li
      ref={sortable?.setNodeRef}
      className={`group flex items-center gap-3 p-3 hover:bg-muted/20 min-h-16 ${
        sortable && !sortable.disabled && !isEditing
          ? "select-none touch-pan-y md:hover:cursor-grab md:active:cursor-grabbing py-4"
          : ""
      } ${
        sortable?.isDragging
          ? "opacity-60 ring-2 ring-primary/40 md:cursor-grabbing py-4"
          : ""
      } ${movingDown ? "transition-all duration-500 ease-out opacity-70" : ""}`}
      style={{
        transform: CSS.Transform.toString(sortable?.transform || null),
        transition: sortable?.transition,
      }}
      data-taskid={task.id}
      {...(isDesktop && !isEditing && sortable && !sortable.disabled
        ? ({
            ...(sortable.attributes as unknown as Record<string, unknown>),
            ...(sortable.listeners as unknown as Record<string, unknown>),
          } as Record<string, unknown>)
        : {})}
    >
      <button
        className="flex-shrink-0 focus:outline-none md:cursor-pointer"
        aria-label={isCompleted ? "Uncheck task" : "Check task"}
        onClick={handleToggle}
        type="button"
      >
        {isCompleted ? (
          <CheckCircle2 className="h-5 w-5 text-green-600" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground" />
        )}
      </button>

      <div className="flex-1 min-w-0 flex flex-col justify-center">
        {/* Desktop inline edit (md+) */}
        <div className="hidden md:block">
          {isEditing ? (
            <input
              ref={inputRef}
              className="w-full px-2 py-1 rounded border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              value={draftTitle}
              onChange={(e) => onChangeDraft(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSaveEdit();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  onCancelEdit();
                }
              }}
              onBlur={onCancelEdit}
            />
          ) : (
            <div onClick={() => onStartEdit(task)}>
              <p
                className={`font-medium leading-tight m-0 ${
                  isCompleted ? "line-through text-muted-foreground" : ""
                }`}
              >
                {task.title}
              </p>
              {isCompleted ? (
                <div className="mt-1 h-4 flex items-center text-xs text-muted-foreground gap-1">
                  <span>completed</span>
                  <DisplayDate date={task.completed_at} />
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Mobile view: tap title to edit */}
        <div className="md:hidden" onClick={() => onStartEdit(task)}>
          <p
            className={`font-medium leading-tight m-0 ${
              isCompleted ? "line-through text-muted-foreground" : ""
            }`}
          >
            {task.title}
          </p>
          {isCompleted ? (
            <div className="mt-1 h-4 flex items-center text-xs text-muted-foreground gap-1">
              <span>completed</span>
              <DisplayDate date={task.completed_at} />
            </div>
          ) : null}
        </div>
      </div>

      {/* Drag handle for mobile only (hidden on desktop) */}
      {!isCompleted && (
        <button
          type="button"
          title="Reorder"
          aria-label="Reorder task"
          /* Enlarged touch target for mobile drag handle */
          className={`md:hidden flex items-center justify-center text-muted-foreground hover:text-foreground touch-none select-none w-14 h-14 -my-5 ml-1 rounded-md active:bg-muted/50 ${
            isEditing ? "pointer-events-none opacity-40" : ""
          }`}
          onContextMenu={(e) => {
            e.preventDefault();
          }}
          style={{
            WebkitTouchCallout: "none",
            WebkitUserSelect: "none",
            userSelect: "none",
          }}
          {...(!isEditing
            ? (sortable?.listeners as unknown as Record<string, unknown>) || {}
            : {})}
          {...(!isEditing
            ? (sortable?.attributes as unknown as Record<string, unknown>) || {}
            : {})}
        >
          <GripVertical className="h-5 w-5 pointer-events-none" />
        </button>
      )}

      {/* Desktop-only hover delete */}
      <button
        type="button"
        title="Delete"
        aria-label="Delete task"
        onClick={() => onDelete(task.id)}
        className="hidden md:inline-flex md:cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-muted-foreground hover:text-red-600"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
};
