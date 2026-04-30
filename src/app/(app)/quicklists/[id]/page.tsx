"use client";

import { AppLayout } from "@/42go/layouts/app/AppLayout";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { RotateCcw } from "lucide-react";
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
import { arrayMove } from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import {
  ProjectDetailsSkeleton,
  ProjectDetailsErrorState,
} from "@/lib/quicklists/components/ProjectListSkeleton";
import {
  useQuicklistData,
  Task,
} from "@/lib/quicklists/hooks/useQuicklistData";
import { TaskItem } from "@/lib/quicklists/components/TaskItem";
import { TasksList } from "@/lib/quicklists/components/TasksList";
import { HeaderTitle } from "@/lib/quicklists/components/HeaderTitle";
import { MobileEditPanel } from "@/lib/quicklists/components/MobileEditPanel";
import { MobileCreatePanel } from "@/lib/quicklists/components/MobileCreatePanel";
import { MobileListEditPanel } from "@/lib/quicklists/components/MobileListEditPanel";
import { Clock } from "lucide-react";

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
    projectData,
    isLoading,
    error,
    refetch,
    tasks,
    setTasks,
    listTitle,
    movingDownIds,
    handleToggleTask,
    handleDeleteTask,
    handleCreateTask,
    handleUpdateTask,
    handleUpdateProject,
    refreshData,
    hasCompleted,
    handleDropCompleted,
  } = useQuicklistData({ projectId });

  const [editingList, setEditingList] = useState(false);
  const [draftListTitle, setDraftListTitle] = useState("");
  const [savingList, setSavingList] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState<string>("");
  const [savingEdit, setSavingEdit] = useState(false);
  const desktopInputRef = useRef<HTMLInputElement | null>(null);
  const [creatingMobile, setCreatingMobile] = useState(false);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const isDesktop = useSyncExternalStore(
    (onChange) => {
      if (typeof window === "undefined") return () => {};

      window.addEventListener("resize", onChange);
      return () => window.removeEventListener("resize", onChange);
    },
    () => typeof window !== "undefined" && window.innerWidth >= 768,
    () => false
  );

  // Split helper
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
    const el = desktopInputRef.current;
    el?.focus();
  };

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
  const kbInset = useSyncExternalStore(
    (onChange) => {
      const open = editingId || editingList || creatingMobile;
      if (!open || typeof window === "undefined" || !window.visualViewport) {
        return () => {};
      }

      const vv = window.visualViewport;
      vv.addEventListener("resize", onChange);
      vv.addEventListener("scroll", onChange);
      return () => {
        vv.removeEventListener("resize", onChange);
        vv.removeEventListener("scroll", onChange);
      };
    },
    () => {
      const open = editingId || editingList || creatingMobile;
      if (!open || typeof window === "undefined" || !window.visualViewport) {
        return 0;
      }

      const vv = window.visualViewport;
      return Math.round(
        Math.max(0, window.innerHeight - (vv.height + vv.offsetTop))
      );
    },
    () => 0
  );

  const sortedTasks = useMemo(() => {
    const pending = tasks
      .filter((t) => !t.completed_at)
      .sort(
        (a, b) => a.position - b.position || a.title.localeCompare(b.title)
      );
    const done = tasks
      .filter((t) => !!t.completed_at)
      .sort((a, b) => {
        const at = a.completed_at ? new Date(a.completed_at).getTime() : 0;
        const bt = b.completed_at ? new Date(b.completed_at).getTime() : 0;
        return bt - at;
      });
    return [...pending, ...done];
  }, [tasks]);

  const handleToggle = handleToggleTask;
  const handleDelete = handleDeleteTask;
  const handleStartEdit = (task: Task) => {
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
      await handleUpdateTask(editingId, { title: first });
      const rest = parts.slice(1);
      if (rest.length > 0) {
        // Bulk create new tasks after current editingId
        const res = await fetch(
          `/api/quicklists/${projectId}/tasks/bulk-create`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ titles: rest, afterId: editingId }),
          }
        );
        if (res.ok) {
          const data: { ok: boolean; created: Task[] } = await res.json();
          const created = data.created;
          setTasks((prev) => {
            const pending = prev
              .filter((t) => !t.completed_at)
              .sort((a, b) => a.position - b.position);
            const done = prev.filter((t) => !!t.completed_at);
            const idx = pending.findIndex((t) => t.id === editingId);
            if (idx === -1) return [...prev, ...created];
            const before = pending.slice(0, idx + 1);
            const after = pending.slice(idx + 1);
            const newPending = [...before, ...created, ...after].map(
              (t, i) => ({
                ...t,
                position: i + 1,
              })
            );
            return [...newPending, ...done];
          });
        } else {
          console.error("Bulk create failed", res.status);
        }
      }
    } catch (e) {
      console.error("Failed to save edit", e);
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
      if (titles.length === 1) {
        const maxPos = tasks.reduce((m, t) => Math.max(m, t.position || 0), 0);
        const newTask = await handleCreateTask(
          projectId,
          titles[0],
          maxPos + 1
        );
        setTasks((prev) => [...prev, newTask]);
      } else {
        // Bulk append at end: afterId = last pending task id
        const lastPending = tasks
          .filter((t) => !t.completed_at)
          .sort((a, b) => a.position - b.position)
          .slice(-1)[0];
        const afterId = lastPending ? lastPending.id : null;
        const res = await fetch(
          `/api/quicklists/${projectId}/tasks/bulk-create`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ titles, afterId }),
          }
        );
        if (res.ok) {
          const data: { ok: boolean; created: Task[] } = await res.json();
          const created = data.created;
          setTasks((prev) => {
            const pending = prev
              .filter((t) => !t.completed_at)
              .sort((a, b) => a.position - b.position);
            const done = prev.filter((t) => !!t.completed_at);
            const newPending = [...pending, ...created].map((t, i) => ({
              ...t,
              position: i + 1,
            }));
            return [...newPending, ...done];
          });
        } else {
          console.error("Bulk create failed", res.status);
        }
      }
      setNewTitle("");
      focusComposer();
    } finally {
      setSubmitting(false);
    }
  };

  const pending = useMemo(() => tasks.filter((t) => !t.completed_at), [tasks]);
  const pendingIds = useMemo(() => pending.map((t) => t.id), [pending]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
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
  const handleDragStart = (event: DragStartEvent) =>
    setActiveId(event.active.id);
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    const oldIndex = pendingIds.indexOf(String(active.id));
    const newIndex = pendingIds.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
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
      const orderedIds = reOrdered.map((t) => t.id);

      // Fire-and-forget bulk reorder. If it fails we'll refresh to recover state.
      fetch(`/api/quicklists/${projectId}/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ taskIds: orderedIds }),
      })
        .then((res) => {
          if (!res.ok) {
            // attempt to recover authoritative state
            refetch();
          }
        })
        .catch(() => {
          refetch();
        });

      return [...reOrdered, ...doneList];
    });
  };

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
    if (!title || !projectId) return cancelEditList();
    try {
      setSavingList(true);
      await handleUpdateProject({ title });
      cancelEditList();
    } catch (e) {
      console.error("Failed to save list title", e);
    } finally {
      setSavingList(false);
    }
  };

  const RefreshButton = () => (
    <Button
      onClick={refreshData}
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

  const headerTitleElement = (
    <HeaderTitle
      listTitle={listTitle}
      editingList={editingList}
      draftListTitle={draftListTitle}
      onStartEdit={startEditList}
      onChangeDraft={setDraftListTitle}
      onSave={saveEditList}
      onCancel={cancelEditList}
    />
  );

  return (
    <AppLayout
      hideMobileMenu
      disablePadding
      title={headerTitleElement}
      backBtn={{ to: "/quicklists" }}
      actions={actions}
      policy={{ require: { feature: "page:quicklists" } }}
      footer={footerNode}
    >
      {/* Align list with header on desktop; no horizontal padding on mobile */}
      <div className="max-w-3xl w-full pt-2 pb-24 md:pb-0 px-0">
        {isLoading && <ProjectDetailsSkeleton />}
        {!!error && (
          <ProjectDetailsErrorState
            error={error instanceof Error ? error.message : String(error)}
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

            {hasCompleted && (
              <div className="mt-4 mb-8 flex justify-center">
                <button
                  type="button"
                  onClick={handleDropCompleted}
                  aria-label="Drop completed tasks"
                  className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 transition"
                >
                  Drop completed tasks
                </button>
              </div>
            )}

            {/* Mobile panels using extracted components */}
            <MobileEditPanel
              isOpen={!!editingId}
              draftTitle={draftTitle}
              onChangeDraft={setDraftTitle}
              onSave={handleSaveEdit}
              onCancel={handleCancelEdit}
              onDelete={
                editingId
                  ? () =>
                      handleDelete(editingId).then((deleted) => {
                        if (deleted) handleCancelEdit();
                      })
                  : undefined
              }
              saving={savingEdit}
              canSubmit={canSubmitEdit}
              kbInset={kbInset}
            />

            <MobileListEditPanel
              isOpen={editingList}
              draftTitle={draftListTitle}
              onChangeDraft={setDraftListTitle}
              onSave={saveEditList}
              onCancel={cancelEditList}
              saving={savingList}
              kbInset={kbInset}
            />
            {/* Desktop input moved to AppLayout footer */}
          </>
        )}
      </div>

      {/* Mobile create panel using extracted component */}
      {!editingId && !editingList && (
        <MobileCreatePanel
          mounted={mounted}
          isOpen={creatingMobile}
          newTitle={newTitle}
          onChangeTitle={setNewTitle}
          onCreate={handleCreate}
          onToggle={() => setCreatingMobile(true)}
          onClose={() => setCreatingMobile(false)}
          submitting={submitting}
          canSubmit={canSubmitNew}
          kbInset={kbInset}
        />
      )}
    </AppLayout>
  );
}
