import * as vscode from 'vscode';
import { Task, TaskContext } from '../models/task.model';

export interface StorageData {
    version: number;
    tasks: Task[];
}

export class StorageService {
    // Increment this when we change the data schema significantly in the future
    private static readonly CURRENT_VERSION = 1;

    // Separate storage keys
    private static readonly GLOBAL_KEY = 'tasks.global.data';
    private static readonly WORKSPACE_KEY = 'tasks.workspace.data';

    constructor(private context: vscode.ExtensionContext) { }

    /**
     * Retrieves tasks for a specific context, handling migrations if the data is from an older version.
     */
    public getTasks(taskContext: TaskContext): Task[] {
        const key = this.getKey(taskContext);

        // globalState: persists across all VS Code windows (Global tasks)
        // workspaceState: persists only for the current opened folder/workspace
        const state = taskContext === TaskContext.Global ? this.context.globalState : this.context.workspaceState;

        let data = state.get<StorageData | Task[]>(key);

        if (!data) {
            return [];
        }

        // --- Migration Logic ---
        // If the data is an array, it's from our V0 alpha version (before this refactor).
        // Let's migrate it seamlessly!
        if (Array.isArray(data)) {
            const v0Tasks = data as any[];
            data = {
                version: StorageService.CURRENT_VERSION,
                tasks: v0Tasks.map(t => ({
                    id: t.id,
                    label: t.label,
                    completed: t.completed || false,
                    createdAt: t.createdAt || Date.now(),
                    updatedAt: Date.now(),
                    priority: 'medium' as any, // TaskPriority.Medium
                    category: 'Inbox',
                    tags: [],
                    context: TaskContext.Global, // Old tasks were inherently global
                    timeSpentSeconds: 0
                }))
            };
            // Save the migrated data immediately
            this.saveTasks(data.tasks, taskContext);
        } else if (data.version < StorageService.CURRENT_VERSION) {
            // Future migration steps (v1 -> v2, etc.) go here
            data = this.migrateData(data);
            this.saveTasks(data.tasks, taskContext);
        }

        return data.tasks || [];
    }

    /**
     * Saves tasks for a specific context.
     */
    public saveTasks(tasks: Task[], taskContext: TaskContext): void {
        const key = this.getKey(taskContext);
        const state = taskContext === TaskContext.Global ? this.context.globalState : this.context.workspaceState;

        const data: StorageData = {
            version: StorageService.CURRENT_VERSION,
            tasks
        };

        state.update(key, data);
    }

    private getKey(context: TaskContext): string {
        return context === TaskContext.Global ? StorageService.GLOBAL_KEY : StorageService.WORKSPACE_KEY;
    }

    private migrateData(data: StorageData): StorageData {
        // Reserved for future v1 -> v2 migrations
        return data;
    }
}
