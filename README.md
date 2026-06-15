# Clarity Loop AI Book Studio — Desktop

Standalone Windows desktop shell for the production [Clarity Loop AI Book Studio](https://clarity-loop-books.vercel.app), published by **ETL GIS Consulting LLC**.

This repository is intentionally separate from the Clarity Loop Books SaaS repository. The desktop app is a thin Tauri v2 wrapper: authentication, book-generation business logic, database access, and API traffic remain in the hosted SaaS.

## Security boundary

- The webview starts at and permits embedded navigation only on `https://clarity-loop-books.vercel.app`.
- Navigations to unrelated HTTP(S) origins are blocked in the webview and opened with the operating system's default browser when supported.
- Non-HTTP(S) navigation is blocked.
- The remote page receives no Tauri command permissions. Filesystem, shell, dialog, database, and other broad native capabilities are not enabled.
- The app requires an internet connection; `src/index.html` is only a source-safe fallback asset for Tauri packaging.

## Window and application metadata

| Setting | Value |
| --- | --- |
| Product name | Clarity Loop AI Book Studio |
| Publisher | ETL GIS Consulting LLC |
| Identifier | `com.etlgisconsulting.clarityloop.desktop` |
| Initial size | 1440 × 900 |
| Minimum size | 1024 × 700 |
| Resizable | Yes |

## Development

Prerequisites: Node.js 20+, Rust stable, and the platform prerequisites from the Tauri v2 documentation.

```bash
npm install
npm run dev
```

The supported installer build is performed on GitHub's `windows-latest` runner. `npm run build:windows` deliberately refuses to run on non-Windows hosts. For v1.0.0, it builds the NSIS bundle and copies it to a normalized artifact name:

- `dist/windows/ClarityLoopSetup.exe`

## Windows installers

Run the **Build Windows Desktop** workflow manually (`workflow_dispatch`) or push a version tag such as `v0.1.0`. Download the output at:

**GitHub → clarity-loop-desktop → Actions → Build Windows Desktop → latest successful run → Artifacts**

Select the `clarity-loop-windows-installers` artifact. Installer files are generated only on GitHub's Windows runner and are never committed to this repository.

No icon binaries are stored in source control. The current build uses Tauri's generated/default packaging behavior. Branded Windows icon generation can be added later as a CI-only step, without committing image or icon files.

MSI packaging is a future enhancement and is not required for v1.0.0. It will be enabled after Windows icon handling is finalized.

## Roadmap hooks (not enabled)

Future native work may add narrowly scoped capabilities for:

1. Local manuscript storage.
2. DOCX and PDF export.
3. Offline draft editing and synchronization.
4. Encrypted backup and restore.

These are documentation hooks only. No filesystem, export, offline database, encryption, shell, or dialog implementation or permission is enabled today. Each feature should receive a dedicated threat review and least-privilege capability before implementation.

## Source-only policy

Binary assets, installers, compiled outputs, archives, dependency directories, and Tauri targets are excluded by `.gitignore`. Do not commit `.exe`, `.msi`, icon/image files, archives, or compiled artifacts.
