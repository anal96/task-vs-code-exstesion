import * as vscode from 'vscode';
import { Task, TaskContext, TaskPriority } from '../models/task.model';
import { StorageService } from './storage.service';
import { GitService } from './git.service';

export class TaskService {
    private _tasks: Task[] = [];
    private _onDidChangeTasks = new vscode.EventEmitter<void>();
    public readonly onDidChangeTasks = this._onDidChangeTasks.event;

    // Currently active context (we can switch between Global and Workspace views later)
    private activeContext: TaskContext = TaskContext.Global;

    constructor(
        private context: vscode.ExtensionContext,
        private storageService: StorageService,
        private gitService: GitService
    ) {
        this.loadTasks();
    }

    /**
     * Set active context (Global or Workspace) and reload tasks
     */
    public setContext(contextMode: TaskContext): void {
        this.activeContext = contextMode;
        this.loadTasks();
    }

    public getActiveContext(): TaskContext {
        return this.activeContext;
    }

    public getTasks(): Task[] {
        let tasksToReturn = this._tasks;

        const branchAwareMode = vscode.workspace.getConfiguration('tasks').get<boolean>('branchAwareMode');
        if (branchAwareMode && this.activeContext === TaskContext.Workspace) {
            const currentBranch = this.gitService.getCurrentBranch();
            // If task is scoped to a branch, only show it if the branch matches. If no branch, show it everywhere.
            tasksToReturn = tasksToReturn.filter(t => !t.gitBranch || t.gitBranch === currentBranch);
        }

        // Filter out snoozed tasks
        const now = Date.now();
        tasksToReturn = tasksToReturn.filter(t => !t.snoozeUntil || t.snoozeUntil <= now);

        return tasksToReturn;
    }

    public addTask(
        label: string,
        priority: TaskPriority = TaskPriority.Medium,
        category: string = 'Inbox',
        description?: string,
        filePath?: string,
        lineNumber?: number,
        parentId?: string
    ): void {
        let gitBranch: string | undefined;
        if (vscode.workspace.getConfiguration('tasks').get<boolean>('branchAwareMode') && this.activeContext === TaskContext.Workspace) {
            gitBranch = this.gitService.getCurrentBranch() || undefined;
        }

        const newTask: Task = {
            id: vscode.workspace.getConfiguration('tasks').get('useUUIDs')
                ? crypto.randomUUID()
                : Date.now().toString(),
            label,
            description,
            completed: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            priority,
            category,
            tags: [],
            context: this.activeContext,
            timeSpentSeconds: 0,
            filePath,
            lineNumber,
            gitBranch,
            parentId
        };

        this._tasks.push(newTask);
        this.saveTasks();
    }

    public addSubtask(parentId: string, label: string): void {
        const parentTask = this._tasks.find(t => t.id === parentId);
        if (parentTask) {
            this.addTask(label, parentTask.priority, parentTask.category, undefined, undefined, undefined, parentId);
        }
    }

    public toggleTask(id: string): void {
        const task = this._tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            task.updatedAt = Date.now();

            if (task.completed) {
                // Feature: Recurring Tasks
                if (task.recurring) {
                    task.completed = false; // Reset it immediately!

                    // Add time based on recurring frequency
                    const now = new Date();
                    if (task.recurring === 'daily') {
                        now.setDate(now.getDate() + 1);
                    } else if (task.recurring === 'weekly') {
                        now.setDate(now.getDate() + 7);
                    } else if (task.recurring === 'monthly') {
                        now.setMonth(now.getMonth() + 1);
                    }

                    task.snoozeUntil = now.getTime(); // Hide it until the next occurrence!
                    vscode.window.showInformationMessage(`"${task.label}" completed! Scheduled next occurrence for ${task.recurring}.`);
                } else {
                    task.completedAt = Date.now();

                    // Check Configuration: Auto Delete Completed
                    const autoDelete = vscode.workspace.getConfiguration('tasks').get<boolean>('autoDeleteCompleted');
                    if (autoDelete) {
                        this.deleteTask(id);
                        return; // Prevent normal saving flow as it's already deleted
                    }
                }
            } else {
                task.completedAt = undefined;
            }
            this.saveTasks();
        }
    }

    public snoozeTask(id: string, hours: number): void {
        const task = this._tasks.find(t => t.id === id);
        if (task) {
            // Add hours to current time
            task.snoozeUntil = Date.now() + (hours * 60 * 60 * 1000);
            task.updatedAt = Date.now();
            this.saveTasks();
        }
    }

    public setRecurring(id: string, frequency: 'daily' | 'weekly' | 'monthly' | undefined): void {
        const task = this._tasks.find(t => t.id === id);
        if (task) {
            task.recurring = frequency;
            task.updatedAt = Date.now();
            this.saveTasks();
        }
    }

    public clearCompletedTasks(): void {
        this._tasks = this._tasks.filter(t => !t.completed);
        this.saveTasks();
    }

    public deleteTask(id: string): void {
        this._tasks = this._tasks.filter(t => t.id !== id);
        this.saveTasks();
    }

    public getPendingCount(): number {
        return this.getTasks().filter(t => !t.completed).length;
    }

    private saveTasks(): void {
        this.storageService.saveTasks(this._tasks, this.activeContext);
        this._onDidChangeTasks.fire();
    }

    private loadTasks(): void {
        this._tasks = this.storageService.getTasks(this.activeContext);
        this._onDidChangeTasks.fire();
    }

    // Explicitly call this when Git branch changes from external
    public notifyBranchChanged(): void {
        this._onDidChangeTasks.fire();
    }
}
