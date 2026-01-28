import * as vscode from 'vscode';
import * as path from 'path';
import { ConversionManager } from '../converters/ConversionManager';
import { FileInfo } from '../types/FileInfo';

export class ConverterWebviewProvider {
    private static currentPanel: vscode.WebviewPanel | undefined;
    private readonly extensionUri: vscode.Uri;
    private readonly conversionManager: ConversionManager;

    constructor(extensionUri: vscode.Uri) {
        this.extensionUri = extensionUri;
        this.conversionManager = new ConversionManager();
    }

    public showConverterPanel() {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If panel already exists, reveal it
        if (ConverterWebviewProvider.currentPanel) {
            ConverterWebviewProvider.currentPanel.reveal(column);
            return;
        }

        // Create new panel
        const panel = vscode.window.createWebviewPanel(
            'fluxify',
            '🌊 Fluxify',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [this.extensionUri]
            }
        );

        ConverterWebviewProvider.currentPanel = panel;

        // Set HTML content
        panel.webview.html = this.getWebviewContent(panel.webview);

        // Handle messages from webview
        panel.webview.onDidReceiveMessage(
            message => {
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
            },
            undefined,
            []
        );

        // Reset when panel is closed
        panel.onDidDispose(
            () => {
                ConverterWebviewProvider.currentPanel = undefined;
            },
            null,
            []
        );
    }

    private async handleDirectorySelection() {
        const folderUri = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Select Output Folder'
        });

        if (folderUri && folderUri[0]) {
            ConverterWebviewProvider.currentPanel?.webview.postMessage({
                command: 'directorySelected',
                data: {
                    path: folderUri[0].fsPath
                }
            });
        }
    }

    private async handleFileSelection() {
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

            // Send file info back to webview
            ConverterWebviewProvider.currentPanel?.webview.postMessage({
                command: 'fileSelected',
                data: {
                    path: filePath,
                    name: fileName,
                    extension: ext
                }
            });
        }
    }

    private async handleConversion(data: any) {
        try {
            const fileInfo: FileInfo = {
                path: data.filePath,
                name: data.fileName,
                nameWithoutExt: data.fileName.replace(/\.[^/.]+$/, ""),
                extension: data.sourceFormat,
                directory: path.dirname(data.filePath)
            };
    
            // Use provided output directory or default to source directory
            const outputDir = data.outputDir || path.dirname(data.filePath);
    
            const result = await this.conversionManager.convert(
                fileInfo,
                data.targetFormat,
                outputDir
            );

            // Auto-open if enabled
            const config = vscode.workspace.getConfiguration('fluxify');
            if (result.success && config.get<boolean>('autoOpenFile', true) && result.outputPath) {
                try {
                    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(result.outputPath));
                    await vscode.window.showTextDocument(doc);
                } catch (error) {
                    console.error('Failed to auto-open file from webview:', error);
                }
            }
    
            ConverterWebviewProvider.currentPanel?.webview.postMessage({
                command: result.success ? 'conversionComplete' : 'conversionError',
                data: {
                    success: result.success,
                    message: result.success 
                        ? `✅ Fluxified to ${data.targetFormat.toUpperCase()}!`
                        : `❌ Conversion failed: ${result.error}`
                }
            });
        } catch (error) {
            ConverterWebviewProvider.currentPanel?.webview.postMessage({
                command: 'conversionError',
                data: {
                    success: false,
                    message: `Error: ${error instanceof Error ? error.message : String(error)}`
                }
            });
        }
    }

    private getWebviewContent(webview: vscode.Webview): string {
        const iconUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'resources', 'fluxify-icon.png'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'style.css'));

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
            /* Toned down professional palette */
            --primary: #3b82f6;      /* Standard Blue */
            --primary-dark: #2563eb;
            --secondary: #8b5cf6;    /* Soft Purple */
            --success: #10b981;      /* Emerald Green */
            --warning: #f59e0b;
            --bg-dark: #0f172a;      /* Slate 900 */
            --bg-darker: #020617;    /* Slate 950 */
            --bg-card: #1e293b;      /* Slate 800 */
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
        }

        /* Subtle Background Animation */
        .bg-animation {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 0;
            pointer-events: none;
            overflow: hidden;
        }

        .bg-gradient {
            position: absolute;
            width: 600px;
            height: 600px;
            border-radius: 50%;
            filter: blur(100px);
            opacity: 0.08; /* Much lower opacity */
            animation: float 25s infinite;
        }

        .bg-gradient:nth-child(1) {
            background: var(--primary);
            top: -20%;
            left: -10%;
        }

        .bg-gradient:nth-child(2) {
            background: var(--secondary);
            top: 50%;
            right: -10%;
            animation-delay: -5s;
        }

        @keyframes float {
            0%, 100% { transform: translate(0, 0); }
            50% { transform: translate(30px, -20px); }
        }

        .container {
            position: relative;
            z-index: 10;
            max-width: 1000px;
            margin: 0 auto;
            padding: 40px 20px;
        }

        /* Header */
        .header {
            text-align: center;
            margin-bottom: 50px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 15px;
        }

        .logo-container {
            width: 80px;
            height: 80px;
            margin-bottom: 10px;
        }

        .logo-container img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            filter: drop-shadow(0 0 20px rgba(59, 130, 246, 0.3));
        }

        .header h1 {
            font-size: 2.5rem;
            font-weight: 700;
            letter-spacing: -0.5px;
            background: linear-gradient(to right, #fff, #94a3b8);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .header p {
            font-size: 1.1rem;
            color: var(--text-dim);
            font-weight: 400;
        }

        /* Main Grid */
        .main-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 25px;
        }

        @media (max-width: 800px) {
            .main-grid {
                grid-template-columns: 1fr;
            }
        }

        /* Card Styles */
        .card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 30px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }

        .card-title {
            font-size: 1.1rem;
            font-weight: 600;
            margin-bottom: 20px;
            color: var(--text);
            display: flex;
            align-items: center;
            gap: 10px;
            border-bottom: 1px solid var(--border);
            padding-bottom: 15px;
        }

        /* Upload Zone */
        .upload-zone {
            background: rgba(255, 255, 255, 0.02);
            border: 2px dashed var(--border);
            border-radius: 10px;
            padding: 40px 20px;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .upload-zone:hover {
            border-color: var(--primary);
            background: rgba(59, 130, 246, 0.05);
        }

        .upload-icon {
            font-size: 2.5rem;
            margin-bottom: 15px;
            opacity: 0.8;
        }

        .upload-text {
            font-weight: 500;
            margin-bottom: 5px;
        }

        .upload-hint {
            font-size: 0.85rem;
            color: var(--text-dim);
        }

        /* Selected File */
        .selected-file {
            display: none;
            background: rgba(59, 130, 246, 0.1);
            border: 1px solid rgba(59, 130, 246, 0.2);
            border-radius: 8px;
            padding: 15px;
            margin-top: 20px;
        }

        .selected-file.active {
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .file-icon-preview {
            width: 40px;
            height: 40px;
            background: var(--primary);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.2rem;
            color: white;
        }

        /* Directory Selector */
        .dir-selector {
            margin-top: 20px;
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 10px 15px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .dir-selector:hover {
            border-color: var(--primary);
            background: rgba(59, 130, 246, 0.05);
        }

        .dir-path {
            font-size: 0.85rem;
            color: var(--text-dim);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 200px;
        }

        .dir-icon {
            font-size: 1.1rem;
            color: var(--text-dim);
        }

        /* Format Grid */
        .format-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
            gap: 10px;
        }

        .format-btn {
            background: var(--bg-dark);
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 10px;
            text-align: center;
            cursor: pointer;
            font-size: 0.9rem;
            font-weight: 500;
            transition: all 0.2s;
            color: var(--text-dim);
        }

        .format-btn:hover {
            border-color: var(--primary);
            color: var(--text);
        }

        .format-btn.active {
            background: var(--primary);
            border-color: var(--primary);
            color: white;
        }

        .format-btn.disabled {
            opacity: 0.3;
            cursor: not-allowed;
            pointer-events: none;
        }

        /* Action Button */
        .convert-btn {
            width: 100%;
            background: var(--primary);
            color: white;
            border: none;
            border-radius: 8px;
            padding: 15px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            margin-top: 25px;
            transition: background 0.2s;
        }

        .convert-btn:hover {
            background: var(--primary-dark);
        }

        .convert-btn:disabled {
            background: var(--border);
            cursor: not-allowed;
            opacity: 0.7;
        }

        /* Feature List (Right Column) */
        .feature-list {
            list-style: none;
        }

        .feature-item {
            display: flex;
            gap: 15px;
            margin-bottom: 20px;
            align-items: flex-start;
        }

        .feature-icon-small {
            width: 32px;
            height: 32px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }

        .feature-text div:first-child {
            font-weight: 600;
            margin-bottom: 2px;
        }

        .feature-text div:last-child {
            font-size: 0.85rem;
            color: var(--text-dim);
        }

        /* Supported Tags */
        .tags-container {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }

        .tag {
            font-size: 0.75rem;
            background: rgba(255, 255, 255, 0.05);
            padding: 4px 8px;
            border-radius: 4px;
            color: var(--text-dim);
        }

        /* Progress Bar */
        .progress-container {
            display: none;
            margin-top: 20px;
        }
        
        .progress-container.active {
            display: block;
        }

        .progress-bar {
            height: 6px;
            background: var(--bg-dark);
            border-radius: 3px;
            overflow: hidden;
        }

        .progress-fill {
            background: var(--primary);
            width: 0%;
            transition: width 0.3s;
            height: 100%;
        }

        .message {
            margin-top: 15px;
            padding: 10px;
            border-radius: 6px;
            font-size: 0.9rem;
            display: none;
        }
        .message.active { display: block; }
        .message.success { background: rgba(16, 185, 129, 0.1); color: var(--success); }
        .message.error { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

    </style>
</head>
<body>
    <div class="bg-animation">
        <div class="bg-gradient"></div>
        <div class="bg-gradient"></div>
        <div class="bg-gradient"></div>
    </div>

    <div class="container">
        <div class="header">
            <div class="logo-container">
                <img src="${iconUri}" alt="Fluxify Logo">
            </div>
            <div>
                <h1>Fluxify</h1>
                <p>Transform anything into anything</p>
            </div>
        </div>

        <div class="main-grid">
            <!-- Left: Actions -->
            <div class="card">
                <div class="card-title">
                    <span>⚡</span> Converter
                </div>

                <div class="upload-zone" id="uploadZone">
                    <div class="upload-icon">📂</div>
                    <div class="upload-text">Click to Select File</div>
                    <div class="upload-hint">Images, Documents, Data</div>
                </div>

                <div class="selected-file" id="selectedFile">
                    <div class="file-icon-preview">📄</div>
                    <div>
                        <div style="font-weight: 500;" id="fileName">file.ext</div>
                        <div style="font-size: 0.8rem; color: var(--text-dim);" id="filePath">path/to/file</div>
                    </div>
                </div>

                <!-- Custom Output Directory -->
                <div class="dir-selector" id="dirSelector">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="dir-icon">📂</span>
                        <div>
                            <div style="font-size: 0.75rem; color: var(--text-dim);">OUTPUT FOLDER</div>
                            <div class="dir-path" id="outputDir">Same as source</div>
                        </div>
                    </div>
                    <div style="font-size: 0.8rem; color: var(--primary);">CHANGE</div>
                </div>

                <div style="margin-top: 25px;">
                    <div style="margin-bottom: 10px; font-size: 0.9rem; font-weight: 500; color: var(--text-dim);">TARGET FORMAT</div>
                    <div class="format-grid" id="formatGrid">
                        <!-- Filled by JS -->
                        <div style="grid-column: 1/-1; text-align: center; padding: 20px; color: var(--text-dim); font-size: 0.9rem;">
                            Select a file to see available formats
                        </div>
                    </div>
                </div>

                <div class="progress-container" id="progressContainer">
                    <div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>
                    <div style="text-align: center; font-size: 0.8rem; margin-top: 5px; color: var(--text-dim);">Converting...</div>
                </div>
                
                <div class="message" id="messageBox"></div>

                <button class="convert-btn" id="convertBtn" disabled>Fluxify Now</button>
            </div>

            <!-- Right: Info -->
            <div style="display: flex; flex-direction: column; gap: 20px;">
                <div class="card">
                    <div class="card-title">
                        <span>✨</span> Features
                    </div>
                    <ul class="feature-list">
                        <li class="feature-item">
                            <div class="feature-icon-small">🖼️</div>
                            <div class="feature-text">
                                <div>Image Conversion</div>
                                <div>PNG, JPG, WebP, GIF, BMP, TIFF, PDF</div>
                            </div>
                        </li>
                        <li class="feature-item">
                            <div class="feature-icon-small">📄</div>
                            <div class="feature-text">
                                <div>Documents</div>
                                <div>PDF, DOCX, HTML, Markdown, TXT</div>
                            </div>
                        </li>
                        <li class="feature-item">
                            <div class="feature-icon">💾</div>
                            <div class="feature-text">
                                <div>Data</div>
                                <div>JSON, CSV, XML, YAML</div>
                            </div>
                        </li>
                    </ul>
                </div>

                <div class="card">
                     <div class="card-title">
                        <span>ℹ️</span> Supported Formats
                    </div>
                    <div style="margin-bottom: 10px; font-size: 0.85rem; color: var(--text-dim);">IMAGES</div>
                    <div class="tags-container">
                        <div class="tag">PNG</div> <div class="tag">JPG</div> <div class="tag">WEBP</div> <div class="tag">GIF</div> <div class="tag">BMP</div>
                    </div>
                    
                    <div style="margin: 15px 0 10px 0; font-size: 0.85rem; color: var(--text-dim);">DOCUMENTS</div>
                    <div class="tags-container">
                        <div class="tag">DOCX</div> <div class="tag">HTML</div> <div class="tag">MD</div> <div class="tag">TXT</div>
                    </div>

                    <div style="margin: 15px 0 10px 0; font-size: 0.85rem; color: var(--text-dim);">DATA</div>
                    <div class="tags-container">
                        <div class="tag">JSON</div> <div class="tag">CSV</div> <div class="tag">XML</div> <div class="tag">YAML</div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let selectedFile = null;
        let selectedFormat = null;
        let outputDirectory = null;

        // Accurate format mappings
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

        // Upload zone click
        document.getElementById('uploadZone').addEventListener('click', () => {
            vscode.postMessage({ command: 'selectFile' });
        });

        // Directory selector click
        document.getElementById('dirSelector').addEventListener('click', () => {
            vscode.postMessage({ command: 'selectDirectory' });
        });

        // Format button clicks
        document.getElementById('formatGrid').addEventListener('click', (e) => {
            const btn = e.target.closest('.format-btn');
            if (btn && !btn.classList.contains('disabled')) {
                // Remove active from all
                document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
                // Add active to clicked
                btn.classList.add('active');
                selectedFormat = btn.textContent.toLowerCase();
                
                // Enable convert button
                document.getElementById('convertBtn').disabled = false;
            }
        });

        // Convert button click
        document.getElementById('convertBtn').addEventListener('click', () => {
            if (selectedFile && selectedFormat) {
                const btn = document.getElementById('convertBtn');
                btn.textContent = 'Processing...';
                btn.disabled = true;
                
                // Show progress
                const progressContainer = document.getElementById('progressContainer');
                progressContainer.classList.add('active');
                
                // Hide any previous messages
                document.getElementById('messageBox').classList.remove('active');
                
                // Simulate progress
                let progress = 0;
                const progressFill = document.getElementById('progressFill');
                const interval = setInterval(() => {
                    progress += 5;
                    if (progress > 90) progress = 90;
                    progressFill.style.width = progress + '%';
                }, 100);

                // Send conversion request
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

                // Store interval to clear later
                window.conversionInterval = interval;
            }
        });

        // Listen for messages from extension
        window.addEventListener('message', event => {
            const message = event.data;

            switch (message.command) {
                case 'fileSelected':
                    selectedFile = message.data;
                    
                    // Show selected file
                    document.getElementById('selectedFile').classList.add('active');
                    document.getElementById('fileName').textContent = message.data.name;
                    document.getElementById('filePath').textContent = message.data.path;
                    
                    // Update format buttons based on source format
                    updateFormatButtons(message.data.extension);
                    
                    // Reset selection
                    selectedFormat = null;
                    document.getElementById('convertBtn').disabled = true;
                    document.getElementById('convertBtn').textContent = 'Fluxify Now';
                    break;
                
                case 'directorySelected':
                    outputDirectory = message.data.path;
                    document.getElementById('outputDir').textContent = message.data.path;
                    break;

                case 'conversionComplete':
                    // Complete progress
                    if (window.conversionInterval) clearInterval(window.conversionInterval);
                    document.getElementById('progressFill').style.width = '100%';
                    
                    setTimeout(() => {
                        // Hide progress
                        document.getElementById('progressContainer').classList.remove('active');
                        
                        // Show success message
                        const messageBox = document.getElementById('messageBox');
                        messageBox.textContent = message.data.message;
                        messageBox.className = 'message success active';
                        
                        // Re-enable button
                        const btn = document.getElementById('convertBtn');
                        btn.textContent = 'Fluxify Again';
                        btn.disabled = false;
                        
                        // Reset progress for next conversion
                        setTimeout(() => {
                            document.getElementById('progressFill').style.width = '0%';
                        }, 500);
                    }, 500);
                    break;

                case 'conversionError':
                    // Hide progress
                    if (window.conversionInterval) clearInterval(window.conversionInterval);
                    document.getElementById('progressContainer').classList.remove('active');
                    
                    // Show error message
                    const messageBox = document.getElementById('messageBox');
                    messageBox.textContent = message.data.message;
                    messageBox.className = 'message error active';
                    
                    // Re-enable button
                    const btn = document.getElementById('convertBtn');
                    btn.textContent = 'Try Again';
                    btn.disabled = false;
                    
                    // Reset progress
                    document.getElementById('progressFill').style.width = '0%';
                    break;
            }
        });

        function updateFormatButtons(sourceExtension) {
            const formatGrid = document.getElementById('formatGrid');
            formatGrid.innerHTML = '';
            
            const targetFormats = conversionPaths[sourceExtension.toLowerCase()] || [];
            
            if (targetFormats.length === 0) {
                 formatGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--warning);">No compatible formats found</div>';
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
