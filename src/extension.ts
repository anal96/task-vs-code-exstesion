import * as vscode from 'vscode';
import { StorageService } from './services/storage.service';
import { TaskService } from './services/task.service';
import { TaskTreeProvider, TaskTreeItem } from './providers/taskTreeProvider';
import { TaskContext, TaskPriority } from './models/task.model';
import { TodoCodeActionProvider } from './providers/todoCodeActionProvider';
import { GitService } from './services/git.service';

let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
	console.log('Tasks extension is now active in scalable mode.');

	// 1. Initialize Storage & Git
	const storageService = new StorageService(context);
	const gitService = new GitService();

	// 2. Initialize Core Service
	const taskService = new TaskService(context, storageService, gitService);

	// 3. Initialize UI Providers
	const taskTreeProvider = new TaskTreeProvider(taskService);
	vscode.window.registerTreeDataProvider('tasksView', taskTreeProvider);

	// 4. Setup Status Bar
	statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
	statusBarItem.command = 'tasksView.focus';
	context.subscriptions.push(statusBarItem);

	const updateStatusBar = () => {
		const count = taskService.getPendingCount();
		if (count > 0) {
			statusBarItem.text = `$(checklist) ${count} Tasks`;
			statusBarItem.show();
		} else {
			statusBarItem.hide();
		}
	};

	taskService.onDidChangeTasks(updateStatusBar);
	updateStatusBar();

	// 5. Register Commands
	context.subscriptions.push(
		vscode.commands.registerCommand('tasks.addTask', async () => {
			const taskLabel = await vscode.window.showInputBox({
				prompt: 'What needs to be done?',
				placeHolder: 'e.g. Refactor API endpoints'
			});

			if (!taskLabel) {
				return;
			}

			const defaultPriorityConfig = vscode.workspace.getConfiguration('tasks').get<string>('defaultPriority') || 'medium';
			let initialPriority = TaskPriority.Medium;
			if (defaultPriorityConfig === 'high') {
				initialPriority = TaskPriority.High;
			}
			if (defaultPriorityConfig === 'low') {
				initialPriority = TaskPriority.Low;
			}

			// Optional: Ask for priority (We can make this configurable later)
			const priorityChoice = await vscode.window.showQuickPick(
				[
					{ label: '🔥 High', description: 'Priority', value: TaskPriority.High },
					{ label: '🔸 Medium', description: 'Priority', value: TaskPriority.Medium },
					{ label: '🧊 Low', description: 'Priority', value: TaskPriority.Low }
				],
				{ placeHolder: `Select priority (Default: ${initialPriority})`, ignoreFocusOut: false }
			);

			const priority = priorityChoice ? priorityChoice.value : initialPriority;

			// Category Selection
			const defaultCategories = ['Inbox', 'Work', 'Personal', 'Study'];
			const existingCategories = [...new Set(taskService.getTasks().map(t => t.category))].filter(c => !defaultCategories.includes(c));
			const categoryChoices = [...defaultCategories, ...existingCategories, '(Create New Category)'];

			const categoryChoice = await vscode.window.showQuickPick(categoryChoices, {
				placeHolder: 'Select Category (Default: Inbox)',
			});

			let category = 'Inbox';
			if (categoryChoice === '(Create New Category)') {
				const newCategory = await vscode.window.showInputBox({ prompt: 'Enter new category name' });
				if (newCategory) {
					category = newCategory;
				}
			} else if (categoryChoice) {
				category = categoryChoice;
			}

			taskService.addTask(taskLabel, priority, category);
			vscode.window.setStatusBarMessage(`Task added to ${category}: ${taskLabel}`, 3000);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('tasks.completeTask', (item: TaskTreeItem) => {
			if (item && item.task) {
				// Block child task if parent is not completed
				if (item.task.parentId) {
					const parentTask = taskService.getTasks().find(t => t.id === item.task.parentId);
					if (parentTask && !parentTask.completed && !item.task.completed) {
						vscode.window.showWarningMessage(`Blocked: Parent task "${parentTask.label}" must be completed first!`);
						return;
					}
				}
				taskService.toggleTask(item.task.id);
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('tasks.deleteTask', async (item: TaskTreeItem) => {
			if (item && item.task) {
				const confirm = await vscode.window.showWarningMessage(
					`Delete task: "${item.task.label}"?`,
					{ modal: true },
					'Delete'
				);

				if (confirm === 'Delete') {
					taskService.deleteTask(item.task.id);
				}
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('tasks.refreshTasks', () => {
			taskTreeProvider.refresh();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('tasks.clearCompleted', async () => {
			const confirm = await vscode.window.showWarningMessage(
				'Are you sure you want to clear all completed tasks?',
				{ modal: true },
				'Clear All'
			);

			if (confirm === 'Clear All') {
				taskService.clearCompletedTasks();
				vscode.window.showInformationMessage('Cleared all completed tasks.');
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('tasks.snoozeTask', async (item: TaskTreeItem) => {
			if (item && item.task) {
				const hoursStr = await vscode.window.showInputBox({
					prompt: `Snooze "${item.task.label}" for how many hours?`,
					placeHolder: 'e.g., 1, 12, 24'
				});

				const hours = parseInt(hoursStr || '0', 10);
				if (hours > 0) {
					taskService.snoozeTask(item.task.id, hours);
					vscode.window.showInformationMessage(`Task snoozed for ${hours} hours.`);
				}
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('tasks.makeRecurring', async (item: TaskTreeItem) => {
			if (item && item.task) {
				const choice = await vscode.window.showQuickPick(
					[
						{ label: 'Daily', value: 'daily' },
						{ label: 'Weekly', value: 'weekly' },
						{ label: 'Monthly', value: 'monthly' },
						{ label: 'None (Remove Recurring)', value: undefined }
					],
					{ placeHolder: `Set recurring frequency for "${item.task.label}"` }
				);

				if (choice !== undefined) {
					taskService.setRecurring(item.task.id, choice.value as any);
					if (choice.value) {
						vscode.window.showInformationMessage(`Task is now recurring: ${choice.label}.`);
					} else {
						vscode.window.showInformationMessage('Task recurring schedule removed.');
					}
				}
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('tasks.addSubtask', async (item: TaskTreeItem) => {
			if (item && item.task) {
				const taskLabel = await vscode.window.showInputBox({
					prompt: `Add subtask for "${item.task.label}"`,
					placeHolder: 'e.g., Create API endpoints'
				});

				if (taskLabel) {
					taskService.addSubtask(item.task.id, taskLabel);
					vscode.window.showInformationMessage(`Added subtask to: ${item.task.label}`);
				}
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('tasks.addFromTemplate', async () => {
			const choice = await vscode.window.showQuickPick(
				[
					{ label: '🚀 New Feature Checklist', description: 'Standard feature development steps', template: 'feature' },
					{ label: '🐛 Bug Fix Flow', description: 'Standard reproduction and fix steps', template: 'bug' }
				],
				{ placeHolder: 'Select a Task Template' }
			);

			if (choice) {
				const parentName = await vscode.window.showInputBox({
					prompt: 'Enter the main task name for this template',
					placeHolder: 'e.g., Implement User Login'
				});

				if (!parentName) { return; }

				// Create parent
				taskService.addTask(parentName, TaskPriority.High, 'Inbox');
				// We need its ID to add subtasks. Let's find the newest task.
				const tasks = taskService.getTasks();
				const parentId = tasks[tasks.length - 1].id;

				if (choice.template === 'feature') {
					taskService.addSubtask(parentId, 'Setup Database & Models');
					taskService.addSubtask(parentId, 'Create API Endpoints');
					taskService.addSubtask(parentId, 'Implement Frontend Component');
					taskService.addSubtask(parentId, 'Write Unit Tests');
				} else if (choice.template === 'bug') {
					taskService.addSubtask(parentId, 'Reproduce locally');
					taskService.addSubtask(parentId, 'Write failing test case');
					taskService.addSubtask(parentId, 'Implement fix');
					taskService.addSubtask(parentId, 'Verify test passes');
					taskService.addSubtask(parentId, 'Commit and push');
				}
				vscode.window.showInformationMessage(`Template applied: ${choice.label}`);
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('tasks.linkTaskToCommit', async () => {
			const repo = gitService.getPrimaryRepository();
			if (!repo) {
				vscode.window.showErrorMessage('No active Git repository found.');
				return;
			}

			// Get pending tasks for this branch/workspace
			const pendingTasks = taskService.getTasks().filter(t => !t.completed);
			if (pendingTasks.length === 0) {
				vscode.window.showInformationMessage('No incomplete tasks to link!');
				return;
			}

			// Warn user about incomplete tasks (Addresses user requirement)
			vscode.window.showWarningMessage(`Warning: You have ${pendingTasks.length} incomplete tasks on this branch.`);

			const choices = pendingTasks.map(t => ({
				label: t.label,
				description: t.category,
				task: t
			}));

			const choice = await vscode.window.showQuickPick(choices, {
				placeHolder: 'Select a task to link to this commit'
			});

			if (choice) {
				const currentMessage = repo.inputBox.value;
				const linkText = `\n\nRelated Task: ${choice.task.label}`;
				repo.inputBox.value = currentMessage + linkText;
				vscode.window.showInformationMessage(`Linked task to commit message.`);
			}
		})
	);

	// Future command bindings: Switch Context
	context.subscriptions.push(
		vscode.commands.registerCommand('tasks.switchContext', async () => {
			const mode = await vscode.window.showQuickPick(
				[
					{ label: '$(globe) Global Tasks', value: TaskContext.Global },
					{ label: '$(briefcase) Workspace Tasks', value: TaskContext.Workspace }
				],
				{ placeHolder: 'Select Context' }
			);

			if (mode) {
				taskService.setContext(mode.value);
				vscode.window.showInformationMessage(`Switched to ${mode.label}`);
			}
		})
	);
	// Smart Features bindings
	context.subscriptions.push(
		vscode.commands.registerCommand('tasks.jumpToTask', async (task) => {
			if (task && task.filePath) {
				const document = await vscode.workspace.openTextDocument(task.filePath);
				const editor = await vscode.window.showTextDocument(document);
				if (task.lineNumber !== undefined) {
					const position = new vscode.Position(task.lineNumber, 0);
					editor.selection = new vscode.Selection(position, position);
					editor.revealRange(new vscode.Range(position, position));
				}
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('tasks.addFromSelection', async () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				vscode.window.showErrorMessage('No active text editor found.');
				return;
			}

			const selection = editor.selection;
			if (selection.isEmpty) {
				vscode.window.showErrorMessage('Please select some text to create a task.');
				return;
			}

			const selectedText = editor.document.getText(selection).trim();
			// Truncate if too long
			const label = selectedText.length > 50 ? selectedText.substring(0, 50) + '...' : selectedText;

			taskService.addTask(
				label,
				TaskPriority.Medium, // Default
				'Inbox', // Default
				selectedText, // Put the full snippet in exactly as the description
				editor.document.fileName, // So user can jump back
				selection.start.line // Exact line of snippet start
			);

			vscode.window.setStatusBarMessage(`Task added from selection!`, 3000);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('tasks.addTodoTask', (label: string, filePath: string, lineNumber: number) => {
			taskService.addTask(
				label,
				TaskPriority.Medium,
				'TODO',
				'Imported from code comment',
				filePath,
				lineNumber
			);
			vscode.window.showInformationMessage(`Added TODO to Tasks: ${label}`);
		})
	);

	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider(
			{ scheme: 'file' },
			new TodoCodeActionProvider(),
			{ providedCodeActionKinds: TodoCodeActionProvider.providedCodeActionKinds }
		)
	);

	// Listen for configuration changes
	// Git Service Listener
	context.subscriptions.push(
		gitService.onDidChangeBranch(branch => {
			const branchAwareMode = vscode.workspace.getConfiguration('tasks').get<boolean>('branchAwareMode');
			if (branchAwareMode && taskService.getActiveContext() === TaskContext.Workspace) {
				taskService.notifyBranchChanged();
				taskTreeProvider.refresh();
				if (branch) {
					vscode.window.setStatusBarMessage(`[Tasks] Switched to branch: ${branch}`, 3000);
				}
			}
		})
	);

	// Listen for configuration changes
	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('tasks.showCompleted') || e.affectsConfiguration('tasks.branchAwareMode')) {
				taskService.notifyBranchChanged(); // Force re-eval of branch tasks
				taskTreeProvider.refresh();
			}
		})
	);
}

export function deactivate() {
	if (statusBarItem) {
		statusBarItem.dispose();
	}
}
