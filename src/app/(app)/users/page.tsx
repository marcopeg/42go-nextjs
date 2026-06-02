'use client';

import { AppLayout, type TActionItem } from '@/42go/layouts/app';
import { Modal } from '@/42go/components/modal';
import type { Policy } from '@/42go/policy';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Check, Copy, Loader2, MoreVertical, RefreshCw } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useState } from 'react';

type AppUser = {
  id: string;
  appId: string;
  username: string | null;
  name: string | null;
  email: string;
  image: string | null;
  emailVerified: string | null;
  profile: Record<string, unknown> | null;
  featureFlags: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

type UsersResponse = {
  appId: string;
  users: AppUser[];
};

type UserAction = 'reset-profile' | 'reset-consent' | 'enable-translation';

type UserEditFields = {
  username: string;
  name: string;
  email: string;
  image: string;
  emailVerified: string;
  profile: string;
  featureFlags: string;
};

type UsersListProps = {
  users: AppUser[];
  isLoading: boolean;
  error: string | null;
  copiedKey: string | null;
  pendingUserAction: string | null;
  onCopy: (key: string, value: string) => Promise<void>;
  onEditUser: (user: AppUser) => void;
  onUserAction: (user: AppUser, action: UserAction) => Promise<void>;
  onRetry: () => void;
  onInitialLoad: (signal: AbortSignal) => Promise<void>;
};

const usersPolicy: Policy = {
  require: {
    feature: 'page:users',
    session: true,
    role: 'backoffice',
    grants: ['users:list'],
  },
};

const formatDate = (value: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getDisplayName = (user: AppUser) => user.name || user.username || user.email;

const formatJson = (value: unknown) => JSON.stringify(value ?? null, null, 2);

const parseObjectJson = (value: string, label: string) => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value || 'null');
  } catch {
    throw new Error(`${label} must be valid JSON.`);
  }

  if (parsed !== null && (typeof parsed !== 'object' || Array.isArray(parsed))) {
    throw new Error(`${label} must be a JSON object or null.`);
  }

  return parsed as Record<string, unknown> | null;
};

const CopyableValue = ({
  value,
  copied,
  className = '',
  children,
  onCopy,
}: {
  value: string;
  copied: boolean;
  className?: string;
  children: ReactNode;
  onCopy: (value: string) => Promise<void> | void;
}) => (
  <button
    type="button"
    className={`group inline-flex max-w-full items-center gap-1 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${className}`}
    title={`Copy ${value}`}
    onClick={() => onCopy(value)}
  >
    <span className="min-w-0 truncate">{children}</span>
    {copied ? (
      <Check className="size-3 shrink-0 opacity-60" />
    ) : (
      <Copy className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-60 group-focus-visible:opacity-60" />
    )}
  </button>
);

const fetchUsersData = async (signal?: AbortSignal) => {
  const res = await fetch('/api/users', {
    credentials: 'same-origin',
    signal,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      message?: string;
      error?: string;
    } | null;
    throw new Error(body?.message || body?.error || 'Unable to load users');
  }

  return (await res.json()) as UsersResponse;
};

const updateUserData = async (userId: string, action: UserAction) => {
  const res = await fetch('/api/users', {
    method: 'PATCH',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, action }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      message?: string;
      error?: string;
    } | null;
    throw new Error(body?.message || body?.error || 'Unable to update user');
  }
};

const saveUserData = async (userId: string, fields: UserEditFields) => {
  const res = await fetch('/api/users', {
    method: 'PATCH',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId,
      action: 'update-user',
      fields: {
        username: fields.username,
        name: fields.name,
        email: fields.email,
        image: fields.image,
        emailVerified: fields.emailVerified,
        profile: parseObjectJson(fields.profile, 'Profile'),
        featureFlags: parseObjectJson(fields.featureFlags, 'Feature flags'),
      },
    }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      message?: string;
      error?: string;
    } | null;
    throw new Error(body?.message || body?.error || 'Unable to save user');
  }
};

const createEditFields = (user: AppUser): UserEditFields => ({
  username: user.username || '',
  name: user.name || '',
  email: user.email || '',
  image: user.image || '',
  emailVerified: user.emailVerified || '',
  profile: formatJson(user.profile),
  featureFlags: formatJson(user.featureFlags),
});

const FieldGroup = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <label className="grid gap-2">
    <span className="text-sm font-medium">{label}</span>
    {children}
  </label>
);

const ReadOnlyField = ({ label, value }: { label: string; value: string | null }) => (
  <div className="grid gap-1 rounded-md border bg-muted/30 px-3 py-2">
    <span className="text-xs font-medium uppercase text-muted-foreground">{label}</span>
    <span className="break-all font-mono text-xs text-muted-foreground">{value || '-'}</span>
  </div>
);

