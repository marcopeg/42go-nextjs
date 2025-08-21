"use client";

import { AppLayout } from "@/42go/layouts/app/AppLayout";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle2,
  Circle,
  Clock,
  Trash2,
  GripVertical,
  X,
  Plus,
  RotateCcw,
} from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  UniqueIdentifier,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS, type Transform } from "@dnd-kit/utilities";
import { useToast } from "@/components/ui/toast";
import { DisplayDate } from "@/42go/components/DisplayDate";
import { Button } from "@/components/ui/button";
import {
  useProject,
  useRefreshProject,
  useInvalidateProjectCache,
  useUpdateProjectInCache,
  ProjectData,
} from "@/hooks/useQuicklists";
import {
  ProjectDetailsSkeleton,
  ProjectDetailsErrorState,
} from "@/components/quicklists/ProjectListSkeleton";

type TTask = ProjectData["tasks"][0];

import { MouseEvent } from "react";

const TaskItem = ({
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
}: {
  task: ProjectData["tasks"][0];
  onToggle: (taskId: string, completed: boolean) => void;
  onDelete: (taskId: string) => void;
  isEditing: boolean;
  draftTitle: string;
  onStartEdit: (task: ProjectData["tasks"][0]) => void;
  onChangeDraft: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  sortable?: {
    setNodeRef: (node: HTMLElement | null) => void;
    attributes: Record<string, unknown>;
    listeners: Record<string, unknown>;
    transform: Transform | null;
    transition: string | undefined;
    isDragging?: boolean;
    disabled?: boolean;
  };
  movingDown?: boolean;
}) => {
  const isCompleted = task.completed_at !== null;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;
  const handleToggle = (e: MouseEvent) => {
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
      className={`group flex items-center gap-3 p-3 hover:bg-muted/20  min-h-16 ${
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
          className={`md:hidden inline-flex items-center justify-center text-muted-foreground hover:text-foreground touch-none select-none ${
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
          <GripVertical className="h-5 w-5" />
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

interface TasksListProps {
  tasks: ProjectData["tasks"];
  onToggle: (taskId: string, completed: boolean) => void;
  onDelete: (taskId: string) => void;
  editingId: string | null;
  draftTitle: string;
  onStartEdit: (task: ProjectData["tasks"][0]) => void;
  onChangeDraft: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  enableDnd?: boolean;
  sortableIds?: string[];
  movingDownIds?: Set<string>;
}

const TasksList = ({
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
  task: ProjectData["tasks"][0];
  onToggle: (taskId: string, completed: boolean) => void;
  onDelete: (taskId: string) => void;
  isEditing: boolean;
  draftTitle: string;
  onStartEdit: (task: ProjectData["tasks"][0]) => void;
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

const EmptyState = () => (
  <div className="text-center py-8 text-muted-foreground">
    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
    <p>No tasks in this list</p>
    <p className="text-sm">Add some tasks to get started</p>
  </div>
);

export default function ProjectDetailsPage() {
  const params = useParams<{ id: string | string[] }>();
  const idParam = params?.id;
  const projectId = Array.isArray(idParam) ? idParam[0] : idParam || "";

  const {
    data: projectData,
    isLoading,
    error,
    refetch,
  } = useProject(projectId);
  const refreshProject = useRefreshProject(projectId);
  const invalidateProjectCache = useInvalidateProjectCache();
  const updateProjectInCache = useUpdateProjectInCache();
  const [tasks, setTasks] = useState<TTask[]>(projectData?.tasks || []);
  const [listTitle, setListTitle] = useState<string>(
    projectData?.project?.title || ""
  );
  const [editingList, setEditingList] = useState(false);
  const [draftListTitle, setDraftListTitle] = useState("");
  const [savingList, setSavingList] = useState(false);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState<string>("");
  const [savingEdit, setSavingEdit] = useState(false);
  // dnd ephemeral state could be added here if needed
  const desktopInputRef = useRef<HTMLInputElement | null>(null);
  const mobileInputRef = useRef<HTMLTextAreaElement | null>(null);
  const mobileEditInputRef = useRef<HTMLTextAreaElement | null>(null);
  const mobileListInputRef = useRef<HTMLInputElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();
  const [creatingMobile, setCreatingMobile] = useState(false);
  const [kbInset, setKbInset] = useState(0);
  const [movingDownIds, setMovingDownIds] = useState<Set<string>>(new Set());
  const [isDesktop, setIsDesktop] = useState(false);

  // Split helper: supports ',' and ';' as dividers, trims and removes empties
  const parseNewTitle = (input: string): string[] =>
    input
      .split(/[\r\n;,]+/g)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  const canSubmitNew = useMemo(
    () => parseNewTitle(newTitle).length > 0,
    [newTitle]
  );
  const canSubmitEdit = useMemo(() => {
    const first = parseNewTitle(draftTitle)[0] || "";
    return first.trim().length > 0;
  }, [draftTitle]);

  const focusComposer = () => {
    const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;
    const el = isDesktop ? desktopInputRef.current : mobileInputRef.current;
    (el ?? desktopInputRef.current ?? mobileInputRef.current)?.focus();
  };

  // Sync tasks when projectData changes
  useEffect(() => {
    if (projectData?.tasks) {
      setTasks(projectData.tasks);
    }
  }, [projectData?.tasks]);

  // Sync list title when data changes
  useEffect(() => {
    if (projectData?.project?.title) {
      setListTitle(projectData.project.title);
    }
  }, [projectData?.project?.title]);

  // Mark mounted to safely use portals without SSR mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Track viewport to render footer only on desktop
  useEffect(() => {
    const update = () =>
      setIsDesktop(typeof window !== "undefined" && window.innerWidth >= 768);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Lock scroll when any full-screen panel is open on mobile
  useEffect(() => {
    const open = editingId || editingList || creatingMobile;
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [editingId, editingList, creatingMobile]);

  // Track on-screen keyboard overlap using VisualViewport when panels are open
  useEffect(() => {
    const open = editingId || editingList || creatingMobile;
    if (!open) {
      setKbInset(0);
      return;
    }
    if (typeof window === "undefined" || !window.visualViewport) return;
    const vv = window.visualViewport;
    const update = () => {
      const inset = Math.max(
        0,
        window.innerHeight - (vv.height + vv.offsetTop)
      );
      setKbInset(Math.round(inset));
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [editingId, editingList, creatingMobile]);

  // Derived client-side sort:
  // - unchecked first (by position asc)
  // - checked at bottom (by completed_at desc -> last checked on top within done section)
  const sortedTasks = useMemo(() => {
    const pending = tasks
      .filter((t) => !t.completed_at)
      .sort((a, b) => {
        if (a.position !== b.position) return a.position - b.position;
        // tie-breaker by updated_at asc for stability
        return (
          new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
        );
      });
    const done = tasks
      .filter((t) => !!t.completed_at)
      .sort((a, b) => {
        const at = a.completed_at ? new Date(a.completed_at).getTime() : 0;
        const bt = b.completed_at ? new Date(b.completed_at).getTime() : 0;
        return bt - at; // latest first
      });
    return [...pending, ...done];
  }, [tasks]);

  // Handler for check/uncheck with optimistic updates
  const handleToggle = async (taskId: string, completed: boolean) => {
    // Store original task for rollback on error
    const originalTask = tasks.find((t) => t.id === taskId);
    if (!originalTask) return;

    // Optimistic update: update local state immediately
    const now = new Date().toISOString();
    const optimisticUpdates = {
      completed_at: completed ? now : null,
      updated_at: now,
    };

    // If marking as completed, add visual feedback before sorting moves it
    if (completed) {
      setMovingDownIds((prev) => new Set(prev).add(taskId));
      // remove after brief delay ~500ms
      setTimeout(() => {
        setMovingDownIds((prev) => {
          const n = new Set(prev);
          n.delete(taskId);
          return n;
        });
      }, 600);
    }

    // Apply optimistic update immediately
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...optimisticUpdates } : t))
    );

    // Update the projects list cache with new updated_at without refetch
    updateProjectInCache(projectId, { updated_at: now });

    // Call server in background
    try {
      const res = await fetch(`/api/quicklists/${projectId}/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ completed }),
      });

      if (!res.ok) {
        throw new Error(`Failed to update task: ${res.status}`);
      }

      const result = await res.json();
      if (result?.task) {
        // Server returned updated data, sync local state with server response
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, ...result.task } : t))
        );
        // Update projects list cache with actual server timestamp
        updateProjectInCache(projectId, { updated_at: result.task.updated_at });
      }
    } catch (error) {
      // Rollback optimistic update on error
      setTasks((prev) => prev.map((t) => (t.id === taskId ? originalTask : t)));

      // Show error toast
      toast({
        variant: "destructive",
        title: "Failed to update task",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
      });

      // Refetch data from server to ensure consistency
      refetch();
    }
  };

  const handleDelete = async (taskId: string): Promise<boolean> => {
    // Confirm once; keep it simple for now
    if (typeof window !== "undefined") {
      const ok = window.confirm("Delete this item?");
      if (!ok) return false;
    }
    try {
      const res = await fetch(`/api/quicklists/${projectId}/${taskId}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error(`Failed to delete: ${res.status}`);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      // Invalidate the project cache since task deletion updates the project's updated_at
      invalidateProjectCache(projectId, { taskDeleted: true });
      return true;
    } catch {
      // Optionally surface error toast
      return false;
    }
  };

  // Edit handlers
  const handleStartEdit = (task: TTask) => {
    setEditingId(task.id);
    setDraftTitle(task.title);
  };
  const handleCancelEdit = () => {
    setEditingId(null);
    setDraftTitle("");
  };
  const handleSaveEdit = async () => {
    if (!editingId) return;
    const parts = parseNewTitle(draftTitle);
    const first = parts[0]?.trim() || "";
    if (!first) return handleCancelEdit();
    try {
      setSavingEdit(true);
      // 1) Rename current task to first token
      const renameRes = await fetch(
        `/api/quicklists/${projectId}/${editingId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ title: first }),
        }
      );
      if (!renameRes.ok) throw new Error(`Failed to save: ${renameRes.status}`);
      const renameJson = (await renameRes.json()) as {
        ok: boolean;
        task: TTask;
      };
      let editedTask: TTask | null = null;
      if (renameJson?.task) {
        setTasks((prev) =>
          prev.map((t) => {
            if (t.id === editingId) {
              editedTask = { ...t, ...renameJson.task };
              return editedTask;
            }
            return t;
          })
        );
      }

      // 2) If there are additional tokens, insert them right after the edited task
      const rest = parts.slice(1);
      if (rest.length > 0) {
        // Get a stable snapshot for calculations
        const snapshot =
          editedTask || tasks.find((t) => t.id === editingId) || null;
        if (!snapshot) throw new Error("Edited task not found after rename");
        const isCompleted = !!snapshot.completed_at;
        if (!isCompleted) {
          // Work within pending list order (position asc)
          const pendingList = tasks
            .filter((t) => !t.completed_at)
            .sort((a, b) => a.position - b.position);
          const idx = pendingList.findIndex((t) => t.id === snapshot.id);
          if (idx !== -1) {
            const insertAfterPos = pendingList[idx].position;
            const shiftBy = rest.length;
            // Bump positions of subsequent pending tasks
            const toBump = pendingList.slice(idx + 1);
            for (const item of toBump) {
              const newPos = item.position + shiftBy;
              try {
                await fetch(`/api/quicklists/${projectId}/${item.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  credentials: "same-origin",
                  body: JSON.stringify({ position: newPos }),
                });
                setTasks((prev) =>
                  prev.map((t) =>
                    t.id === item.id ? { ...t, position: newPos } : t
                  )
                );
              } catch {}
            }
            // Create new tasks at immediate next positions
            const created: TTask[] = [];
            for (let i = 0; i < rest.length; i++) {
              try {
                const t = await createTask(
                  projectId,
                  rest[i],
                  insertAfterPos + i + 1
                );
                created.push(t);
              } catch {}
            }
            if (created.length > 0) {
              setTasks((prev) => [...prev, ...created]);
            }
          }
        } else {
          // If edited task is completed, positions don't affect done list
          // Create new tasks appended to end of pending
          const maxPos = tasks
            .filter((t) => !t.completed_at)
            .reduce((m, t) => Math.max(m, t.position || 0), 0);
          const created: TTask[] = [];
          for (let i = 0; i < rest.length; i++) {
            try {
              const t = await createTask(projectId, rest[i], maxPos + i + 1);
              created.push(t);
            } catch {}
          }
          if (created.length > 0) {
            setTasks((prev) => [...prev, ...created]);
          }
        }
      }
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Failed to edit item",
        description:
          e instanceof Error ? e.message : "Unknown error editing item",
      });
    } finally {
      setSavingEdit(false);
      handleCancelEdit();
    }
  };
  const handleCreate = async () => {
    if (!projectId) return;
    const titles = parseNewTitle(newTitle);
    if (titles.length === 0) return;
    try {
      setSubmitting(true);
      // Base on current max position to avoid collisions and keep order stable
      const maxPos = tasks.reduce((m, t) => Math.max(m, t.position || 0), 0);
      const created: TTask[] = [];
      let failed = 0;
      for (let i = 0; i < titles.length; i++) {
        try {
          const item = await createTask(projectId, titles[i], maxPos + i + 1);
          created.push(item);
        } catch {
          failed += 1;
        }
      }
      if (created.length > 0) {
        setTasks((prev) => [...prev, ...created]);
        // Invalidate the project cache since new tasks update the project's updated_at
        invalidateProjectCache(projectId, { taskAdded: true });
      }
      // Reset and keep focus for rapid entry
      setNewTitle("");
      focusComposer();
      if (created.length > 1 || failed > 0) {
        toast({
          title: "Items created",
          description: `${created.length} created${
            failed ? `, ${failed} failed` : ""
          }`,
        });
      }
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Failed to create item(s)",
        description:
          e instanceof Error ? e.message : "Unknown error creating item(s)",
      });
    } finally {
      setSubmitting(false);
    }
  };
  const createTask = async (
    pid: string,
    title: string,
    nextPosition: number
  ): Promise<TTask> => {
    const res = await fetch(`/api/quicklists/${pid}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ title, position: nextPosition }),
    });
    if (!res.ok) {
      throw new Error(`Failed to create task: ${res.status}`);
    }
    const data = (await res.json()) as {
      ok: boolean;
      task: TTask;
    };
    return data.task;
  };

  // Pending/done splits for DnD logic
  const pending = useMemo(() => tasks.filter((t) => !t.completed_at), [tasks]);
  const pendingIds = useMemo(() => pending.map((t) => t.id), [pending]);
  const sensors = useSensors(
    // Pointer sensor: small distance to allow clicks without dragging (desktop)
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // Touch sensor on the row with a press delay for long-press-to-drag
    useSensor(TouchSensor, {
      activationConstraint: { delay: 450, tolerance: 8 },
    }),
    useSensor(KeyboardSensor)
  );
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const activeTask = useMemo(
    () => (activeId ? tasks.find((t) => t.id === activeId) || null : null),
    [activeId, tasks]
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
  };
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    const oldIndex = pendingIds.indexOf(String(active.id));
    const newIndex = pendingIds.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return; // only reorder pending

    setTasks((prev) => {
      const pendingList = prev.filter((t) => !t.completed_at);
      const doneList = prev.filter((t) => !!t.completed_at);
      const from = pendingList.findIndex((t) => t.id === active.id);
      const to = pendingList.findIndex((t) => t.id === over.id);
      if (from === -1 || to === -1) return prev;
      const reOrdered = arrayMove(pendingList, from, to).map((t, idx) => ({
        ...t,
        position: idx + 1,
      }));
      // Persist new position for dragged item
      const newPos = to + 1;
      fetch(`/api/quicklists/${projectId}/${String(active.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ position: newPos }),
      }).catch(() => {});
      return [...reOrdered, ...doneList];
    });
  };

  // List title editing handlers
  const startEditList = () => {
    setDraftListTitle(listTitle);
    setEditingList(true);
  };
  const cancelEditList = () => {
    setEditingList(false);
    setDraftListTitle("");
  };
  const saveEditList = async () => {
    const title = draftListTitle.trim();
    if (!title || !projectId) {
      cancelEditList();
      return;
    }
    try {
      setSavingList(true);
      const res = await fetch(`/api/quicklists/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error(`Failed to rename: ${res.status}`);
      const data = (await res.json()) as {
        ok: boolean;
        project: { id: string; title: string; updated_at: string };
      };
      if (data?.project?.title) {
        setListTitle(data.project.title);
        // Invalidate the project cache since the project title changed
        invalidateProjectCache(projectId, {
          title: data.project.title,
          updated_at: data.project.updated_at,
        });
      }
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Failed to edit list title",
        description:
          e instanceof Error ? e.message : "Unknown error editing list title",
      });
    } finally {
      setSavingList(false);
      cancelEditList();
    }
  };

  // Focus/select inline title input on desktop when entering edit
  useEffect(() => {
    if (editingList) {
      const isDesktop =
        typeof window !== "undefined" && window.innerWidth >= 768;
      if (isDesktop) {
        const el = titleInputRef.current;
        if (el) {
          el.focus();
          el.select();
        }
      }
    }
  }, [editingList]);

  // Header title node with inline edit on desktop and tap-to-edit on mobile
  const HeaderTitle = (
    <div className="min-w-0">
      {/* Desktop: inline editor */}
      <div className="hidden md:block">
        {editingList ? (
          <input
            ref={titleInputRef}
            className="w-full max-w-[60vw] px-2 py-1 rounded border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            value={draftListTitle}
            onChange={(e) => setDraftListTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                saveEditList();
              } else if (e.key === "Escape") {
                e.preventDefault();
                cancelEditList();
              }
            }}
            onBlur={cancelEditList}
          />
        ) : (
          <button
            type="button"
            onClick={startEditList}
            title="Rename list"
            className="truncate text-left hover:opacity-80"
          >
            {listTitle || "Loading..."}
          </button>
        )}
      </div>
      {/* Mobile: tap to open bottom sheet (keeps text visible in header) */}
      <div className="md:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={startEditList}
            title="Rename list"
            className="truncate text-left hover:opacity-80 flex-1"
          >
            {listTitle || "Loading..."}
          </button>
        </div>
      </div>
    </div>
  );

  const RefreshButton = () => (
    <Button
      onClick={refreshProject}
      size="sm"
      variant="outline"
      aria-label="Refresh project"
    >
      <RotateCcw className="h-4 w-4" />
    </Button>
  );

  const actions = [
    {
      type: "component" as const,
      component: RefreshButton,
    },
    {
      type: "link" as const,
      label: "Info",
      href: `/quicklists/${projectId}/info`,
      size: "sm" as const,
      variant: "outline" as const,
    },
  ];

  // Desktop footer composer (rendered via AppLayout footer on md+ only)
  const footerNode = isDesktop ? (
    <div className="w-full">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <input
            ref={desktopInputRef}
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleCreate();
              }
            }}
            placeholder="New item..."
            className="w-full px-3 py-2 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button
          type="button"
          onClick={handleCreate}
          disabled={submitting || !canSubmitNew}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </div>
  ) : undefined;

  return (
    <AppLayout
      hideMobileMenu
      disablePadding
      title={HeaderTitle}
      backBtn={{ to: "/quicklists" }}
      actions={actions}
      policy={{ require: { feature: "page:quicklists" } }}
      footer={footerNode}
    >
      {/* Align list with header on desktop; no horizontal padding on mobile */}
      <div className="max-w-3xl w-full pt-2 pb-24 md:pb-0 px-0">
        {isLoading && <ProjectDetailsSkeleton />}
        {error && (
          <ProjectDetailsErrorState
            error={error instanceof Error ? error.message : "Unknown error"}
            onRetry={() => refetch()}
          />
        )}
        {projectData && (
          <>
            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <TasksList
                tasks={sortedTasks}
                onToggle={handleToggle}
                onDelete={handleDelete}
                editingId={editingId}
                draftTitle={draftTitle}
                onStartEdit={handleStartEdit}
                onChangeDraft={setDraftTitle}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={handleCancelEdit}
                enableDnd
                sortableIds={pendingIds}
                movingDownIds={movingDownIds}
              />
              <DragOverlay>
                {activeTask ? (
                  <div className="border rounded-md bg-background shadow-lg">
                    <TaskItem
                      task={activeTask}
                      onToggle={() => {}}
                      onDelete={() => {}}
                      isEditing={false}
                      draftTitle={activeTask.title}
                      onStartEdit={() => {}}
                      onChangeDraft={() => {}}
                      onSaveEdit={() => {}}
                      onCancelEdit={() => {}}
                      sortable={{
                        setNodeRef: () => {},
                        attributes: {},
                        listeners: {},
                        transform: null,
                        transition: undefined,
                        disabled: true,
                      }}
                    />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
            {tasks.length === 0 && <EmptyState />}
            {/* Mobile full-screen panels */}
            {editingId && (
              <div className="md:hidden fixed inset-0 z-[500] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                <div
                  className="absolute inset-0 flex flex-col"
                  style={{ height: "100dvh" }}
                >
                  <div className="px-4 pt-4 pb-3 border-b flex items-center justify-between">
                    <div className="text-base font-semibold">Edit task</div>
                    <button
                      type="button"
                      aria-label="Cancel"
                      title="Close"
                      onClick={handleCancelEdit}
                      className="p-2 rounded-md hover:bg-muted/20"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto px-4 py-3">
                    <textarea
                      ref={mobileEditInputRef}
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      className="w-full px-3 py-3 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary text-base resize-none min-h-[120px]"
                      placeholder="Edit title (newline, , or ; add more items)"
                      autoFocus
                      enterKeyHint="enter"
                      onFocus={(e) => e.currentTarget.select()}
                    />
                  </div>
                  <div
                    className="px-4 pb-4 pt-2 border-t bg-background"
                    style={{
                      paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)",
                      transform: kbInset
                        ? `translateY(-${kbInset}px)`
                        : undefined,
                      willChange: kbInset ? "transform" : undefined,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        title="Delete task"
                        aria-label="Delete task"
                        onClick={() => {
                          // Hide the keyboard first, then confirm delete
                          mobileEditInputRef.current?.blur();
                          if (typeof document !== "undefined") {
                            const ae =
                              document.activeElement as HTMLElement | null;
                            ae?.blur?.();
                          }
                          const id = editingId;
                          // Give iOS a moment to dismiss the keyboard before confirm()
                          setTimeout(() => {
                            if (!id) return;
                            handleDelete(id).then((deleted) => {
                              if (deleted) handleCancelEdit();
                            });
                          }, 150);
                        }}
                        className="p-3 rounded-md text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          mobileEditInputRef.current?.blur();
                          handleSaveEdit();
                        }}
                        disabled={savingEdit || !canSubmitEdit}
                        className="px-4 py-3 rounded-md bg-primary text-primary-foreground disabled:opacity-50"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {editingList && (
              <div className="md:hidden fixed inset-0 z-[500] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                <div
                  className="absolute inset-0 flex flex-col"
                  style={{ height: "100dvh" }}
                >
                  <div className="px-4 pt-4 pb-3 border-b text-base font-semibold">
                    Rename list
                  </div>
                  <div className="flex-1 overflow-y-auto px-4 py-3">
                    <input
                      ref={mobileListInputRef}
                      type="text"
                      value={draftListTitle}
                      onChange={(e) => setDraftListTitle(e.target.value)}
                      className="w-full px-3 py-3 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary text-base"
                      placeholder="List name"
                      autoFocus
                      enterKeyHint="done"
                      onFocus={(e) => e.currentTarget.select()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (draftListTitle.trim().length > 0) {
                            mobileListInputRef.current?.blur();
                            saveEditList();
                          }
                        }
                      }}
                    />
                  </div>
                  <div
                    className="px-4 pb-4 pt-2 border-t bg-background"
                    style={{
                      paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)",
                      transform: kbInset
                        ? `translateY(-${kbInset}px)`
                        : undefined,
                      willChange: kbInset ? "transform" : undefined,
                    }}
                  >
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={cancelEditList}
                        className="flex-1 px-4 py-3 rounded-md border"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          mobileListInputRef.current?.blur();
                          saveEditList();
                        }}
                        disabled={
                          savingList || draftListTitle.trim().length === 0
                        }
                        className="flex-1 px-4 py-3 rounded-md bg-primary text-primary-foreground disabled:opacity-50"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Desktop input moved to AppLayout footer */}
          </>
        )}
      </div>

      {/* Mobile create task launcher + panel */}
      {mounted &&
        !editingId &&
        !editingList &&
        createPortal(
          <>
            {!creatingMobile && (
              <Button
                size="fab"
                aria-label="Add task"
                title="Add task"
                className="md:hidden fixed z-[300] shadow-lg hover:shadow-xl active:scale-95"
                style={{
                  right: "1rem",
                  bottom: "calc(env(safe-area-inset-bottom) + 1rem)",
                  WebkitAppearance: "none",
                  appearance: "none",
                  minWidth: 56,
                  minHeight: 56,
                  maxWidth: 56,
                  maxHeight: 56,
                }}
                onClick={() => {
                  setCreatingMobile(true);
                  setTimeout(() => mobileInputRef.current?.focus(), 0);
                }}
              >
                <Plus className="h-7 w-7" />
              </Button>
            )}
            {creatingMobile && (
              <div className="md:hidden fixed inset-0 z-[500] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                <div
                  className="absolute inset-0 flex flex-col"
                  style={{ height: "100dvh" }}
                >
                  <div className="px-4 pt-4 pb-3 border-b flex items-center justify-between">
                    <div className="text-base font-semibold">Create task</div>
                    <button
                      type="button"
                      aria-label="Cancel"
                      title="Close"
                      onClick={() => {
                        mobileInputRef.current?.blur();
                        setCreatingMobile(false);
                      }}
                      className="p-2 rounded-md hover:bg-muted/20"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto px-4 py-3">
                    <textarea
                      ref={mobileInputRef}
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full px-3 py-3 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary text-base resize-none min-h-[140px]"
                      placeholder="Task title (use newline, , or ; to add many)"
                      autoFocus
                      enterKeyHint="enter"
                      inputMode="text"
                      autoCapitalize="sentences"
                      onFocus={(e) => e.currentTarget.select()}
                    />
                  </div>
                  <div
                    className="px-4 pb-4 pt-2 border-t bg-background"
                    style={{
                      paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)",
                      transform: kbInset
                        ? `translateY(-${kbInset}px)`
                        : undefined,
                      willChange: kbInset ? "transform" : undefined,
                    }}
                  >
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          mobileInputRef.current?.blur();
                          setCreatingMobile(false);
                        }}
                        className="flex-1 px-4 py-3 rounded-md border border-transparent bg-transparent hover:bg-muted/20"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (canSubmitNew) {
                            mobileInputRef.current?.blur();
                            handleCreate();
                            setCreatingMobile(false);
                          }
                        }}
                        disabled={submitting || !canSubmitNew}
                        className="flex-1 px-4 py-3 rounded-md bg-primary text-primary-foreground disabled:opacity-50"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>,
          document.body
        )}
    </AppLayout>
  );
}
