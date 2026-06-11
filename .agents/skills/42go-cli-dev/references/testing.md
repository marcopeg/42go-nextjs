# CLI Testing And Validation

## Test Suite

Run the full CLI tests:

```bash
pytest cli/tests
```

Focused examples:

```bash
pytest cli/tests/test_cli.py
pytest cli/tests/test_reads.py
pytest cli/tests/test_sessions.py
```

## Project QA

After code changes:

```bash
npm run qa
```

## Smoke Commands

Use the installed CLI:

```bash
42go --help
42go pull --help
42go query --help
42go query lingocafe --help
42go query lingocafe reads --help
```

Run realistic local analytics:

```bash
42go pull events --dry-run
42go query lingocafe books
42go query lingocafe reads --reset --limit 5
```

Database/network commands may require sandbox escalation.

## Parquet Verification

Check generated files:

```bash
find .local/42go-stats/lingocafe -maxdepth 1 -type f -name 'query_lingocafe_*.parquet' | sort
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
