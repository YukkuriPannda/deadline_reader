# CLAUDE.md — deadline_reader

This file provides guidance for AI coding assistants (Claude Code and similar tools) working in this repository. Keep it updated as the project evolves.

---

## Project Overview

**deadline_reader** is a tool for reading, parsing, and tracking deadlines. The repository is currently in its initial state — no source files have been committed yet.

When code is added, update the relevant sections of this file to reflect the actual structure, stack, and conventions.

---

## Repository State

| Item | Status |
|------|--------|
| Source code | Not yet committed |
| Tests | Not yet added |
| CI/CD | Not yet configured |
| Dependencies | Not yet defined |

---

## Development Branch

All work should be done on feature branches. The current documentation branch is:

```
claude/add-claude-documentation-V148R
```

Branch naming convention:
- Features: `feature/<short-description>`
- Bug fixes: `fix/<short-description>`
- Claude Code tasks: `claude/<description>-<id>`

---

## Git Workflow

```bash
# Start a new feature
git checkout -b feature/my-feature

# Stage specific files (avoid git add -A to prevent accidentally staging secrets)
git add path/to/file.py

# Commit with a descriptive message
git commit -m "Add deadline parser for ISO 8601 format"

# Push with upstream tracking
git push -u origin feature/my-feature
```

**Rules:**
- Never force-push to `main`/`master`
- Never skip pre-commit hooks (`--no-verify`)
- Prefer small, focused commits over large ones
- Do not commit secrets, `.env` files, or credentials

---

## Project Structure (Template)

Once source files exist, the expected layout will be documented here. A typical structure for a Python-based deadline_reader might look like:

```
deadline_reader/
├── CLAUDE.md               # This file
├── README.md               # User-facing documentation
├── pyproject.toml          # Project metadata & dependencies (or requirements.txt)
├── src/
│   └── deadline_reader/
│       ├── __init__.py
│       ├── parser.py       # Deadline parsing logic
│       ├── reader.py       # File/source reading
│       └── models.py       # Data models for deadlines
└── tests/
    ├── test_parser.py
    └── test_reader.py
```

Update this section to reflect the actual layout once files are added.

---

## Commands

Populate these once the project is bootstrapped:

```bash
# Install dependencies
# <to be filled in>

# Run the application
# <to be filled in>

# Run tests
# <to be filled in>

# Lint / format
# <to be filled in>
```

---

## Code Conventions

Until a linter/formatter config is committed, follow these defaults:

- **Python**: PEP 8, formatted with `ruff` or `black`, type hints preferred
- **JavaScript/TypeScript**: ESLint + Prettier, strict TypeScript if applicable
- **Line length**: 100 characters max
- **Imports**: group standard library → third-party → local, separated by blank lines
- **Tests**: co-locate in a `tests/` directory, one test file per source module

---

## AI Assistant Guidelines

When working in this repository:

1. **Read before editing** — always read a file before modifying it.
2. **Minimal changes** — make only what was asked; don't refactor surrounding code.
3. **No speculative abstractions** — don't add helpers, utilities, or config options for hypothetical future use.
4. **No unnecessary comments** — only add comments where the logic is non-obvious.
5. **Security** — avoid command injection, SQL injection, XSS, and other OWASP top-10 issues.
6. **Test coverage** — when adding functionality, add or update corresponding tests.
7. **Confirm before destructive actions** — deleting files, resetting branches, or modifying CI requires user confirmation.
8. **Update this file** — if you add new tooling, change the project structure, or establish new conventions, update the relevant section of CLAUDE.md.

---

## Environment Variables

Document required environment variables here as they are introduced. Example format:

| Variable | Required | Description |
|----------|----------|-------------|
| `DEADLINE_DB_PATH` | No | Path to local deadline database (default: `~/.deadline_reader/db.json`) |

Store secrets in a `.env` file (gitignored) and document the keys (not values) here.

---

## Testing

Once a test framework is configured:

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=src/deadline_reader --cov-report=term-missing

# Run a single file
pytest tests/test_parser.py
```

Tests must pass before merging any PR.

---

## CI/CD

CI configuration has not been added yet. When added (e.g., GitHub Actions), document the workflows here and note:

- Which branch triggers CI
- How to read CI results
- What must pass before merge

---

## Changelog

| Date | Change |
|------|--------|
| 2026-04-10 | Initial CLAUDE.md created for empty repository |
