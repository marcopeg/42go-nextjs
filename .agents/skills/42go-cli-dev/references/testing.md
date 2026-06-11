# CLI Testing And Validation

## Test Suite

Run the full CLI tests:

```bash
.local/42go-events/.venv/bin/python -m pytest cli/tests
```

Focused examples:

```bash
.local/42go-events/.venv/bin/python -m pytest cli/tests/test_cli.py
.local/42go-events/.venv/bin/python -m pytest cli/tests/test_reads.py
.local/42go-events/.venv/bin/python -m pytest cli/tests/test_sessions.py
```

## Project QA

After code changes:

```bash
npm run qa
```

## Smoke Commands

Use the local venv command when available:

```bash
.local/42go-events/.venv/bin/42go --help
.local/42go-events/.venv/bin/42go events --help
.local/42go-events/.venv/bin/42go query --help
.local/42go-events/.venv/bin/42go query reads --help
```

Run realistic local analytics:

```bash
.local/42go-events/.venv/bin/42go events pull --dry-run
.local/42go-events/.venv/bin/42go query books stats
.local/42go-events/.venv/bin/42go query reads --reset --limit 5
```

Database/network commands may require sandbox escalation.

## Parquet Verification

Check generated files:

```bash
find .local/42go-stats/lingocafe -maxdepth 1 -type f -name 'query_*.parquet' | sort
```

Use DuckDB for row counts when validating aggregate output:

```python
import duckdb
con = duckdb.connect(":memory:")
con.execute("select count(*) from read_parquet(?)", [path]).fetchone()
```

## Test Expectations

- Help tests belong in `cli/tests/test_cli.py`.
- Analytics tests should use temporary Parquet archives, not production data.
- Cache tests should verify rebuilt and cached status.
- Reset tests should verify legacy cache cleanup where applicable.
