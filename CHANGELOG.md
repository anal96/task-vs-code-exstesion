# Changelog

All notable changes to the **Trineo Smart Tasks** extension will be documented in this file.

The format follows **Keep a Changelog** and **Semantic Versioning**.

---

## [1.0.0] - In Development

### Added

* **Global & Workspace Context Switching**

  * Switch between repository-specific tasks and global tasks shared across environments.

* **Task Priority System**

  * 🔥 High
  * 🔸 Medium
  * 🧊 Low

* **Smart Task Categories**

  * Inbox
  * Work
  * Personal
  * Study
  * Custom categories

* **Dynamic Progress Indicators**
  Category folders display completion progress:

  ```
  Inbox 3/4 (75%)
  ```

* **Subtasks Support**
  Create subtasks under a parent task to break larger tasks into smaller steps.

* **Task Snooze Feature**
  Temporarily hide tasks for a configurable number of hours.

* **Recurring Tasks**
  Tasks can repeat automatically:

  * Daily
  * Weekly
  * Monthly

* **TODO Code Action Integration**
  Detect `// TODO` comments and convert them into tasks using Quick Fix.

* **Smart Jump-to-Code**
  Tasks imported from code remember the file path and line number.

* **Add Task From Editor Selection**
  Convert selected text in the editor into a task.

* **Git Integration**
  Link tasks directly to Git commits from the Source Control panel.

* **Branch-Aware Tasks**
  Tasks can be stored and filtered by Git branch.

* **Task Templates**
  Predefined templates for common workflows:

  **Feature Workflow**

  * Setup database & models
  * Create API endpoints
  * Implement frontend component
  * Write unit tests

  **Bug Fix Workflow**

  * Reproduce issue
  * Write failing test
  * Implement fix
  * Verify tests
  * Commit changes

* **Persistent Storage Layer**
  Implemented `StorageService` using:

  * `globalState`
  * `workspaceState`

* **Extension Settings**
  Added configurable settings:

  ```
  tasks.defaultPriority
  tasks.showCompleted
  tasks.autoDeleteCompleted
  tasks.branchAwareMode
  tasks.enableReminders
  ```

### Improved

* Optimized task sorting based on:

  * completion state
  * priority
  * creation time

* Improved TreeView performance.

### Changed

* Replaced the original **Hello World extension structure** with a scalable architecture using:

  * Services
  * Providers
  * Models

* Refactored core components:

  * `TaskService`
  * `StorageService`
  * `TaskTreeProvider`

* Updated UI icons using **VS Code ThemeIcon API**.

---

## [0.1.4] - Latest

### Fixed

* Fixed extension activation issues in Antigravity.
* Fixed missing task commands in the Tasks panel.
* Improved compatibility with editors based on VS Code.
* Resolved task storage inconsistencies.

### Changed

* Updated `engines.vscode` compatibility range.
* Improved extension activation events.

---

## [0.1.3]

### Added

* Support for **Open VSX publishing**.
* Improved repository metadata for marketplace linking.

### Fixed

* Fixed repository detection issue during publishing.
* Fixed packaging errors during `vsce package`.

---

## [0.1.2]

### Added

* Initial **Antigravity editor compatibility improvements**.
* Updated dependency versions.

### Fixed

* Fixed extension compatibility errors related to VS Code engine version.

---

## [0.1.1]

### Added

* Git branch awareness for tasks.
* Task snooze functionality.
* Recurring tasks support.
* Ability to link tasks to Git commits.

### Improved

* Improved task categorization system.

---

## [0.1.0]

### Initial Release

Features included:

* Task manager integrated into the VS Code activity bar.
* Task categories:

  * Inbox
  * Work
  * Personal
  * Study
* Priority levels (High, Medium, Low).
* Subtasks support.
* Task completion tracking.
* Clear completed tasks.
* Context switching between Global and Workspace tasks.
* Add task from editor selection.
* Quick action to convert TODO comments into tasks.
* Tree view task explorer.
* Status bar pending task counter.

---

## [0.0.1] - Alpha

### Added

* Initial extension project generated using the VS Code extension generator.
* Basic `tasks.helloWorld` command.
* TypeScript development environment.
* ESBuild bundling configuration.
* Initial testing setup.

---
