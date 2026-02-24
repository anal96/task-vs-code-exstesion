# Change Log

All notable changes to the "Tasks" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [1.0.0] - In Development

### Added
- **Global & Workspace Contexts**: Swap between Repository tasks and Global Tasks that span across VS Code environments.
- **Task Priorities**: Categorize your focus using 🔥 High, 🔸 Medium, and 🧊 Low values.
- **Tree Groups & Categories**: Smart grouping folders with dynamic UI calculation indicating task progress (e.g. `Inbox: 3/4 (75%)`).
- **TODO Code Actions**: Highlight `// TODO` line comments and trigger VS Code Quick Actions (Lightbulb) to import them directly to your task list.
- **Smart Jump-to-Code**: Imported code tasks remember their file and line number. Clicking them triggers a jump directly to the editor position!
- **Data Persistence Manager**: Built-out a StorageService to handle version-safe migrations (`globalState` & `workspaceState`).
- **Settings configuration**: Fine tune `tasks.showCompleted`, `tasks.autoDeleteCompleted` and `tasks.defaultPriority`.

### Changed
- Replaced monolithic `helloWorld` design pattern inside `extension.ts` into a highly scalable, controller/provider MVC architecture.
- Re-themed tree icons utilizing internal `vscode.ThemeIcon` resources (`testing.iconPassed`, `errorForeground`, `charts.orange`).

## [0.0.1] - Alpha
- Initial project generated.
- Added simple `tasks.helloWorld` functionality.
- Set up Typescript & ESBuild infrastructure.