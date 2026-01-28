export interface FileInfo {
    path: string;
    name: string;
    nameWithoutExt: string;
    extension: string;
    directory: string;
}

export interface ConversionResult {
    success: boolean;
    outputPath?: string;
    error?: string;
}

export interface ConversionOptions {
    quality?: number;
    width?: number;
    height?: number;
    maintainAspectRatio?: boolean;
}
