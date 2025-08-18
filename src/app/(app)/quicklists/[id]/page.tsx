"use client";

import { AppLayout } from "@/42go/layouts/app/AppLayout";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Circle, Clock, Trash2 } from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  MouseSensor,
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

type TProject = {
  id: string;
  title: string;
  updated_at: string;
};

type TTask = {
  id: string;
  title: string;
  position: number;
  updated_at: string;
  completed_at: string | null;
};

interface ProjectData {
  project: TProject;
  tasks: TTask[];
}

const fetchProject = async (projectId: string): Promise<ProjectData> => {
  const res = await fetch(`/api/quicklists/${projectId}`, {
    credentials: "same-origin",
    cache: "no-store", // always hit API in the browser
  });

  if (!res.ok) {
    throw new Error(`Failed to load project: ${res.status} ${res.statusText}`);
  }

  return res.json();
};

const useProjectData = (projectId: string) => {
  const [data, setData] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const projectData = await fetchProject(projectId);
        setData(projectData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load project");
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId]);

  return { data, loading, error };
};

const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const ErrorMessage = ({ message }: { message: string }) => (
  <div className="text-sm text-red-600 dark:text-red-400 p-4 border border-red-200 dark:border-red-800 rounded-md bg-red-50 dark:bg-red-950/20">
    {message}
  </div>
);

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
}) => {
  const isCompleted = task.completed_at !== null;
  const updatedAt = new Date(task.updated_at);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleToggle = (e: MouseEvent) => {
    e.preventDefault();
    onToggle(task.id, !isCompleted);
  };

  // Autofocus when this row enters editing mode (desktop inline only)
  useEffect(() => {
    if (isEditing) {
      const isDesktop =
        typeof window !== "undefined" && window.innerWidth >= 768;
      if (isDesktop) {
        const el = inputRef.current;
        if (el) {
          el.focus();
          // Select all for quick overwrite
          el.select();
        }
      }
    }
  }, [isEditing]);

  return (
    <li
      ref={sortable?.setNodeRef}
      className={`group flex items-center gap-3 p-3 hover:bg-muted/20 ${
        sortable && !sortable.disabled
          ? "cursor-grab active:cursor-grabbing select-none touch-none"
          : ""
      } ${sortable?.isDragging ? "opacity-60 ring-2 ring-primary/40" : ""}`}
      style={{
        transform: CSS.Transform.toString(sortable?.transform || null),
        transition: sortable?.transition,
      }}
      {...(sortable?.attributes as Record<string, unknown>)}
      {...(sortable?.listeners as Record<string, unknown>)}
      data-taskid={task.id}
    >
      <button
        className="flex-shrink-0 focus:outline-none"
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
      <div className="flex-1 min-w-0">
        {/* Desktop inline edit (md+) */}
        <div className="hidden md:block">
          {isEditing ? (
            <input
              ref={inputRef}
              className="w-full px-2 py-1 rounded border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              value={draftTitle}
              onChange={(e) => onChangeDraft(e.target.value)}
              onKeyDown={(e) => {
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
            <div onClick={() => onStartEdit(task)} className="cursor-text">
              <p
                className={`font-medium ${
                  isCompleted ? "line-through text-muted-foreground" : ""
                }`}
              >
                {task.title}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Position: {task.position} • Updated:{" "}
                {updatedAt.toLocaleString()}
              </p>
            </div>
          )}
        </div>
        {/* Mobile view (always shows static text; editing via bottom sheet) */}
        <div className="md:hidden" onClick={() => onStartEdit(task)}>
          <p
            className={`font-medium ${
              isCompleted ? "line-through text-muted-foreground" : ""
            }`}
          >
            {task.title}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Position: {task.position} • Updated: {updatedAt.toLocaleString()}
          </p>
        </div>
      </div>
      {/* Desktop-only hover delete */}
      <button
        type="button"
        title="Delete"
        aria-label="Delete task"
        onClick={() => onDelete(task.id)}
        className="hidden md:inline-flex opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-muted-foreground hover:text-red-600"
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
    <div className="border rounded-md overflow-hidden">
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
}) => {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

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
        transform: transform,
        transition,
        isDragging,
      }}
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

  const { data: projectData, loading, error } = useProjectData(projectId);
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
  const mobileInputRef = useRef<HTMLInputElement | null>(null);
  const [mounted, setMounted] = useState(false);

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

  // Handler for check/uncheck
  const handleToggle = async (taskId: string, completed: boolean) => {
    try {
      const res = await fetch(`/api/quicklists/${projectId}/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ completed }),
        credentials: "same-origin",
      });
      if (!res.ok) {
        throw new Error(`Failed to update task: ${res.status}`);
      }
      const result = await res.json();
      if (result?.task) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, ...result.task } : t))
        );
      }
    } catch {
      // Optionally show error
      // setError("Failed to update task");
    }
  };

  const handleDelete = async (taskId: string) => {
    // Confirm once; keep it simple for now
    if (typeof window !== "undefined") {
      const ok = window.confirm("Delete this item?");
      if (!ok) return;
    }
    try {
      const res = await fetch(`/api/quicklists/${projectId}/${taskId}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error(`Failed to delete: ${res.status}`);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch {
      // Optionally surface error toast
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
    const title = draftTitle.trim();
    if (!title) return handleCancelEdit();
    try {
      setSavingEdit(true);
      const res = await fetch(`/api/quicklists/${projectId}/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error(`Failed to save: ${res.status}`);
      const result = (await res.json()) as { ok: boolean; task: TTask };
      if (result?.task) {
        setTasks((prev) =>
          prev.map((t) => (t.id === editingId ? { ...t, ...result.task } : t))
        );
      }
    } finally {
      setSavingEdit(false);
      handleCancelEdit();
    }
  };

  // Real create task API
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

  const handleCreate = async () => {
    const title = newTitle.trim();
    if (!title || !projectId) return;
    try {
      setSubmitting(true);
      const created = await createTask(projectId, title, tasks.length + 1);
      setTasks((prev) => [...prev, created]);
      setNewTitle("");
      // keep focus for rapid entry
      focusComposer();
    } finally {
      setSubmitting(false);
    }
  };

  // Pending/done splits for DnD logic
  const pending = useMemo(() => tasks.filter((t) => !t.completed_at), [tasks]);
  const pendingIds = useMemo(() => pending.map((t) => t.id), [pending]);
  const sensors = useSensors(
    // Desktop mouse drag starts after a small move to avoid click conflicts
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // Mobile/tablet long-press to start drag to avoid scroll/tap conflicts
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 8 },
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

  // Calculate subtitle for AppLayout
  const subtitle = projectData?.project?.updated_at
    ? `Last updated: ${new Date(
        projectData.project.updated_at
      ).toLocaleString()}`
    : undefined;

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
      if (data?.project?.title) setListTitle(data.project.title);
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
        <button
          type="button"
          onClick={startEditList}
          title="Rename list"
          className="truncate text-left hover:opacity-80"
        >
          {listTitle || "Loading..."}
        </button>
      </div>
    </div>
  );

  return (
    <AppLayout
      hideMobileMenu
      title={HeaderTitle}
      subtitle={subtitle}
      backBtn={{ to: "/quicklists", hideDesktop: true }}
      policy={{ require: { feature: "page:quicklists" } }}
    >
      {/* Align list with header: remove extra horizontal padding */}
      <div className="max-w-3xl w-full pt-2 pb-24 md:pb-0">
        {loading && <LoadingSpinner />}
        {error && <ErrorMessage message={error} />}
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
            {/* Mobile bottom sheet editor */}
            {editingId && (
              <div className="md:hidden fixed inset-0 z-[500]">
                <div
                  className="absolute inset-0 bg-black/40 transition-opacity"
                  onClick={handleCancelEdit}
                />
                <div className="absolute left-0 right-0 bottom-0 bg-background border-t rounded-t-xl shadow-2xl p-4 transition-transform">
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Edit item title"
                      autoFocus
                      onFocus={(e) => e.currentTarget.select()}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="flex-1 px-4 py-2 rounded-md border"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        disabled={savingEdit || draftTitle.trim().length === 0}
                        className="flex-1 px-4 py-2 rounded-md bg-primary text-primary-foreground disabled:opacity-50"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Mobile bottom sheet for list title */}
            {editingList && (
              <div className="md:hidden fixed inset-0 z-[500]">
                <div
                  className="absolute inset-0 bg-black/40 transition-opacity"
                  onClick={cancelEditList}
                />
                <div className="absolute left-0 right-0 bottom-0 bg-background border-t rounded-t-xl shadow-2xl p-4 transition-transform">
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={draftListTitle}
                      onChange={(e) => setDraftListTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Rename list"
                      autoFocus
                      onFocus={(e) => e.currentTarget.select()}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={cancelEditList}
                        className="flex-1 px-4 py-2 rounded-md border"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={saveEditList}
                        disabled={
                          savingList || draftListTitle.trim().length === 0
                        }
                        className="flex-1 px-4 py-2 rounded-md bg-primary text-primary-foreground disabled:opacity-50"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Desktop input: looks like a new item at the bottom */}
            <div className="hidden md:block">
              <div className="mt-4">
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
                    disabled={submitting || newTitle.trim().length === 0}
                    className="px-4 py-2 rounded-md bg-primary text-primary-foreground disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Mobile sticky chat-like input; elevated via portal above AppLayout toolbar */}
      {mounted &&
        !editingId &&
        !editingList &&
        createPortal(
          <div
            className="md:hidden fixed bottom-0 left-0 right-0 z-[200] border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-3"
            style={{
              paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)",
            }}
          >
            <div className="max-w-3xl flex items-center gap-2">
              <input
                ref={mobileInputRef}
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
                className="flex-1 px-3 py-2 rounded-full border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={handleCreate}
                disabled={submitting || newTitle.trim().length === 0}
                className="px-4 py-2 rounded-full bg-primary text-primary-foreground disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>,
          document.body
        )}
    </AppLayout>
  );
}
