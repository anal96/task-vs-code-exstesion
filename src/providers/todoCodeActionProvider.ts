import * as vscode from 'vscode';

/**
 * Scans lines for TODO comments and provides a Quick Fix (Lightbulb)
 * action to convert them into a tracked Task.
 */
export class TodoCodeActionProvider implements vscode.CodeActionProvider {
    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix
    ];

    provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection
    ): vscode.ProviderResult<(vscode.CodeAction | vscode.Command)[]> {

        // We only look at the start line of the selection/cursor
        const lineText = document.lineAt(range.start.line).text;

        // Regex to find TODO, FIXME, or HACK
        const todoMatch = lineText.match(/\b(TODO|FIXME|HACK)[\s:]+(.*)/i);

        if (!todoMatch) {
            return [];
        }

        const tag = todoMatch[1].toUpperCase();
        const content = todoMatch[2].trim() || `Resolve ${tag}`;

        // Pre-fix the label so it's clear
        const taskLabel = `[${tag}] ${content}`;

        const action = new vscode.CodeAction(`Add to Tasks: "${taskLabel}"`, vscode.CodeActionKind.QuickFix);

        // This command will be registered in extension.ts
        action.command = {
            command: 'tasks.addTodoTask',
            title: 'Add to Tasks',
            arguments: [
                taskLabel,
                document.uri.fsPath,
                range.start.line
            ]
        };

        return [action];
    }
}
