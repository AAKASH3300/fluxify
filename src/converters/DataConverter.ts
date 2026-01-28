import * as Papa from 'papaparse';
import * as yaml from 'js-yaml';
import * as xml2js from 'xml2js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FileInfo, ConversionResult, ConversionOptions } from '../types/FileInfo';

export class DataConverter {
    async convertData(
        fileInfo: FileInfo,
        targetFormat: string,
        outputDir: string,
        options?: ConversionOptions
    ): Promise<ConversionResult> {
        try {
            // 1. Parse Source
            let data: any;
            const sourceFormat = fileInfo.extension.toLowerCase();
            const content = await fs.readFile(fileInfo.path, 'utf-8');

            switch (sourceFormat) {
                case 'json':
                    data = JSON.parse(content);
                    break;
                case 'csv':
                    data = await this.parseCsv(content);
                    break;
                case 'xml':
                    data = await this.parseXml(content);
                    break;
                case 'yaml':
                case 'yml':
                    data = yaml.load(content);
                    break;
                default:
                    return { success: false, error: `Unsupported data source format: ${sourceFormat}` };
            }

            // 2. Convert to Target and Write
            const target = targetFormat.toLowerCase();
            const outputPath = path.join(outputDir, `${fileInfo.nameWithoutExt}.${target}`);
            let outputContent: string = '';

            switch (target) {
                case 'json':
                    outputContent = JSON.stringify(data, null, 2);
                    break;
                case 'csv':
                    outputContent = this.toCsv(data);
                    break;
                case 'xml':
                    outputContent = this.toXml(data);
                    break;
                case 'yaml':
                case 'yml':
                    outputContent = yaml.dump(data);
                    break;
                case 'txt':
                    outputContent = JSON.stringify(data, null, 2); // Fallback for text
                    break;
                default:
                    return { success: false, error: `Unsupported data target format: ${target}` };
            }

            await fs.writeFile(outputPath, outputContent);
            return { success: true, outputPath };

        } catch (error: any) {
            return { success: false, error: `Data conversion failed: ${error.message}` };
        }
    }

    private parseCsv(content: string): Promise<any> {
        return new Promise((resolve, reject) => {
            Papa.parse(content, {
                header: true,
                dynamicTyping: true,
                complete: (results: any) => resolve(results.data),
                error: (error: any) => reject(error)
            });
        });
    }

    private parseXml(content: string): Promise<any> {
        const parser = new xml2js.Parser({ explicitArray: false });
        return parser.parseStringPromise(content);
    }

    private toCsv(data: any): string {
        if (Array.isArray(data)) {
            return Papa.unparse(data);
        } else if (typeof data === 'object' && data !== null) {
            // Convert single object to array for CSV
             return Papa.unparse([data]);
        }
        return String(data);
    }

    private toXml(data: any): string {
        const builder = new xml2js.Builder({ rootName: 'root' });
        return builder.buildObject(data);
    }
}
