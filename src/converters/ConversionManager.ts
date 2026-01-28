import * as vscode from 'vscode';
import { FileInfo, ConversionResult, ConversionOptions } from '../types/FileInfo';
import { ImageConverter } from './ImageConverter';
import { DocumentConverter } from './DocumentConverter';
import { DataConverter } from './DataConverter';

export class ConversionManager {
    private imageConverter: ImageConverter;
    private documentConverter: DocumentConverter;
    private dataConverter: DataConverter;

    private readonly FILE_CATEGORIES = {
        image: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff', 'tif'],
        document: ['pdf', 'docx', 'doc', 'txt', 'md', 'html', 'htm'],
        data: ['json', 'csv', 'xml', 'yaml', 'yml']
    };

    private readonly CONVERSION_PATHS: { [key: string]: string[] } = {
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

    constructor() {
        this.imageConverter = new ImageConverter();
        this.documentConverter = new DocumentConverter();
        this.dataConverter = new DataConverter();
    }

    public isSupported(extension: string): boolean {
        const normalizedExt = extension.toLowerCase();
        return Object.keys(this.CONVERSION_PATHS).includes(normalizedExt);
    }

    public getSupportedTargetFormats(sourceExtension: string): string[] {
        const normalizedExt = sourceExtension.toLowerCase();
        return this.CONVERSION_PATHS[normalizedExt] || [];
    }

    public async convert(
        fileInfo: FileInfo,
        targetFormat: string,
        outputDir: string,
        options?: ConversionOptions
    ): Promise<ConversionResult> {
        const category = this.getFileCategory(fileInfo.extension);

        // Get default quality from config if not provided
        const config = vscode.workspace.getConfiguration('fluxify');
        const defaultQuality = config.get<number>('imageQuality', 90);
        
        const finalOptions: ConversionOptions = {
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
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Unknown error during conversion'
            };
        }
    }

    private getFileCategory(extension: string): 'image' | 'document' | 'data' | 'unknown' {
        const ext = extension.toLowerCase();
        if (this.FILE_CATEGORIES.image.includes(ext)) { return 'image'; }
        if (this.FILE_CATEGORIES.document.includes(ext)) { return 'document'; }
        if (this.FILE_CATEGORIES.data.includes(ext)) { return 'data'; }
        return 'unknown';
    }
}
