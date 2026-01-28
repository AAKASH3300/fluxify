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
exports.DataConverter = void 0;
const Papa = __importStar(require("papaparse"));
const yaml = __importStar(require("js-yaml"));
const xml2js = __importStar(require("xml2js"));
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
class DataConverter {
    async convertData(fileInfo, targetFormat, outputDir, options) {
        try {
            // 1. Parse Source
            let data;
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
            let outputContent = '';
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
        }
        catch (error) {
            return { success: false, error: `Data conversion failed: ${error.message}` };
        }
    }
    parseCsv(content) {
        return new Promise((resolve, reject) => {
            Papa.parse(content, {
                header: true,
                dynamicTyping: true,
                complete: (results) => resolve(results.data),
                error: (error) => reject(error)
            });
        });
    }
    parseXml(content) {
        const parser = new xml2js.Parser({ explicitArray: false });
        return parser.parseStringPromise(content);
    }
    toCsv(data) {
        if (Array.isArray(data)) {
            return Papa.unparse(data);
        }
        else if (typeof data === 'object' && data !== null) {
            // Convert single object to array for CSV
            return Papa.unparse([data]);
        }
        return String(data);
    }
    toXml(data) {
        const builder = new xml2js.Builder({ rootName: 'root' });
        return builder.buildObject(data);
    }
}
exports.DataConverter = DataConverter;
//# sourceMappingURL=DataConverter.js.map