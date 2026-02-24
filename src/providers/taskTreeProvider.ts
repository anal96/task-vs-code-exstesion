import * as vscode from 'vscode';
import { Task, TaskPriority } from '../models/task.model';
import { TaskService } from '../services/task.service';

export type TreeNode = CategoryTreeItem | TaskTreeItem;

export class TaskTreeProvider implements vscode.TreeDataProvider<TreeNode> {
    private _onDidChangeTreeData: vscode.EventEmitter<TreeNode | undefined | null | void> = new vscode.EventEmitter<TreeNode | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<TreeNode | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private taskService: TaskService) {
        this.taskService.onDidChangeTasks(() => this.refresh());
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: TreeNode): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TreeNode): Thenable<TreeNode[]> {
        const showCompleted = vscode.workspace.getConfiguration('tasks').get<boolean>('showCompleted');
        let tasks = this.taskService.getTasks();

        if (!showCompleted) {
            tasks = tasks.filter(t => !t.completed);
        }

        if (element) {
            // It's a Category Node! Deliver its children (Tasks)
            if (element instanceof CategoryTreeItem) {
                // Only return tasks that have NO parent
                const categoryTasks = tasks.filter(t => t.category === element.categoryName && !t.parentId);

                const sortedTasks = categoryTasks.sort((a, b) => {
                    // 1. Pending tasks top, Completed tasks bottom
                    if (a.completed !== b.completed) {
                        return a.completed ? 1 : -1;
                    }
                    // 2. High Priority top, Low Priority bottom
                    const priorityWeight = { [TaskPriority.High]: 3, [TaskPriority.Medium]: 2, [TaskPriority.Low]: 1 };
                    if (priorityWeight[a.priority] !== priorityWeight[b.priority]) {
                        return priorityWeight[b.priority] - priorityWeight[a.priority];
                    }
                    // 3. Newest first
                    return b.createdAt - a.createdAt;
                });

                return Promise.resolve(sortedTasks.map(task => {
                    const hasChildren = tasks.some(t => t.parentId === task.id);
                    const isBlocked = task.parentId ? !tasks.find(p => p.id === task.parentId)?.completed && !task.completed : false;
                    return new TaskTreeItem(task, hasChildren, isBlocked);
                }));
            } else if (element instanceof TaskTreeItem) {
                // Return subtasks
                const childTasks = tasks.filter(t => t.parentId === element.task.id);
                const sortedChildTasks = childTasks.sort((a, b) => {
                    if (a.completed !== b.completed) {return a.completed ? 1 : -1;}
                    return a.createdAt - b.createdAt;
                });
                return Promise.resolve(sortedChildTasks.map(task => {
                    const hasChildren = tasks.some(t => t.parentId === task.id);
                    const isBlocked = task.parentId ? !tasks.find(p => p.id === task.parentId)?.completed && !task.completed : false;
                    return new TaskTreeItem(task, hasChildren, isBlocked);
                }));
            }
            return Promise.resolve([]);
        } else {
            // Root Level: Group by Category
            const categories = [...new Set(tasks.map(t => t.category))].sort();

            if (categories.length === 0) {
                return Promise.resolve([]); // Tree view shows "Welcome" view or emptiness
            }

            const categoryNodes = categories.map(category => {
                // For progress bar: count ALL tasks in category, or just parent tasks? Let's count all.
                const categoryTasks = tasks.filter(t => t.category === category);
                const completedCount = categoryTasks.filter(t => t.completed).length;
                const totalCount = categoryTasks.length;
                return new CategoryTreeItem(category, completedCount, totalCount);
            });

            return Promise.resolve(categoryNodes);
        }
    }
}

export class CategoryTreeItem extends vscode.TreeItem {
    constructor(
        public readonly categoryName: string,
        public readonly completedCount: number,
        public readonly totalCount: number
    ) {
        super(
            categoryName,
            vscode.TreeItemCollapsibleState.Expanded
        );

        this.contextValue = 'categoryItem';

        // Dynamic icons based on completion!
        const isAllDone = totalCount > 0 && completedCount === totalCount;
        this.iconPath = new vscode.ThemeIcon(
            isAllDone ? 'check-all' : 'folder-library',
            isAllDone ? new vscode.ThemeColor('testing.iconPassed') : undefined
        );

        // Progress Bar Text (e.g., "3/4 (75%)")
        const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
        this.description = `${completedCount}/${totalCount} (${percentage}%)`;
        this.tooltip = `Category: ${categoryName}\nCompletion: ${percentage}%`;
    }
}

export class TaskTreeItem extends vscode.TreeItem {
    constructor(
        public readonly task: Task,
        hasChildren: boolean = false,
        public readonly isBlocked: boolean = false
    ) {
        super(task.label, hasChildren ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None);

        this.id = task.id;
        this.tooltip = this.generateTooltip(task);
        this.description = this.generateDescription(task);
        this.contextValue = 'taskItem';

        this.iconPath = this.getIcon(task, isBlocked);

        if (task.filePath) {
            this.command = {
                command: 'tasks.jumpToTask',
                title: 'Jump to File',
                arguments: [task]
            };
        }
    }

    private generateTooltip(task: Task): string {
        const lines = [
            task.label,
            `Status: ${task.completed ? 'Completed' : 'Pending'}`,
            `Priority: ${task.priority}`
        ];
        if (task.description) {
            lines.unshift(`Description: ${task.description}`);
        }
        return lines.join('\n');
    }

    private generateDescription(task: Task): string {
        const parts = [];
        if (task.completed) {
            parts.push('✓');
        } else {
            if (task.priority === TaskPriority.High) {
                parts.push('🔥');
            } else if (task.priority === TaskPriority.Low) {
                parts.push('🧊');
            }
        }
        return parts.join(' ');
    }

    private getIcon(task: Task, isBlocked: boolean): vscode.ThemeIcon {
        if (task.completed) {
            return new vscode.ThemeIcon('pass-filled', new vscode.ThemeColor('testing.iconPassed'));
        }
        if (isBlocked) {
            return new vscode.ThemeIcon('lock', new vscode.ThemeColor('disabledForeground'));
        }
        switch (task.priority) {
            case TaskPriority.High:
                return new vscode.ThemeIcon('circle-outline', new vscode.ThemeColor('errorForeground'));
            case TaskPriority.Medium:
                return new vscode.ThemeIcon('circle-outline', new vscode.ThemeColor('charts.orange'));
            case TaskPriority.Low:
                return new vscode.ThemeIcon('circle-outline', new vscode.ThemeColor('descriptionForeground'));
            default:
                return new vscode.ThemeIcon('circle-outline');
        }
    }
}
