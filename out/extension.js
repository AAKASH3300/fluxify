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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const ConversionManager_1 = require("./converters/ConversionManager");
const ConverterWebviewProvider_1 = require("./webview/ConverterWebviewProvider");
const SidebarProvider_1 = require("./webview/SidebarProvider");
function activate(context) {
    const conversionManager = new ConversionManager_1.ConversionManager();
    const webviewProvider = new ConverterWebviewProvider_1.ConverterWebviewProvider(context.extensionUri);
    // Register Webview Command
    const openConverterCommand = vscode.commands.registerCommand('fluxify.openConverter', () => {
        webviewProvider.showConverterPanel();
    });
    // Register Sidebar Provider
    const sidebarProvider = new SidebarProvider_1.SidebarProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(SidebarProvider_1.SidebarProvider.viewType, sidebarProvider));
    // Register Context Menu Command (Single File)
    const convertCommand = vscode.commands.registerCommand('fluxify.convert', async (uri) => {
        // If called from command palette or keybinding with no context, use active editor
        if (!uri && vscode.window.activeTextEditor) {
            uri = vscode.window.activeTextEditor.document.uri;
        }
        if (uri) {
            await handleConversion(uri, conversionManager);
        }
        else {
            vscode.window.showInformationMessage("🌊 Fluxify: Please select a file to convert.");
        }
    });
    // Register Batch Conversion Command
    const convertMultipleCommand = vscode.commands.registerCommand('fluxify.convertMultiple', async (uri, allUris) => {
        if (allUris && allUris.length > 0) {
            await handleBatchConversion(allUris, conversionManager);
        }
        else if (uri) {
            // Fallback to single if only one selected or triggered contextually
            await handleConversion(uri, conversionManager);
        }
        else {
            vscode.window.showInformationMessage("🌊 Fluxify: No files selected for batch conversion.");
        }
    });
    context.subscriptions.push(openConverterCommand, convertCommand, convertMultipleCommand);
}
function deactivate() {
}
// -----------------------------------------------------------------------------
// Handlers
// -----------------------------------------------------------------------------
async function handleConversion(uri, manager) {
    try {
        const fileInfo = getFileInfo(uri);
        if (!fileInfo) {
            vscode.window.showErrorMessage('Fluxify: Unable to read file information');
            return;
        }
        // Validate support
        if (!manager.isSupported(fileInfo.extension)) {
            vscode.window.showErrorMessage(`Fluxify: Unsupported file format .${fileInfo.extension}`);
            return;
        }
        const formats = manager.getSupportedTargetFormats(fileInfo.extension);
        if (formats.length === 0) {
            vscode.window.showErrorMessage(`Fluxify: No conversion targets available for .${fileInfo.extension}`);
            return;
        }
        const targetFormat = await vscode.window.showQuickPick(formats, {
            placeHolder: `Select format to convert ${fileInfo.name} to...`,
            title: '🌊 Fluxify Conversion Target'
        });
        if (!targetFormat)
            return;
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `🌊 Fluxifying ${fileInfo.name}...`,
            cancellable: false
        }, async () => {
            const config = vscode.workspace.getConfiguration('fluxify');
            const outputDir = getOutputDirectory(uri, config);
            const result = await manager.convert(fileInfo, targetFormat, outputDir);
            if (result.success) {
                if (config.get('showSuccessNotification')) {
                    const action = await vscode.window.showInformationMessage(`✅ Fluxified to ${result.outputPath}`, 'Open File', 'Show in Explorer');
                    if (action === 'Open File' && result.outputPath) {
                        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(result.outputPath));
                        await vscode.window.showTextDocument(doc);
                    }
                    else if (action === 'Show in Explorer' && result.outputPath) {
                        vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(result.outputPath));
                    }
                }
            }
            else {
                vscode.window.showErrorMessage(`Fluxify Failed: ${result.error}`);
            }
        });
    }
    catch (error) {
        vscode.window.showErrorMessage(`Fluxify Error: ${error.message}`);
    }
}
async function handleBatchConversion(uris, manager) {
    // Filter to convertible files
    const filesToConvert = [];
    for (const uri of uris) {
        const stat = await vscode.workspace.fs.stat(uri);
        if (stat.type === vscode.FileType.Directory) {
            filesToConvert.push(...(await getAllFilesFromDirectory(uri, manager)));
        }
        else {
            filesToConvert.push(uri);
        }
    }
    if (filesToConvert.length === 0) {
        vscode.window.showErrorMessage('Fluxify: No supported files found in selection.');
        return;
    }
    // Determine common target formats
    const commonFormats = getCommonTargetFormats(filesToConvert, manager);
    if (commonFormats.length === 0) {
        vscode.window.showErrorMessage('Fluxify: No common target format available for the selected files.');
        return;
    }
    const targetFormat = await vscode.window.showQuickPick(commonFormats, {
        placeHolder: `Select target format for ${filesToConvert.length} files...`,
        title: '🌊 Fluxify Batch Conversion'
    });
    if (!targetFormat)
        return;
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `🌊 Fluxifying ${filesToConvert.length} files...`,
        cancellable: true
    }, async (progress, token) => {
        const increment = 100 / filesToConvert.length;
        let successCount = 0;
        let failCount = 0;
        for (const uri of filesToConvert) {
            if (token.isCancellationRequested)
                break;
            const fileInfo = getFileInfo(uri);
            if (!fileInfo)
                continue;
            progress.report({ message: `Fluxifying ${fileInfo.name}...`, increment: 0 });
            try {
                const config = vscode.workspace.getConfiguration('fluxify');
                const outputDir = getOutputDirectory(uri, config);
                const result = await manager.convert(fileInfo, targetFormat, outputDir);
                if (result.success)
                    successCount++;
                else
                    failCount++;
            }
            catch (e) {
                failCount++;
            }
            progress.report({ increment: increment });
        }
        vscode.window.showInformationMessage(`🌊 Fluxify Batch Complete: ${successCount} succeeded, ${failCount} failed.`);
    });
}
// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
function getFileInfo(uri) {
    try {
        const filePath = uri.fsPath;
        const ext = path.extname(filePath).toLowerCase().substring(1);
        const name = path.basename(filePath);
        const nameWithoutExt = path.basename(filePath, path.extname(filePath));
        return {
            path: filePath,
            name: name,
            nameWithoutExt: nameWithoutExt,
            extension: ext,
            directory: path.dirname(filePath)
        };
    }
    catch (error) {
        return null;
    }
}
function getOutputDirectory(uri, config) {
    const outputDirSetting = config.get('outputDirectory', 'same');
    if (outputDirSetting === 'custom') {
        const customPath = config.get('customOutputPath', '');
        if (customPath && fs.existsSync(customPath)) {
            return customPath;
        }
    }
    return path.dirname(uri.fsPath);
}
async function getAllFilesFromDirectory(dirUri, manager) {
    const files = [];
    const entries = await vscode.workspace.fs.readDirectory(dirUri);
    for (const [name, type] of entries) {
        if (type === vscode.FileType.File) {
            const ext = path.extname(name).toLowerCase().substring(1);
            if (manager.isSupported(ext)) {
                files.push(vscode.Uri.joinPath(dirUri, name));
            }
        }
    }
    return files;
}
function getCommonTargetFormats(uris, manager) {
    if (uris.length === 0)
        return [];
    const firstFileInfo = getFileInfo(uris[0]);
    if (!firstFileInfo)
        return [];
    let commonFormats = manager.getSupportedTargetFormats(firstFileInfo.extension);
    for (let i = 1; i < uris.length; i++) {
        const fileInfo = getFileInfo(uris[i]);
        if (!fileInfo)
            continue;
        const formats = manager.getSupportedTargetFormats(fileInfo.extension);
        commonFormats = commonFormats.filter(fmt => formats.includes(fmt));
    }
    return commonFormats;
}
//# sourceMappingURL=extension.js.map