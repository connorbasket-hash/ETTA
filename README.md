# ETTA Time Tracker

ETTA turns Outlook sent mail and calendar activity into reviewed Jira worklogs. This repository contains both the existing Next.js application and its Electron desktop shell.

## Repository structure

```text
electron/             Electron main process, preload bridge, and desktop TypeScript config
src/                  Next.js UI, API routes, and application logic
scripts/              Outlook helpers and build staging scripts
public/               Application images and static assets
tests/                Python Outlook regression tests
electron-builder.json Desktop installer configuration
```

The production desktop application starts the Next.js standalone server on a private loopback port and displays it in a sandboxed Electron window. Application data is stored under Electron's per-user `userData` directory, not beside the installed application.

## Development

Prerequisites for the current migration stage:

- Node.js 18 or newer
- Python 3.9 or newer for the legacy Outlook helper

```powershell
npm install
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
npm run dev
```

The Electron window waits for the Next.js development server at `http://127.0.0.1:3000`.

## Builds

```powershell
npm run lint
npm run typecheck
npm run build
npm run package:win
```

Windows installer output is written to `artifacts/`.

## Migration status

The desktop shell and installer structure are in place. Microsoft Graph still runs through the existing Python helper and will be migrated to Node.js/TypeScript. Until that port is complete, packaged Outlook import requires a bundled Python helper; development can use `.venv`.

See [docs/architecture.md](docs/architecture.md) for the target architecture and remaining work.
