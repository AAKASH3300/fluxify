import * as fs from 'fs/promises';
import * as path from 'path';
import { FileInfo, ConversionResult, ConversionOptions } from '../types/FileInfo';


// Polyfill for DOMMatrix in Node.js environment
if (typeof (global as any).DOMMatrix === 'undefined') {
    (global as any).DOMMatrix = class DOMMatrix {
        public a: number;
        public b: number;
        public c: number;
        public d: number;
        public e: number;
        public f: number;

        constructor() {
            this.a = 1; this.b = 0;
            this.c = 0; this.d = 1;
            this.e = 0; this.f = 0;
        }
        // Minimal properties to satisfy basic usage
        get is2D() { return true; }
        get isIdentity() { return true; }
        translate() { return this; }
        scale() { return this; }
        rotate() { return this; }
        transformPoint(p: any) { return p; }
    };
}

export class DocumentConverter {
    private turndownService: any; 

    constructor() {
        // Initialize turndown lazily or storing null, but better to allow lazy init in methods or init here if it doesn't break
        // Actually, TurndownService is a require, so we can init here if we require it here.
        // But constructor runs at instantiation. Is instantiation safe?
        // Extension activates -> creates ConversionManager -> creates DocumentConverter -> runs constructor.
        // So constructor IS NOT safe for native modules if they crash on load. 
        // Turndown is JS usually, but let's be safe.
        // We will init it on demand.
    }

    private getTurndownService() {
        if (!this.turndownService) {
            const TurndownService = require('turndown');
            this.turndownService = new TurndownService({
                headingStyle: 'atx',
                codeBlockStyle: 'fenced'
            });
        }
        return this.turndownService;
    }

    async convertDocument(
        fileInfo: FileInfo,
        targetFormat: string,
        outputDir: string,
        options?: ConversionOptions
    ): Promise<ConversionResult> {
        try {
            const sourceFormat = fileInfo.extension.toLowerCase();
            const target = targetFormat.toLowerCase();

            if (sourceFormat === 'docx' || sourceFormat === 'doc') {
                if (target === 'html') return await this.docxToHtml(fileInfo, outputDir);
                if (target === 'txt') return await this.docxToText(fileInfo, outputDir);
                if (target === 'md') return await this.docxToMarkdown(fileInfo, outputDir);
                if (target === 'pdf') return await this.docxToPdf(fileInfo, outputDir);
            } else if (sourceFormat === 'md') {
                if (target === 'html') return await this.markdownToHtml(fileInfo, outputDir);
                if (target === 'pdf') return await this.markdownToPdf(fileInfo, outputDir);
                if (target === 'docx') return await this.markdownToDocx(fileInfo, outputDir);
                if (target === 'txt') return await this.markdownToText(fileInfo, outputDir);
            } else if (sourceFormat === 'html' || sourceFormat === 'htm') {
                if (target === 'md') return await this.htmlToMarkdown(fileInfo, outputDir);
                if (target === 'txt') return await this.htmlToText(fileInfo, outputDir);
                if (target === 'pdf') return await this.htmlToPdf(fileInfo, outputDir);
            } else if (sourceFormat === 'txt') {
                if (target === 'pdf') return await this.textToPdf(fileInfo, outputDir);
                if (target === 'html') return await this.textToHtml(fileInfo, outputDir);
                if (target === 'md') return await this.textToMarkdown(fileInfo, outputDir);
                if (target === 'docx') return await this.textToDocx(fileInfo, outputDir);
            } else if (sourceFormat === 'pdf') {
                 if (target === 'txt') return await this.pdfToText(fileInfo, outputDir);
                 if (target === 'md') return await this.pdfToMarkdown(fileInfo, outputDir);
                 if (target === 'docx') return await this.pdfToDocx(fileInfo, outputDir);
            }

            return { success: false, error: `Conversion from ${sourceFormat} to ${target} not supported.` };

        } catch (error: any) {
            if (error.code === 'MODULE_NOT_FOUND') {
                 return { success: false, error: `Missing dependency: ${error.message}. Please reinstall extension.` };
            }
            return { success: false, error: `Document conversion failed: ${error.message}` };
        }
    }

    // DOCX Methods
    private async docxToHtml(fileInfo: FileInfo, outputDir: string): Promise<ConversionResult> {
        const mammoth = require('mammoth');
        const result = await mammoth.convertToHtml({ path: fileInfo.path });
        const outputPath = path.join(outputDir, `${fileInfo.nameWithoutExt}.html`);
        await fs.writeFile(outputPath, result.value);
        return { success: true, outputPath };
    }

