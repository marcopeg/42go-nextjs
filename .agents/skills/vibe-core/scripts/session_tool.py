#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import sys

from session_lib import (
    append_session_entry,
    close_session,
    create_session,
    latest_session,
    load_session_paths,
    promote_memory,
    resolve_sessions_root,
)


def command_start(args: argparse.Namespace) -> int:
    sessions_root = resolve_sessions_root(args.sessions_root)
    sessions_root.mkdir(parents=True, exist_ok=True)
    result = create_session(args.goal.strip(), sessions_root)
    print(json.dumps(result))
    return 0


def command_latest(args: argparse.Namespace) -> int:
    sessions_root = resolve_sessions_root(args.sessions_root)
    result = latest_session(sessions_root, only_active=args.only_active)
    if result is None:
        return 1
    print(json.dumps(result))
    return 0


def command_annotate(args: argparse.Namespace) -> int:
    paths = load_session_paths(args.session)
    result = append_session_entry(paths.session_file, args.title, args.body)
    print(json.dumps(result))
    return 0


def command_promote(args: argparse.Namespace) -> int:
    paths = load_session_paths(args.session)
    result = promote_memory(
        paths.session_file,
        paths.memory_file,
        args.title,
        args.summary,
        args.doc,
    )
    print(json.dumps(result))
    return 0


def command_close(args: argparse.Namespace) -> int:
    paths = load_session_paths(args.session)
    result = close_session(paths.session_file, paths.memory_file, args.summary)
    print(json.dumps(result))
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Manage vibe coding sessions.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    start_parser = subparsers.add_parser("start", help="Create a new vibe session workspace.")
    start_parser.add_argument("goal", help="Human description of the vibe session goal.")
    start_parser.add_argument(
        "--sessions-root",
        help="Directory for session workspaces. Defaults to docs/vibe-sessions.",
    )
    start_parser.set_defaults(func=command_start)

    latest_parser = subparsers.add_parser("latest", help="Locate the latest vibe session workspace.")
    latest_parser.add_argument(
        "--sessions-root",
        help="Directory for session workspaces. Defaults to docs/vibe-sessions.",
    )
    latest_parser.add_argument(
        "--all",
        action="store_false",
        dest="only_active",
        help="Include closed sessions.",
    )
    latest_parser.set_defaults(func=command_latest, only_active=True)

    annotate_parser = subparsers.add_parser("annotate", help="Append a working note to the session log.")
    annotate_parser.add_argument("--session", required=True, help="Session directory or session.md path.")
    annotate_parser.add_argument("--title", required=True, help="Annotation title.")
    annotate_parser.add_argument("--body", required=True, help="Annotation body.")
    annotate_parser.set_defaults(func=command_annotate)

    promote_parser = subparsers.add_parser("promote", help="Record a promotion into the long-term memory doc.")
    promote_parser.add_argument("--session", required=True, help="Session directory or session.md path.")
    promote_parser.add_argument("--title", required=True, help="Promotion title.")
    promote_parser.add_argument("--summary", required=True, help="Summary of the durable context that was promoted.")
    promote_parser.add_argument("--doc", help="Permanent doc that received the promoted content.")
    promote_parser.set_defaults(func=command_promote)

    close_parser = subparsers.add_parser("close", help="Close the session workspace.")
    close_parser.add_argument("--session", required=True, help="Session directory or session.md path.")
    close_parser.add_argument("--summary", help="Optional closing note.")
    close_parser.set_defaults(func=command_close)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        return args.func(args)
    except Exception as exc:  # pragma: no cover - surfaced to caller
        print(str(exc), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
