# Quicklist Data Model

This document describes the database schema for the Quicklist feature.

## Overview

- Schema: `quicklist`
- Entities: `projects`, `tasks`, `invites`, `collabs`
- ID strategy: UUIDs (uuid-ossp)
- User refs: `auth.users(id)` as text
- Deletions: hard delete with ON DELETE CASCADE

## ER Sketch

- projects 1-\* tasks
- projects 1-\* invites
- projects 1-\* collabs
- users (auth.users) 1-\* projects(created_by/owned_by)
- users (auth.users) 1-_ tasks(created_by), 0..1-_ tasks(completed_by)
- users (auth.users) 1-\* collabs

## Tables

### quicklist.projects

- id uuid PK
- title text not null default 'new list'
- created_at timestamp not null default now()
- updated_at timestamp not null default now()
- updated_by text null FK auth.users(id) on delete set null
- created_by text not null FK auth.users(id) on delete restrict
- owned_by text not null FK auth.users(id) on delete restrict
- Indexes: (owned_by), (created_by)

Update semantics: updated_at/updated_by refresh when project title changes, a task is added/deleted, or any task is modified. Enforced initially in app layer; DB triggers optional later.

### quicklist.tasks

- id uuid PK
- project_id uuid not null FK quicklist.projects(id) on delete cascade
- title text not null
- position integer not null default 0
- created_at timestamp not null default now()
- updated_at timestamp not null default now()
- created_by text not null FK auth.users(id) on delete restrict
- completed_at timestamp null
- completed_by text null FK auth.users(id) on delete set null
- Indexes: (project_id), (project_id, position), (project_id, completed_at)

### quicklist.invites

- project_id uuid not null FK quicklist.projects(id) on delete cascade
- email text not null
- created_at timestamp not null default now()
- created_by text not null FK auth.users(id) on delete restrict
- expires_at timestamp null (unused for now)
- PK: (project_id, email)
- Indexes: (email)

### quicklist.collabs

- project_id uuid not null FK quicklist.projects(id) on delete cascade
- user_id text not null FK auth.users(id) on delete cascade
- role text not null default 'editor'
- created_at timestamp not null default now()
- PK: (project_id, user_id)
- Indexes: (user_id)

## Notes

- Email normalization: handled in app layer (lowercase/validation)
- Ownership transfer: not supported initially
- Collaborator roles: only 'editor' for now
- Invite expiry: not used for now
