"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConverterPanel = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const ConversionManager_1 = require("../converters/ConversionManager");
class ConverterPanel {
    constructor(panel, extensionUri) {
        this._disposables = [];
        this._selectedFileInfo = null;
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._conversionManager = new ConversionManager_1.ConversionManager();
        this._update();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.onDidReceiveMessage(async (message) => {
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
        }, null, this._disposables);
    }
    static createOrShow(extensionUri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        if (ConverterPanel.currentPanel) {
            ConverterPanel.currentPanel._panel.reveal(column);
            return;
        }
        const panel = vscode.window.createWebviewPanel('fileConverter', 'File Converter', column || vscode.ViewColumn.One, {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
        });
        ConverterPanel.currentPanel = new ConverterPanel(panel, extensionUri);
    }
    dispose() {
        ConverterPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
    _update() {
        this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);
    }
    async _selectFile() {
        const options = {
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
    async _convertFile(targetFormat) {
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
        const result = await this._conversionManager.convert(this._selectedFileInfo, targetFormat, outputDir);
        if (result.success) {
            this._panel.webview.postMessage({ command: 'conversionSuccess', outputPath: result.outputPath });
        }
        else {
            this._panel.webview.postMessage({ command: 'conversionError', error: result.error });
        }
    }
    _getHtmlForWebview(webview) {
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
exports.ConverterPanel = ConverterPanel;
//# sourceMappingURL=ConverterPanel.js.map