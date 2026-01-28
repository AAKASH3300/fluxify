<div align="center">

<img src="resources/fluxify-icon.png" width="128" alt="Fluxify Logo" />

# 🌊 Fluxify

**Transform anything into anything**

[![Fluxify](https://img.shields.io/badge/Fluxify-v1.1.0-00d4ff?style=for-the-badge&logo=visual-studio-code)][marketplace-link]

Transform files between 25+ formats with a beautiful interface and lightning-fast performance.

</div>

---

## 🚀 Features

Fluxify makes format conversion beautiful, fast, and effortless.

### 🖼️ Image Conversion
✅ Transform between **PNG, JPG, WebP, GIF, BMP, TIFF, and PDF**  
✅ High-quality output with adjustable settings  
✅ Batch processing support  
✅ Preserve or optimize quality  

### 📄 Document Processing
✅ Convert **DOCX, PDF, HTML, Markdown, and TXT** files  
✅ Maintain formatting where possible  
✅ Extract text from PDFs  
✅ Generate professional PDFs  

### 💾 Data Format Transformation
✅ Switch between **JSON, CSV, XML, and YAML**  
✅ Preserve data structure  
✅ Smart type conversion  
✅ Handle nested objects  

### ✨ Extensions & Workflow
✅ **Auto-Open**: Automatically opens converted files in a new tab  
✅ **Batch Processing**: Convert multiple files in one go  
✅ **Drag & Drop**: Intuitive web interface for file selection  
✅ **History Tracking**: Keep track of your recent conversions in the sidebar  
✅ **Smart Detection**: Automatically suggests valid target formats  

---

## 🏗️ Architecture

Fluxify follows a clean, modular architecture separating UI, conversion logic, and extension lifecycle.

```
extension/
├── src/
│   ├── extension.ts                # Extension entry point & command registration
│   ├── converters/                 # Core conversion logic
│   │   ├── ConversionManager.ts    # Orchestrates conversion requests
│   │   ├── ImageConverter.ts       # Handles image transformations (Sharp)
│   │   ├── DocumentConverter.ts    # Handles docs (Mammoth, PDF-Lib)
│   │   └── DataConverter.ts        # Handles data formats (XML2JS, YAML)
│   └── webview/                    # UI Implementation
│       ├── ConverterWebviewProvider.ts # Webview panel logic
│       └── SidebarProvider.ts      # Sidebar view logic
├── resources/                      # Icons and assets
└── package.json                    # Manifest & dependencies
```

---

## 🚀 Quick Start

### Installation

1. Open **VS Code**
2. Press `Ctrl+Shift+X`
3. Search for **Fluxify**
4. Click **Install**

### Usage

**Method 1: Webview Panel (Recommended)**
1. Press `Ctrl+Shift+P`
2. Type `Fluxify: Open Converter`
3. Drag & drop files or browse to select
4. Choose target format & convert!

**Method 2: Context Menu**
1. Right-click any supported file in Explorer
2. Select `Fluxify: Convert File`
3. Choose format & done!

**Method 3: Batch Convert**
1. Select multiple files or a folder
2. Right-click → "Fluxify: Batch Convert"
3. Choose target format
4. All files converted!
---

<img width="1240" height="720" alt="image" src="https://github.com/user-attachments/assets/ecb71260-32a1-4839-8956-d6e6cc61a6bc" />

## ⚙️ Configuration

Customize Fluxify in your VS Code `settings.json`:

```json
{
  "fluxify.imageQuality": 90,,
  "fluxify.outputDirectory": "same",
  "fluxify.autoOpenFile": true,
  "fluxify.deleteOriginal": false,
  "fluxify.showSuccessNotification": true
}
```

| Setting | Type | Default | Description |
|:--------|:-----|:--------|:------------|
| `fluxify.imageQuality` | `number` | `90` | Quality for JPEG/WebP (1-100) |
| `fluxify.outputDirectory` | `string` | `"same"` | Where to save files (`same` or `custom`) |
| `fluxify.autoOpenFile` | `boolean` | `true` | Open file after conversion |
| `fluxify.showSuccessNotification` | `boolean` | `true` | Show status popup |

---

## 🛠️ Development

### Prerequisites
*   Node.js: >= 18.0.0
*   VS Code: >= 1.80.0

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/AAKASH3300/fluxify.git
cd fluxify

# 2. Install dependencies
npm install

# 3. Build the extension
npm run compile
```

### Debugging
1. Open the project in VS Code.
2. Press `F5` to launch the **Extension Development Host**.
3. Test functionality in the new window.

---

## 🐛 Troubleshooting

| Issue | Solution |
|:------|:---------|
| **Extension not loading** |  Reload window (`Ctrl+R`) or check VS Code version. |
| **Conversion failed** | Ensure file is not corrupted and you have write permissions. |
| **"Command not found"** | Reactivate extension by opening a supported file. |
| **Slow Image Conversion** | Reduce `fluxify.imageQuality` setting for faster processing. |

---

## 🤝 Contributing

We welcome contributions! Please check [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repo
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

<div align="center">

**Made with 💙 for developers and creators by Aakash Balasubramanian**

[Report Bug][issues-link] • [Request Feature][issues-link]

</div>

<!-- Link References -->
[marketplace-link]: https://marketplace.visualstudio.com/items?itemName=AakashBalasubramanian.fluxify
[github-link]: https://github.com/AAKASH3300/fluxify
[issues-link]: https://github.com/AAKASH3300/fluxify/issues
