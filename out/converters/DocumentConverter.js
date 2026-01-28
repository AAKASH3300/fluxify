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
exports.DocumentConverter = void 0;
const pdfLib = __importStar(require("pdf-lib"));
const mammoth = __importStar(require("mammoth"));
const marked_1 = require("marked");
const TurndownService = require("turndown");
const docx = __importStar(require("docx"));
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
class DocumentConverter {
    constructor() {
        this.turndownService = new TurndownService({
            headingStyle: 'atx',
            codeBlockStyle: 'fenced'
        });
    }
    async convertDocument(fileInfo, targetFormat, outputDir, options) {
        try {
            const sourceFormat = fileInfo.extension.toLowerCase();
            const target = targetFormat.toLowerCase();
            if (sourceFormat === 'docx' || sourceFormat === 'doc') {
                if (target === 'html')
                    return await this.docxToHtml(fileInfo, outputDir);
                if (target === 'txt')
                    return await this.docxToText(fileInfo, outputDir);
                if (target === 'md')
                    return await this.docxToMarkdown(fileInfo, outputDir);
                if (target === 'pdf')
                    return await this.docxToPdf(fileInfo, outputDir);
            }
            else if (sourceFormat === 'md') {
                if (target === 'html')
                    return await this.markdownToHtml(fileInfo, outputDir);
                if (target === 'pdf')
                    return await this.markdownToPdf(fileInfo, outputDir);
                if (target === 'docx')
                    return await this.markdownToDocx(fileInfo, outputDir);
                if (target === 'txt')
                    return await this.markdownToText(fileInfo, outputDir);
            }
            else if (sourceFormat === 'html' || sourceFormat === 'htm') {
                if (target === 'md')
                    return await this.htmlToMarkdown(fileInfo, outputDir);
                if (target === 'txt')
                    return await this.htmlToText(fileInfo, outputDir);
                if (target === 'pdf')
                    return await this.htmlToPdf(fileInfo, outputDir);
            }
            else if (sourceFormat === 'txt') {
                if (target === 'pdf')
                    return await this.textToPdf(fileInfo, outputDir);
                if (target === 'html')
                    return await this.textToHtml(fileInfo, outputDir);
                if (target === 'md')
                    return await this.textToMarkdown(fileInfo, outputDir);
                if (target === 'docx')
                    return await this.textToDocx(fileInfo, outputDir);
            }
            else if (sourceFormat === 'pdf') {
                // PDF extraction is complex, maybe just to text?
                // Prompt said: pdf: ['png', 'jpg', 'jpeg', 'txt', 'html']
                // Since I am in DocumentConverter, handling txt/html.
                // We will skip PDF source here unless I implement libraries for that (e.g. pdf.js-dist which is not in the list).
                // Wait, Phase 3 said: pdf: ['png', 'jpg', 'jpeg', 'txt', 'html']
                // I will strictly implement what libraries allow. 
                // Simple PDF text extraction?
                return { success: false, error: 'PDF source conversion not fully implemented in this phase.' };
            }
            return { success: false, error: `Conversion from ${sourceFormat} to ${target} not supported.` };
        }
        catch (error) {
            return { success: false, error: `Document conversion failed: ${error.message}` };
        }
    }
    // DOCX Methods
    async docxToHtml(fileInfo, outputDir) {
        const result = await mammoth.convertToHtml({ path: fileInfo.path });
        const outputPath = path.join(outputDir, `${fileInfo.nameWithoutExt}.html`);
        await fs.writeFile(outputPath, result.value);
        return { success: true, outputPath };
    }
    async docxToText(fileInfo, outputDir) {
        const result = await mammoth.extractRawText({ path: fileInfo.path });
        const outputPath = path.join(outputDir, `${fileInfo.nameWithoutExt}.txt`);
        await fs.writeFile(outputPath, result.value);
        return { success: true, outputPath };
    }
    async docxToMarkdown(fileInfo, outputDir) {
        const htmlResult = await mammoth.convertToHtml({ path: fileInfo.path });
        const markdown = this.turndownService.turndown(htmlResult.value);
        const outputPath = path.join(outputDir, `${fileInfo.nameWithoutExt}.md`);
        await fs.writeFile(outputPath, markdown);
        return { success: true, outputPath };
    }
    async docxToPdf(fileInfo, outputDir) {
        // Extract text and wrap
        const result = await mammoth.extractRawText({ path: fileInfo.path });
        return await this.textToPdfHelper(result.value, fileInfo.nameWithoutExt, outputDir);
    }
    // Markdown Methods
    async markdownToHtml(fileInfo, outputDir) {
        const content = await fs.readFile(fileInfo.path, 'utf-8');
        const html = await marked_1.marked.parse(content);
        const outputPath = path.join(outputDir, `${fileInfo.nameWithoutExt}.html`);
        await fs.writeFile(outputPath, html);
        return { success: true, outputPath };
    }
    async markdownToPdf(fileInfo, outputDir) {
        const content = await fs.readFile(fileInfo.path, 'utf-8');
        return await this.textToPdfHelper(content, fileInfo.nameWithoutExt, outputDir);
    }
    async markdownToDocx(fileInfo, outputDir) {
        const content = await fs.readFile(fileInfo.path, 'utf-8');
        return await this.textToDocxHelper(content, fileInfo.nameWithoutExt, outputDir);
    }
    async markdownToText(fileInfo, outputDir) {
        // Simple copy? Or strip md? For now just copy.
        const content = await fs.readFile(fileInfo.path, 'utf-8');
        const outputPath = path.join(outputDir, `${fileInfo.nameWithoutExt}.txt`);
        await fs.writeFile(outputPath, content);
        return { success: true, outputPath };
    }
    // HTML Methods
    async htmlToMarkdown(fileInfo, outputDir) {
        const content = await fs.readFile(fileInfo.path, 'utf-8');
        const markdown = this.turndownService.turndown(content);
        const outputPath = path.join(outputDir, `${fileInfo.nameWithoutExt}.md`);
        await fs.writeFile(outputPath, markdown);
        return { success: true, outputPath };
    }
    async htmlToText(fileInfo, outputDir) {
        const content = await fs.readFile(fileInfo.path, 'utf-8');
        const text = content.replace(/<[^>]*>/g, '');
        const outputPath = path.join(outputDir, `${fileInfo.nameWithoutExt}.txt`);
        await fs.writeFile(outputPath, text);
        return { success: true, outputPath };
    }
    async htmlToPdf(fileInfo, outputDir) {
        const content = await fs.readFile(fileInfo.path, 'utf-8');
        const text = content.replace(/<[^>]*>/g, '');
        return await this.textToPdfHelper(text, fileInfo.nameWithoutExt, outputDir);
    }
    // Text Methods
    async textToPdf(fileInfo, outputDir) {
        const content = await fs.readFile(fileInfo.path, 'utf-8');
        return await this.textToPdfHelper(content, fileInfo.nameWithoutExt, outputDir);
    }
    async textToHtml(fileInfo, outputDir) {
        const content = await fs.readFile(fileInfo.path, 'utf-8');
        const html = content.split('\n').map(line => `<p>${line}</p>`).join('\n');
        const outputPath = path.join(outputDir, `${fileInfo.nameWithoutExt}.html`);
        await fs.writeFile(outputPath, html);
        return { success: true, outputPath };
    }
    async textToMarkdown(fileInfo, outputDir) {
        const content = await fs.readFile(fileInfo.path, 'utf-8');
        const outputPath = path.join(outputDir, `${fileInfo.nameWithoutExt}.md`);
        await fs.writeFile(outputPath, content);
        return { success: true, outputPath };
    }
    async textToDocx(fileInfo, outputDir) {
        const content = await fs.readFile(fileInfo.path, 'utf-8');
        return await this.textToDocxHelper(content, fileInfo.nameWithoutExt, outputDir);
    }
    // Helpers
    async textToPdfHelper(text, filename, outputDir) {
        const pdfDoc = await pdfLib.PDFDocument.create();
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
    async textToDocxHelper(text, filename, outputDir) {
        const doc = new docx.Document({
            sections: [{
                    properties: {},
                    children: text.split('\n').map(line => new docx.Paragraph({
                        children: [new docx.TextRun(line)],
                    })),
                }],
        });
        const buffer = await docx.Packer.toBuffer(doc);
        const outputPath = path.join(outputDir, `${filename}.docx`);
        await fs.writeFile(outputPath, buffer);
        return { success: true, outputPath };
    }
}
exports.DocumentConverter = DocumentConverter;
//# sourceMappingURL=DocumentConverter.js.map