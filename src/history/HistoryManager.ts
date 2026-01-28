import * as vscode from 'vscode';

export interface HistoryItem {
    id: string;
    timestamp: number;
    sourcePath: string;
    targetPath: string;
    sourceFormat: string;
    targetFormat: string;
    fileSize: number;
}

export class HistoryManager {
    private static readonly STORAGE_KEY = 'fluxify.history';
    private static readonly MAX_ITEMS = 50;
    
    constructor(private context: vscode.ExtensionContext) {}

    public add(item: Omit<HistoryItem, 'id' | 'timestamp'>): void {
        const history = this.getHistory();
        
        const newItem: HistoryItem = {
            ...item,
            id: Date.now().toString(36) + Math.random().toString(36).substr(2),
            timestamp: Date.now()
        };

        // Add to beginning and limit size
        const updatedHistory = [newItem, ...history].slice(0, HistoryManager.MAX_ITEMS);
        
        this.context.globalState.update(HistoryManager.STORAGE_KEY, updatedHistory);
        this._onDidChangeHistory.fire();
    }

    public getHistory(): HistoryItem[] {
        return this.context.globalState.get<HistoryItem[]>(HistoryManager.STORAGE_KEY, []);
    }

    public clear(): void {
        this.context.globalState.update(HistoryManager.STORAGE_KEY, []);
        this._onDidChangeHistory.fire();
    }

    public remove(id: string): void {
        const history = this.getHistory().filter(item => item.id !== id);
        this.context.globalState.update(HistoryManager.STORAGE_KEY, history);
        this._onDidChangeHistory.fire();
    }

    private _onDidChangeHistory = new vscode.EventEmitter<void>();
    public readonly onDidChangeHistory = this._onDidChangeHistory.event;
}
