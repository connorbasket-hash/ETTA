# Desktop architecture

## Target

ETTA is distributed as one signed Electron application from this repository. Electron Builder creates the platform installer; end users do not install Electron Builder, Node.js, Python, or npm.

```text
Electron Builder
  -> signed installer
    -> Electron desktop shell
      -> Next.js standalone server on 127.0.0.1 and a random port
        -> SQLite database in the per-user application-data directory
        -> Microsoft Graph
        -> Jira REST API
```

## Current boundaries

- `electron/` owns application lifecycle, the desktop window, resource locations, and backend startup.
- `src/app` owns the UI and server route handlers.
- `src/lib` owns database, classification, Outlook, and Jira behavior.
- `scripts/` temporarily contains the Python Microsoft Graph and Outlook COM implementations.
- `electron-builder.json` owns installer composition, while signing and release-contract automation remain to be added.

## Data locations

Installed code is immutable. Runtime data belongs beneath Electron's `app.getPath('userData')` directory:

```text
data/timekeeper.db
data/msal-cache.json
data/outlook-device-flow.json
logs/server.log
```

No credentials, databases, virtual environments, build output, or dependency directories are committed.

## Planned migration

1. Verify the Electron development and packaged application lifecycle.
2. Add authenticated local-server requests and explicit Electron navigation restrictions.
3. Move Microsoft Graph authentication and extraction to TypeScript with `@azure/msal-node`.
4. Store Microsoft and Jira credentials through OS-backed encryption.
5. Replace ad-hoc SQLite migrations with versioned transactional migrations and backups.
6. Add installer signing, artifact verification, upgrade tests, and clean-VM validation modeled on TritonAI Installer.
7. Optionally expose the application service through a local MCP endpoint for TritonAI and Codex.

## Legacy Python boundary

The raw Python scripts are included as a transitional resource, but Electron does not yet bundle a Python runtime. Graph-in-Node removes that dependency for the supported path. Windows Outlook COM can remain an optional helper if it is still required.
