# CLI Testing And Validation

## Test Suite

Run the full CLI tests:

```bash
pytest cli/tests
```

Focused examples:

```bash
pytest cli/tests/test_cli.py
pytest cli/tests/test_events_pull.py
pytest cli/tests/test_peek.py
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
42go pull all --help
42go peek --help
```

Run realistic local raw-data checks:

```bash
42go pull events --dry-run
42go pull all --dry-run
42go peek auth users --pager cat
```

Database/network commands may require sandbox escalation.

## Parquet Verification

Use DuckDB for row counts when validating raw pull output:

```python
import duckdb
con = duckdb.connect(":memory:")
con.execute("select count(*) from read_parquet(?)", [path]).fetchone()
```

## Test Expectations

- Help tests belong in `cli/tests/test_cli.py`.
- Pull tests should use temporary Parquet archives, not production data.
- Reset tests should verify raw data cleanup where applicable.