const UserEditPanel = ({
  user,
  fields,
  open,
  saving,
  onFieldsChange,
  onOpenChange,
  onSave,
}: {
  user: AppUser | null;
  fields: UserEditFields | null;
  open: boolean;
  saving: boolean;
  onFieldsChange: (fields: UserEditFields | null) => void;
  onOpenChange: (open: boolean) => void;
  onSave: (user: AppUser, fields: UserEditFields) => Promise<void>;
}) => {
  const [error, setError] = useState<string | null>(null);

  const updateField = (key: keyof UserEditFields, value: string) => {
    onFieldsChange(fields ? { ...fields, [key]: value } : fields);
  };

  const handleSave = async () => {
    if (!user || !fields) return;
    setError(null);

    try {
      await onSave(user, fields);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save user');
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={user ? `Edit ${getDisplayName(user)}` : 'Edit user'}
      subtitle="Raw user fields. Password and consent are not editable here."
      presentation="panel"
      anchor="right"
      size="lg"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving || !fields}>
            {saving ? (
              <>
                <Loader2 className="animate-spin" />
                Saving
              </>
            ) : (
              'Save'
            )}
          </Button>
        </>
      }
    >
      {fields && user ? (
        <div className="grid gap-5">
          {error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="grid gap-3">
            <ReadOnlyField label="User ID" value={user.id} />
            <ReadOnlyField label="App ID" value={user.appId} />
            <ReadOnlyField label="Created" value={formatDate(user.createdAt)} />
            <ReadOnlyField label="Updated" value={formatDate(user.updatedAt)} />
          </div>

          <FieldGroup label="Username">
            <Input
              value={fields.username}
              onChange={event => updateField('username', event.target.value)}
              placeholder="Optional"
            />
          </FieldGroup>

          <FieldGroup label="Name">
            <Input
              value={fields.name}
              onChange={event => updateField('name', event.target.value)}
              placeholder="Optional"
            />
          </FieldGroup>

          <FieldGroup label="Email">
            <Input
              value={fields.email}
              onChange={event => updateField('email', event.target.value)}
              placeholder="Required"
            />
          </FieldGroup>

          <FieldGroup label="Image URL">
            <Input
              value={fields.image}
              onChange={event => updateField('image', event.target.value)}
              placeholder="Optional"
            />
          </FieldGroup>

          <FieldGroup label="Email verified">
            <Input
              value={fields.emailVerified}
              onChange={event => updateField('emailVerified', event.target.value)}
              placeholder="ISO date or empty"
            />
          </FieldGroup>

          <FieldGroup label="Profile JSON">
            <Textarea
              value={fields.profile}
              onChange={event => updateField('profile', event.target.value)}
              className="min-h-48 font-mono text-xs"
              spellCheck={false}
            />
          </FieldGroup>

          <FieldGroup label="Feature flags JSON">
            <Textarea
              value={fields.featureFlags}
              onChange={event => updateField('featureFlags', event.target.value)}
              className="min-h-40 font-mono text-xs"
              spellCheck={false}
            />
          </FieldGroup>
        </div>
      ) : null}
    </Modal>
  );
};