    private async docxToText(fileInfo: FileInfo, outputDir: string): Promise<ConversionResult> {
        const mammoth = require('mammoth');
        const result = await mammoth.extractRawText({ path: fileInfo.path });
        const outputPath = path.join(outputDir, `${fileInfo.nameWithoutExt}.txt`);
        await fs.writeFile(outputPath, result.value);
        return { success: true, outputPath };
    }

    private async docxToMarkdown(fileInfo: FileInfo, outputDir: string): Promise<ConversionResult> {
        const mammoth = require('mammoth');
        const htmlResult = await mammoth.convertToHtml({ path: fileInfo.path });
        const markdown = this.getTurndownService().turndown(htmlResult.value);
        const outputPath = path.join(outputDir, `${fileInfo.nameWithoutExt}.md`);
        await fs.writeFile(outputPath, markdown);
        return { success: true, outputPath };
    }

    private async docxToPdf(fileInfo: FileInfo, outputDir: string): Promise<ConversionResult> {
        const mammoth = require('mammoth');
        // Extract text and wrap
        const result = await mammoth.extractRawText({ path: fileInfo.path });
        return await this.textToPdfHelper(result.value, fileInfo.nameWithoutExt, outputDir);
    }

    // Markdown Methods
    private async markdownToHtml(fileInfo: FileInfo, outputDir: string): Promise<ConversionResult> {
        const { marked } = require('marked');
        const content = await fs.readFile(fileInfo.path, 'utf-8');
        const html = await marked.parse(content);
        const outputPath = path.join(outputDir, `${fileInfo.nameWithoutExt}.html`);
        await fs.writeFile(outputPath, html);
        return { success: true, outputPath };
    }

    private async markdownToPdf(fileInfo: FileInfo, outputDir: string): Promise<ConversionResult> {
        const content = await fs.readFile(fileInfo.path, 'utf-8');
        return await this.textToPdfHelper(content, fileInfo.nameWithoutExt, outputDir);
    }

    private async markdownToDocx(fileInfo: FileInfo, outputDir: string): Promise<ConversionResult> {
        const content = await fs.readFile(fileInfo.path, 'utf-8');
        return await this.textToDocxHelper(content, fileInfo.nameWithoutExt, outputDir);
    }

    private async markdownToText(fileInfo: FileInfo, outputDir: string): Promise<ConversionResult> {
        // Simple copy? Or strip md? For now just copy.
        const content = await fs.readFile(fileInfo.path, 'utf-8');
        const outputPath = path.join(outputDir, `${fileInfo.nameWithoutExt}.txt`);
        await fs.writeFile(outputPath, content);
        return { success: true, outputPath };
    }

    // HTML Methods
    private async htmlToMarkdown(fileInfo: FileInfo, outputDir: string): Promise<ConversionResult> {
        const content = await fs.readFile(fileInfo.path, 'utf-8');
        const markdown = this.getTurndownService().turndown(content);
        const outputPath = path.join(outputDir, `${fileInfo.nameWithoutExt}.md`);
        await fs.writeFile(outputPath, markdown);
        return { success: true, outputPath };
    }

    private async htmlToText(fileInfo: FileInfo, outputDir: string): Promise<ConversionResult> {
        const content = await fs.readFile(fileInfo.path, 'utf-8');
        const text = content.replace(/<[^>]*>/g, '');
        const outputPath = path.join(outputDir, `${fileInfo.nameWithoutExt}.txt`);
        await fs.writeFile(outputPath, text);
        return { success: true, outputPath };
    }

    private async htmlToPdf(fileInfo: FileInfo, outputDir: string): Promise<ConversionResult> {
        const content = await fs.readFile(fileInfo.path, 'utf-8');
        const text = content.replace(/<[^>]*>/g, '');
        return await this.textToPdfHelper(text, fileInfo.nameWithoutExt, outputDir);
    }

    // PDF Methods
    private async pdfToText(fileInfo: FileInfo, outputDir: string): Promise<ConversionResult> {
        const text = await this.extractPdfText(fileInfo.path);
        const outputPath = path.join(outputDir, `${fileInfo.nameWithoutExt}.txt`);
        await fs.writeFile(outputPath, text);
        return { success: true, outputPath };
    }

