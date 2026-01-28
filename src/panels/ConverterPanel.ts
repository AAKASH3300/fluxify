import * as vscode from 'vscode';
import * as path from 'path';
import { ConversionManager } from '../converters/ConversionManager';
import { FileInfo } from '../types/FileInfo';

export class ConverterPanel {
    public static currentPanel: ConverterPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _conversionManager: ConversionManager;

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._conversionManager = new ConversionManager();

        this._update();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'selectFile':
                        await this._selectFile();
                        break;
                    case 'convert':
                        await this._convertFile(message.format);
                        break;
                    case 'showInfo':
                        vscode.window.showInformationMessage(message.text);
                        break;
                    case 'showError':
                        vscode.window.showErrorMessage(message.text);
                        break;
                }
            },
            null,
            this._disposables
        );
    }

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (ConverterPanel.currentPanel) {
            ConverterPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'fileConverter',
            'File Converter',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
            }
        );

        ConverterPanel.currentPanel = new ConverterPanel(panel, extensionUri);
    }

    public dispose() {
        ConverterPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _update() {
        this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);
    }

    private _selectedFileInfo: FileInfo | null = null;

    private async _selectFile() {
        const options: vscode.OpenDialogOptions = {
            canSelectMany: false,
            openLabel: 'Select File to Convert'
        };

        const fileUri = await vscode.window.showOpenDialog(options);
        if (fileUri && fileUri[0]) {
            const uri = fileUri[0];
            const fsPath = uri.fsPath;
            const ext = path.extname(fsPath);
            
            if (!this._conversionManager.isSupported(ext.substring(1))) {
                vscode.window.showErrorMessage(`File extension ${ext} is not supported.`);
                return;
            }

            this._selectedFileInfo = {
                path: fsPath,
                name: path.basename(fsPath),
                nameWithoutExt: path.basename(fsPath, ext),
                extension: ext.substring(1).toLowerCase(),
                directory: path.dirname(fsPath)
            };

            const formats = this._conversionManager.getSupportedTargetFormats(this._selectedFileInfo.extension);
            
            this._panel.webview.postMessage({ 
                command: 'fileSelected', 
                fileName: this._selectedFileInfo.name,
                formats: formats
            });
        }
    }

    private async _convertFile(targetFormat: string) {
        if (!this._selectedFileInfo) {
            vscode.window.showErrorMessage("No file selected.");
            return;
        }

        // Use output directory setting
        const config = vscode.workspace.getConfiguration('fileConverter');
        let outputDir = path.dirname(this._selectedFileInfo.path);
        
        if (config.get('outputDirectory') === 'custom') {
            outputDir = config.get('customOutputPath') || outputDir;
        }

        const result = await this._conversionManager.convert(
            this._selectedFileInfo,
            targetFormat,
            outputDir
        );

        if (result.success) {
            this._panel.webview.postMessage({ command: 'conversionSuccess', outputPath: result.outputPath });
        } else {
            this._panel.webview.postMessage({ command: 'conversionError', error: result.error });
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'style.css'));

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${styleUri}" rel="stylesheet">
                <title>File Converter</title>
            </head>
            <body>
                <h1>File Format Converter</h1>
                <div class="container">
                    <button id="select-btn">Select File</button>
                    
                    <div id="file-info" class="file-info hidden">
                        Selected: <span id="file-name"></span>
                    </div>

                    <div id="convert-section" class="hidden">
                        <select id="format-select"></select>
                        <button id="convert-btn">Convert</button>
                    </div>
                </div>
                <script src="${scriptUri}"></script>
            </body>
            </html>`;
    }
}
