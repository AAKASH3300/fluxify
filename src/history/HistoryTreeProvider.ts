import * as vscode from 'vscode';
import * as path from 'path';
import { HistoryManager, HistoryItem } from './HistoryManager';

export class HistoryTreeProvider implements vscode.TreeDataProvider<HistoryItem | vscode.TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<HistoryItem | vscode.TreeItem | undefined | null | void> = new vscode.EventEmitter<HistoryItem | vscode.TreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<HistoryItem | vscode.TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private historyManager: HistoryManager) {
        // Refresh when history changes
        this.historyManager.onDidChangeHistory(() => {
            this.refresh();
        });
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: HistoryItem): vscode.TreeItem {
        return this.createHistoryTreeItem(element);
    }

    getChildren(element?: HistoryItem): Thenable<HistoryItem[]> {
        if (!element) {
            return Promise.resolve(this.historyManager.getHistory());
        }
        return Promise.resolve([]);
    }

    private createHistoryTreeItem(item: HistoryItem): vscode.TreeItem {
        const fileName = path.basename(item.sourcePath);
        const relativeTime = this.getRelativeTime(item.timestamp);
        
        const treeItem = new vscode.TreeItem(
            `${fileName} → ${item.targetFormat.toUpperCase()}`,
            vscode.TreeItemCollapsibleState.None
        );

        treeItem.description = relativeTime;
        treeItem.tooltip = `${item.sourcePath} \n→ ${item.targetPath}`;
        treeItem.contextValue = 'historyItem';
        
        // Command to open file on click
        treeItem.command = {
            command: 'fluxify.openHistoryFile',
            title: 'Open File',
            arguments: [item.targetPath]
        };

        treeItem.iconPath = new vscode.ThemeIcon('watch'); // Generic icon for now

        return treeItem;
    }

    private getRelativeTime(timestamp: number): string {
        const now = Date.now();
        const diff = now - timestamp;
        
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    }
}
