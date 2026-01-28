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
exports.ConversionManager = void 0;
const vscode = __importStar(require("vscode"));
const ImageConverter_1 = require("./ImageConverter");
const DocumentConverter_1 = require("./DocumentConverter");
const DataConverter_1 = require("./DataConverter");
class ConversionManager {
    constructor() {
        this.FILE_CATEGORIES = {
            image: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff', 'tif'],
            document: ['pdf', 'docx', 'doc', 'txt', 'md', 'html', 'htm'],
            data: ['json', 'csv', 'xml', 'yaml', 'yml']
        };
        this.CONVERSION_PATHS = {
            png: ['jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff', 'pdf'],
            jpg: ['png', 'webp', 'gif', 'bmp', 'tiff', 'pdf'],
            jpeg: ['png', 'webp', 'gif', 'bmp', 'tiff', 'pdf'],
            webp: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'pdf'],
            gif: ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'tiff', 'pdf'],
            bmp: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'tiff', 'pdf'],
            tiff: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'pdf'],
            tif: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'pdf'],
            docx: ['pdf', 'txt', 'html', 'md'],
            doc: ['pdf', 'txt', 'html', 'md'],
            txt: ['pdf', 'html', 'md', 'docx'],
            md: ['pdf', 'html', 'txt', 'docx'],
            html: ['pdf', 'txt', 'md'],
            htm: ['pdf', 'txt', 'md'],
            json: ['csv', 'xml', 'yaml', 'yml', 'txt'],
            csv: ['json', 'xml', 'yaml', 'yml', 'txt'],
            xml: ['json', 'csv', 'yaml', 'yml', 'txt'],
            yaml: ['json', 'csv', 'xml', 'txt'],
            yml: ['json', 'csv', 'xml', 'txt']
        };
        this.imageConverter = new ImageConverter_1.ImageConverter();
        this.documentConverter = new DocumentConverter_1.DocumentConverter();
        this.dataConverter = new DataConverter_1.DataConverter();
    }
    isSupported(extension) {
        const normalizedExt = extension.toLowerCase();
        return Object.keys(this.CONVERSION_PATHS).includes(normalizedExt);
    }
    getSupportedTargetFormats(sourceExtension) {
        const normalizedExt = sourceExtension.toLowerCase();
        return this.CONVERSION_PATHS[normalizedExt] || [];
    }
    async convert(fileInfo, targetFormat, outputDir, options) {
        const category = this.getFileCategory(fileInfo.extension);
        // Get default quality from config if not provided
        const config = vscode.workspace.getConfiguration('fluxify');
        const defaultQuality = config.get('imageQuality', 90);
        const finalOptions = {
            ...options,
            quality: options?.quality || defaultQuality
        };
        try {
            switch (category) {
                case 'image':
                    return await this.imageConverter.convertImage(fileInfo, targetFormat, outputDir, finalOptions);
                case 'document':
                    return await this.documentConverter.convertDocument(fileInfo, targetFormat, outputDir, finalOptions);
                case 'data':
                    return await this.dataConverter.convertData(fileInfo, targetFormat, outputDir, finalOptions);
                default:
                    return {
                        success: false,
                        error: `Unsupported file category for extension: ${fileInfo.extension}`
                    };
            }
        }
        catch (error) {
            return {
                success: false,
                error: error.message || 'Unknown error during conversion'
            };
        }
    }
    getFileCategory(extension) {
        const ext = extension.toLowerCase();
        if (this.FILE_CATEGORIES.image.includes(ext)) {
            return 'image';
        }
        if (this.FILE_CATEGORIES.document.includes(ext)) {
            return 'document';
        }
        if (this.FILE_CATEGORIES.data.includes(ext)) {
            return 'data';
        }
        return 'unknown';
    }
}
exports.ConversionManager = ConversionManager;
//# sourceMappingURL=ConversionManager.js.map