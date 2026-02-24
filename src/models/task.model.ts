export enum TaskPriority {
    Low = 'low',
    Medium = 'medium',
    High = 'high'
}

export enum TaskContext {
    Global = 'global',
    Workspace = 'workspace'
}

export interface Task {
    id: string;
    label: string;
    description?: string;
    completed: boolean;

    // Timestamps
    createdAt: number;
    updatedAt: number;
    completedAt?: number;
    dueDate?: number;

    // Categorization
    priority: TaskPriority;
    category: string; // e.g., 'Work', 'Personal', 'Study', or Custom
    tags: string[];

    // Context (Where does this task belong?)
    context: TaskContext;

    // Developer Smart Features
    filePath?: string;   // For jumping to code
    lineNumber?: number; // For jumping to code
    gitBranch?: string;  // For per-branch tracking

    // Time Tracking
    timeSpentSeconds: number;

    // Hierarchy & Dependencies
    parentId?: string;     // For subtasks
    dependencies?: string[]; // Array of task IDs that must be completed first

    // Advanced Time Manipulation
    recurring?: 'daily' | 'weekly' | 'monthly';
    snoozeUntil?: number;  // Timestamp: Task is hidden until this time
}
