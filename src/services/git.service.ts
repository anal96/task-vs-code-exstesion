import * as vscode from 'vscode';

export class GitService {
    private gitApi: any;
    private currentBranch: string = '';
    private primaryRepo: any;

    private _onDidChangeBranch = new vscode.EventEmitter<string>();
    public readonly onDidChangeBranch = this._onDidChangeBranch.event;

    constructor() {
        this.initialize();
    }

    private async initialize() {
        const gitExtension = vscode.extensions.getExtension('vscode.git');
        if (gitExtension) {
            const api = gitExtension.isActive ? gitExtension.exports : await gitExtension.activate();
            this.gitApi = api.getAPI(1);

            // Wait for API to resolve repositories
            setTimeout(() => {
                if (this.gitApi.repositories.length > 0) {
                    this.setupRepo(this.gitApi.repositories[0]);
                }

                this.gitApi.onDidOpenRepository((repo: any) => {
                    this.setupRepo(repo);
                });
            }, 1000);
        }
    }

    private setupRepo(repo: any) {
        if (!this.primaryRepo) {
            this.primaryRepo = repo;
        }
        this.updateBranch(repo);
        // Listen to state changes (like switching branches)
        repo.state.onDidChange(() => {
            this.updateBranch(repo);
        });
    }

    private updateBranch(repo: any) {
        const branch = repo.state.HEAD?.name || '';
        if (this.currentBranch !== branch) {
            this.currentBranch = branch;
            this._onDidChangeBranch.fire(this.currentBranch);
        }
    }

    public getCurrentBranch(): string {
        return this.currentBranch;
    }

    public getPrimaryRepository(): any {
        return this.primaryRepo;
    }
}