const UsersList = ({
  users,
  isLoading,
  error,
  copiedKey,
  pendingUserAction,
  onCopy,
  onEditUser,
  onUserAction,
  onRetry,
  onInitialLoad,
}: UsersListProps) => {
  useEffect(() => {
    const controller = new AbortController();
    onInitialLoad(controller.signal);
    return () => controller.abort();
  }, [onInitialLoad]);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col overflow-hidden bg-background">
      {error ? (
        <div className="flex items-start gap-3 p-6 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <div className="space-y-3">
            <p>{error}</p>
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw />
              Retry
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-medium uppercase text-muted-foreground">
                <th className="sticky top-0 z-10 border-b bg-background/95 px-6 py-3 backdrop-blur">
                  User
                </th>
                <th className="sticky top-0 z-10 border-b bg-background/95 px-6 py-3 backdrop-blur">
                  Email
                </th>
                <th className="sticky top-0 z-10 border-b bg-background/95 px-6 py-3 backdrop-blur">
                  Joined
                </th>
                <th className="sticky top-0 z-10 w-12 border-b bg-background/95 px-6 py-3 backdrop-blur">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, index) => (
                  <tr key={index} className="border-b last:border-0">
                    <td className="px-6 py-4">
                      <div className="h-4 w-40 rounded bg-muted" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-56 rounded bg-muted" />
                      <div className="mt-1 h-3 w-72 rounded bg-muted/70" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-24 rounded bg-muted" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="size-8 rounded bg-muted" />
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-muted-foreground">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user.id} className="border-b last:border-0">
                    <td className="px-6 py-4">
                      <div className="font-medium">{getDisplayName(user)}</div>
                      {user.username ? (
                        <CopyableValue
                          value={user.username}
                          copied={copiedKey === `${user.id}:username`}
                          className="mt-0.5 text-xs text-muted-foreground"
                          onCopy={value => onCopy(`${user.id}:username`, value)}
                        >
                          @{user.username}
                        </CopyableValue>
                      ) : null}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex min-w-56 flex-col items-start gap-0.5">
                        <CopyableValue
                          value={user.email}
                          copied={copiedKey === `${user.id}:email`}
                          className="text-muted-foreground"
                          onCopy={value => onCopy(`${user.id}:email`, value)}
                        >
                          {user.email}
                        </CopyableValue>
                        <CopyableValue
                          value={user.id}
                          copied={copiedKey === `${user.id}:id`}
                          className="font-mono text-[10px] leading-3 text-muted-foreground/60"
                          onCopy={value => onCopy(`${user.id}:id`, value)}
                        >
                          {user.id}
                        </CopyableValue>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Open actions for ${getDisplayName(user)}`}
                            disabled={pendingUserAction?.startsWith(`${user.id}:`)}
                          >
                            {pendingUserAction?.startsWith(`${user.id}:`) ? (
                              <Loader2 className="animate-spin" />
                            ) : (
                              <MoreVertical />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => onEditUser(user)}>
                            Edit user
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={() => onUserAction(user, 'reset-profile')}
                          >
                            Reset profile
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => onUserAction(user, 'reset-consent')}
                          >
                            Reset consent
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => onUserAction(user, 'enable-translation')}
                          >
                            Enable translation
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default function UsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [pendingUserAction, setPendingUserAction] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [editingFields, setEditingFields] = useState<UserEditFields | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSavingUser, setIsSavingUser] = useState(false);

  const applyUsersResponse = useCallback((body: UsersResponse) => {
    setUsers(body.users);
  }, []);

  const loadInitialUsers = useCallback(
    async (signal: AbortSignal) => {
      try {
        const body = await fetchUsersData(signal);
        applyUsersResponse(body);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Unable to load users');
      } finally {
        if (!signal.aborted) setIsLoading(false);
      }
    },
    [applyUsersResponse]
  );

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const body = await fetchUsersData();
      applyUsersResponse(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load users');
    } finally {
      setIsLoading(false);
    }
  }, [applyUsersResponse]);

  const copyValue = useCallback(async (key: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedKey(key);
    window.setTimeout(() => {
      setCopiedKey(current => (current === key ? null : current));
    }, 1200);
  }, []);

  const runUserAction = useCallback(
    async (user: AppUser, action: UserAction) => {
      const pendingKey = `${user.id}:${action}`;
      setPendingUserAction(pendingKey);
      setError(null);

      try {
        await updateUserData(user.id, action);
        const body = await fetchUsersData();
        applyUsersResponse(body);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to update user');
      } finally {
        setPendingUserAction(current => (current === pendingKey ? null : current));
      }
    },
    [applyUsersResponse]
  );

  const openEditUser = useCallback((user: AppUser) => {
    setEditingUser(user);
    setEditingFields(createEditFields(user));
    setIsEditOpen(true);
  }, []);

  const saveEditedUser = useCallback(
    async (user: AppUser, fields: UserEditFields) => {
      setIsSavingUser(true);

      try {
        await saveUserData(user.id, fields);
        const body = await fetchUsersData();
        applyUsersResponse(body);
        setIsEditOpen(false);
        setEditingUser(null);
        setEditingFields(null);
      } finally {
        setIsSavingUser(false);
      }
    },
    [applyUsersResponse]
  );

  const RefreshAction = () => (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-label="Refresh users"
      onClick={loadUsers}
      disabled={isLoading}
    >
      <RefreshCw className={isLoading ? 'animate-spin' : ''} />
    </Button>
  );

  const actions: TActionItem[] = [
    {
      type: 'component',
      component: RefreshAction,
    },
  ];

  return (
    <AppLayout
      stickyHeader
      title="Users"
      subtitle="Sorted by join date"
      actions={actions}
      disablePadding
      policy={usersPolicy}
    >
      <UsersList
        users={users}
        isLoading={isLoading}
        error={error}
        copiedKey={copiedKey}
        pendingUserAction={pendingUserAction}
        onCopy={copyValue}
        onEditUser={openEditUser}
        onUserAction={runUserAction}
        onRetry={loadUsers}
        onInitialLoad={loadInitialUsers}
      />
      <UserEditPanel
        key={editingUser ? editingUser.id : 'edit-user'}
        user={editingUser}
        fields={editingFields}
        open={isEditOpen}
        saving={isSavingUser}
        onFieldsChange={setEditingFields}
        onOpenChange={next => {
          setIsEditOpen(next);
          if (!next) {
            setEditingUser(null);
            setEditingFields(null);
          }
        }}
        onSave={saveEditedUser}
      />
    </AppLayout>
  );
}