    private async pdfToMarkdown(fileInfo: FileInfo, outputDir: string): Promise<ConversionResult> {
        const text = await this.extractPdfText(fileInfo.path);
        // Simple wrap? maybe just text for now
        const outputPath = path.join(outputDir, `${fileInfo.nameWithoutExt}.md`);
        await fs.writeFile(outputPath, text);
        return { success: true, outputPath };
    }

    private async pdfToDocx(fileInfo: FileInfo, outputDir: string): Promise<ConversionResult> {
        const text = await this.extractPdfText(fileInfo.path);
        return await this.textToDocxHelper(text, fileInfo.nameWithoutExt, outputDir);
    }

    private async extractPdfText(filePath: string): Promise<string> {
        // Use pdfjs-dist directly via dynamic import
        // We use eval('import') to prevent TypeScript from transpiling it to require()
        const pdfjsLib = await (eval('import("pdfjs-dist/legacy/build/pdf.mjs")') as Promise<any>);
        
        const dataBuffer = await fs.readFile(filePath);
        const uint8Array = new Uint8Array(dataBuffer);
        
        const loadingTask = pdfjsLib.getDocument({ 
            data: uint8Array,
            // Suppress font warning by providing a dummy url or standard path if possible, 
            // or just let it warn (it writes to console).
            // standardFontDataUrl: 'node_modules/pdfjs-dist/standard_fonts/' 
        });
        
        const doc = await loadingTask.promise;
        let fullText = '';
        
        for (let i = 1; i <= doc.numPages; i++) {
            const page = await doc.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            fullText += pageText + '\n';
        }
        
        return fullText;
    }

    // Text Methods
    private async textToPdf(fileInfo: FileInfo, outputDir: string): Promise<ConversionResult> {
        const content = await fs.readFile(fileInfo.path, 'utf-8');
        return await this.textToPdfHelper(content, fileInfo.nameWithoutExt, outputDir);
    }

    private async textToHtml(fileInfo: FileInfo, outputDir: string): Promise<ConversionResult> {
        const content = await fs.readFile(fileInfo.path, 'utf-8');
        const html = content.split('\n').map(line => `<p>${line}</p>`).join('\n');
        const outputPath = path.join(outputDir, `${fileInfo.nameWithoutExt}.html`);
        await fs.writeFile(outputPath, html);
        return { success: true, outputPath };
    }

    private async textToMarkdown(fileInfo: FileInfo, outputDir: string): Promise<ConversionResult> {
        const content = await fs.readFile(fileInfo.path, 'utf-8');
        const outputPath = path.join(outputDir, `${fileInfo.nameWithoutExt}.md`);
        await fs.writeFile(outputPath, content);
        return { success: true, outputPath };
    }

    private async textToDocx(fileInfo: FileInfo, outputDir: string): Promise<ConversionResult> {
        const content = await fs.readFile(fileInfo.path, 'utf-8');
        return await this.textToDocxHelper(content, fileInfo.nameWithoutExt, outputDir);
    }


    // Helpers
    private async textToPdfHelper(text: string, filename: string, outputDir: string): Promise<ConversionResult> {
        const { PDFDocument } = require('pdf-lib');
        
        const pdfDoc = await PDFDocument.create();
        let page = pdfDoc.addPage();
        const { width, height } = page.getSize();
        const fontSize = 12;

        const lines = text.split('\n');
        let y = height - 4 * fontSize;

        for (const line of lines) {
            // Very basic wrapping would go here, skipping for brevity but assuming short lines for now
            // Real implementation needs text wrapping calculation
            if (y < 40) {
                page = pdfDoc.addPage();
                y = height - 4 * fontSize;
            }
            page.drawText(line, { x: 50, y, size: fontSize });
            y -= fontSize + 5;
        }

        const pdfBytes = await pdfDoc.save();
        const outputPath = path.join(outputDir, `${filename}.pdf`);
        await fs.writeFile(outputPath, pdfBytes);
        return { success: true, outputPath };
    }

    private async textToDocxHelper(text: string, filename: string, outputDir: string): Promise<ConversionResult> {
         const docx = require('docx');
         const doc = new docx.Document({
            sections: [{
                properties: {},
                children: text.split('\n').map((line: string) => 
                    new docx.Paragraph({
                        children: [new docx.TextRun(line)],
                    })
                ),
            }],
        });

        const buffer = await docx.Packer.toBuffer(doc);
        const outputPath = path.join(outputDir, `${filename}.docx`);
        await fs.writeFile(outputPath, buffer as Uint8Array);
        return { success: true, outputPath };
    }
}
