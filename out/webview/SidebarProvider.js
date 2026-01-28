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
exports.SidebarProvider = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const ConversionManager_1 = require("../converters/ConversionManager");
class SidebarProvider {
    constructor(extensionUri) {
        this.extensionUri = extensionUri;
        this.conversionManager = new ConversionManager_1.ConversionManager();
    }
    resolveWebviewView(webviewView, context, _token) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.extensionUri]
        };
        webviewView.webview.html = this.getWebviewContent(webviewView.webview);
        webviewView.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'selectFile':
                    this.handleFileSelection();
                    break;
                case 'selectDirectory':
                    this.handleDirectorySelection();
                    break;
                case 'convert':
                    this.handleConversion(message.data);
                    break;
                case 'showInfo':
                    vscode.window.showInformationMessage(message.text);
                    break;
            }
        });
    }
    async handleDirectorySelection() {
        const folderUri = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Select Output Folder'
        });
        if (folderUri && folderUri[0]) {
            this._view?.webview.postMessage({
                command: 'directorySelected',
                data: {
                    path: folderUri[0].fsPath
                }
            });
        }
    }
    async handleFileSelection() {
        const fileUri = await vscode.window.showOpenDialog({
            canSelectMany: false,
            openLabel: 'Select File to Fluxify',
            filters: {
                'Images': ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff', 'tif'],
                'Documents': ['docx', 'doc', 'txt', 'md', 'html', 'htm'],
                'Data': ['json', 'csv', 'xml', 'yaml', 'yml'],
                'All Files': ['*']
            }
        });
        if (fileUri && fileUri[0]) {
            const filePath = fileUri[0].fsPath;
            const fileName = path.basename(filePath);
            const ext = path.extname(filePath).toLowerCase().substring(1);
            this._view?.webview.postMessage({
                command: 'fileSelected',
                data: {
                    path: filePath,
                    name: fileName,
                    extension: ext
                }
            });
        }
    }
    async handleConversion(data) {
        try {
            const fileInfo = {
                path: data.filePath,
                name: data.fileName,
                nameWithoutExt: data.fileName.replace(/\.[^/.]+$/, ""),
                extension: data.sourceFormat,
                directory: path.dirname(data.filePath)
            };
            const outputDir = data.outputDir || path.dirname(data.filePath);
            const result = await this.conversionManager.convert(fileInfo, data.targetFormat, outputDir);
            this._view?.webview.postMessage({
                command: result.success ? 'conversionComplete' : 'conversionError',
                data: {
                    success: result.success,
                    message: result.success
                        ? `✅ Fluxified to ${data.targetFormat.toUpperCase()}!`
                        : `❌ Conversion failed: ${result.error}`
                }
            });
        }
        catch (error) {
            this._view?.webview.postMessage({
                command: 'conversionError',
                data: {
                    success: false,
                    message: `Error: ${error instanceof Error ? error.message : String(error)}`
                }
            });
        }
    }
    getWebviewContent(webview) {
        const iconUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'resources', 'fluxify-icon.png'));
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fluxify</title>
    <link rel="icon" href="${iconUri}">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            --primary: #3b82f6;
            --primary-dark: #2563eb;
            --secondary: #8b5cf6;
            --success: #10b981;
            --warning: #f59e0b;
            --bg-dark: #0f172a;
            --bg-darker: #020617;
            --bg-card: #1e293b;
            --text: #f8fafc;
            --text-dim: #94a3b8;
            --border: #334155;
        }

        body {
            font-family: 'Segoe UI', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: var(--bg-darker);
            color: var(--text);
            overflow-x: hidden;
            line-height: 1.6;
            padding: 10px; /* Reduced padding for sidebar */
        }

        .container {
            max-width: 100%;
            margin: 0 auto;
            padding: 10px 0;
        }

        /* Sidebar Header - Compact */
        .header {
            text-align: center;
            margin-bottom: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
        }

        .logo-container {
            width: 50px;
            height: 50px;
            margin-bottom: 5px;
        }

        .logo-container img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            filter: drop-shadow(0 0 10px rgba(59, 130, 246, 0.3));
        }

        .header h1 {
            font-size: 1.5rem;
            background: linear-gradient(to right, #fff, #94a3b8);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .header p {
            font-size: 0.9rem;
            color: var(--text-dim);
            display: none; /* Hide tagline in sidebar to save space */
        }

        /* Sidebar Stack Layout */
        .main-grid {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }

        .card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 15px; /* Compact padding */
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .card-title {
            font-size: 0.9rem;
            font-weight: 600;
            margin-bottom: 15px;
            color: var(--text);
            display: flex;
            align-items: center;
            gap: 8px;
            border-bottom: 1px solid var(--border);
            padding-bottom: 10px;
        }

        .upload-zone {
            background: rgba(255, 255, 255, 0.02);
            border: 2px dashed var(--border);
            border-radius: 8px;
            padding: 20px 10px;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .upload-zone:hover {
            border-color: var(--primary);
            background: rgba(59, 130, 246, 0.05);
        }

        .upload-icon {
            font-size: 1.8rem;
            margin-bottom: 10px;
            opacity: 0.8;
        }

        .upload-text {
            font-weight: 500;
            font-size: 0.9rem;
        }

        .selected-file {
            display: none;
            background: rgba(59, 130, 246, 0.1);
            border: 1px solid rgba(59, 130, 246, 0.2);
            border-radius: 6px;
            padding: 10px;
            margin-top: 15px;
        }

        .selected-file.active {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .file-icon-preview {
            width: 32px;
            height: 32px;
            background: var(--primary);
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1rem;
            color: white;
            flex-shrink: 0;
        }

        .dir-selector {
            margin-top: 15px;
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 8px 10px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 5px;
            cursor: pointer;
        }

        .dir-selector:hover { border-color: var(--primary); }

        .dir-path {
            font-size: 0.75rem;
            color: var(--text-dim);
            max-width: 120px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .format-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr); /* Force 3 cols for sidebar */
            gap: 5px;
        }

        .format-btn {
            background: var(--bg-dark);
            border: 1px solid var(--border);
            border-radius: 4px;
            padding: 6px;
            text-align: center;
            cursor: pointer;
            font-size: 0.75rem;
            color: var(--text-dim);
        }

        .format-btn:hover { border-color: var(--primary); color: var(--text); }
        .format-btn.active { background: var(--primary); border-color: var(--primary); color: white; }

        .convert-btn {
            width: 100%;
            background: var(--primary);
            color: white;
            border: none;
            border-radius: 6px;
            padding: 10px;
            font-size: 0.9rem;
            font-weight: 600;
            cursor: pointer;
            margin-top: 20px;
        }
        
        .progress-container {
            display: none;
            margin-top: 15px;
        }
        .progress-container.active { display: block; }
        .progress-bar { height: 4px; background: var(--bg-dark); border-radius: 2px; overflow: hidden; }
        .progress-fill { background: var(--primary); width: 0%; height: 100%; transition: width 0.3s; }

        .message {
            margin-top: 10px;
            padding: 8px;
            border-radius: 4px;
            font-size: 0.8rem;
            display: none;
            word-break: break-word;
        }
        .message.active { display: block; }
        .message.success { background: rgba(16, 185, 129, 0.1); color: var(--success); }
        .message.error { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo-container">
                <img src="${iconUri}" alt="Fluxify Logo">
            </div>
            <div>
                <h1>Fluxify</h1>
            </div>
        </div>

        <div class="main-grid">
            <div class="card">
                <div class="card-title">
                    <span>⚡</span> Converter
                </div>

                <div class="upload-zone" id="uploadZone">
                    <div class="upload-icon">📂</div>
                    <div class="upload-text">Select File</div>
                </div>

                <div class="selected-file" id="selectedFile">
                    <div class="file-icon-preview">📄</div>
                    <div style="overflow: hidden;">
                        <div style="font-weight: 500; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" id="fileName">file.ext</div>
                    </div>
                </div>

                 <!-- Custom Output Directory -->
                <div class="dir-selector" id="dirSelector">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <div style="font-size: 0.9rem;">📂</div>
                        <div style="display: flex; flex-direction: column;">
                             <div style="font-size: 0.6rem; color: var(--text-dim); line-height: 1;">OUTPUT</div>
                             <div class="dir-path" id="outputDir">Same as source</div>
                        </div>
                    </div>
                    <div style="font-size: 0.7rem; color: var(--primary);">EDIT</div>
                </div>

                <div style="margin-top: 20px;">
                    <div style="margin-bottom: 8px; font-size: 0.8rem; font-weight: 500; color: var(--text-dim);">TARGET FORMAT</div>
                    <div class="format-grid" id="formatGrid">
                        <div style="grid-column: 1/-1; text-align: center; padding: 10px; color: var(--text-dim); font-size: 0.8rem;">
                            Select a file first
                        </div>
                    </div>
                </div>

                <div class="progress-container" id="progressContainer">
                    <div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>
                    <div style="text-align: center; font-size: 0.75rem; margin-top: 4px; color: var(--text-dim);">Converting...</div>
                </div>
                
                <div class="message" id="messageBox"></div>

                <button class="convert-btn" id="convertBtn" disabled>Fluxify Now</button>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let selectedFile = null;
        let selectedFormat = null;
        let outputDirectory = null;

        const conversionPaths = {
            'png': ['jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff', 'pdf'],
            'jpg': ['png', 'webp', 'gif', 'bmp', 'tiff', 'pdf'],
            'jpeg': ['png', 'webp', 'gif', 'bmp', 'tiff', 'pdf'],
            'webp': ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'pdf'],
            'gif': ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'tiff', 'pdf'],
            'bmp': ['png', 'jpg', 'jpeg', 'webp', 'gif', 'tiff', 'pdf'],
            'tiff': ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'pdf'],
            'tif': ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'pdf'],
            'docx': ['pdf', 'txt', 'html', 'md'],
            'doc': ['pdf', 'txt', 'html', 'md'],
            'txt': ['pdf', 'html', 'md', 'docx'],
            'md': ['pdf', 'html', 'txt', 'docx'],
            'html': ['pdf', 'txt', 'md'],
            'htm': ['pdf', 'txt', 'md'],
            'json': ['csv', 'xml', 'yaml', 'yml', 'txt'],
            'csv': ['json', 'xml', 'yaml', 'yml', 'txt'],
            'xml': ['json', 'csv', 'yaml', 'yml', 'txt'],
            'yaml': ['json', 'csv', 'xml', 'txt'],
            'yml': ['json', 'csv', 'xml', 'txt']
        };

        document.getElementById('uploadZone').addEventListener('click', () => {
            vscode.postMessage({ command: 'selectFile' });
        });

        document.getElementById('dirSelector').addEventListener('click', () => {
             vscode.postMessage({ command: 'selectDirectory' });
        });

        document.getElementById('formatGrid').addEventListener('click', (e) => {
            const btn = e.target.closest('.format-btn');
            if (btn && !btn.classList.contains('disabled')) {
                document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedFormat = btn.textContent.toLowerCase();
                document.getElementById('convertBtn').disabled = false;
            }
        });

        document.getElementById('convertBtn').addEventListener('click', () => {
            if (selectedFile && selectedFormat) {
                const btn = document.getElementById('convertBtn');
                btn.textContent = 'Processing...';
                btn.disabled = true;
                
                const progressContainer = document.getElementById('progressContainer');
                progressContainer.classList.add('active');
                document.getElementById('messageBox').classList.remove('active');
                
                let progress = 0;
                const progressFill = document.getElementById('progressFill');
                const interval = setInterval(() => {
                    progress += 5;
                    if (progress > 90) progress = 90;
                    progressFill.style.width = progress + '%';
                }, 100);

                vscode.postMessage({
                    command: 'convert',
                    data: {
                        filePath: selectedFile.path,
                        fileName: selectedFile.name,
                        sourceFormat: selectedFile.extension,
                        targetFormat: selectedFormat,
                        outputDir: outputDirectory
                    }
                });

                window.conversionInterval = interval;
            }
        });

        window.addEventListener('message', event => {
            const message = event.data;

            switch (message.command) {
                case 'fileSelected':
                    selectedFile = message.data;
                    document.getElementById('selectedFile').classList.add('active');
                    document.getElementById('fileName').textContent = message.data.name;
                    updateFormatButtons(message.data.extension);
                    selectedFormat = null;
                    document.getElementById('convertBtn').disabled = true;
                    document.getElementById('convertBtn').textContent = 'Fluxify Now';
                    break;
                
                case 'directorySelected':
                    outputDirectory = message.data.path;
                    document.getElementById('outputDir').textContent = message.data.path;
                    break;

                case 'conversionComplete':
                    if (window.conversionInterval) clearInterval(window.conversionInterval);
                    document.getElementById('progressFill').style.width = '100%';
                    
                    setTimeout(() => {
                        document.getElementById('progressContainer').classList.remove('active');
                        const messageBox = document.getElementById('messageBox');
                        messageBox.textContent = message.data.message;
                        messageBox.className = 'message success active';
                        
                        const btn = document.getElementById('convertBtn');
                        btn.textContent = 'Fluxify Again';
                        btn.disabled = false;
                        
                        setTimeout(() => {
                            document.getElementById('progressFill').style.width = '0%';
                        }, 500);
                    }, 500);
                    break;

                case 'conversionError':
                    if (window.conversionInterval) clearInterval(window.conversionInterval);
                    document.getElementById('progressContainer').classList.remove('active');
                    
                    const messageBox = document.getElementById('messageBox');
                    messageBox.textContent = message.data.message;
                    messageBox.className = 'message error active';
                    
                    const btn = document.getElementById('convertBtn');
                    btn.textContent = 'Try Again';
                    btn.disabled = false;
                    document.getElementById('progressFill').style.width = '0%';
                    break;
            }
        });

        function updateFormatButtons(sourceExtension) {
            const formatGrid = document.getElementById('formatGrid');
            formatGrid.innerHTML = '';
            
            const targetFormats = conversionPaths[sourceExtension.toLowerCase()] || [];
            
            if (targetFormats.length === 0) {
                 formatGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--warning); font-size: 0.8rem;">No compatible formats</div>';
                 return;
            }
            
            targetFormats.forEach(format => {
                const btn = document.createElement('div');
                btn.className = 'format-btn';
                btn.textContent = format.toUpperCase();
                formatGrid.appendChild(btn);
            });
        }
    </script>
</body>
</html>`;
    }
}
exports.SidebarProvider = SidebarProvider;
SidebarProvider.viewType = 'fluxify.sidebarView';
//# sourceMappingURL=SidebarProvider.js.map