const vscode = acquireVsCodeApi();

// Elements
const selectBtn = document.getElementById('select-btn');
const convertBtn = document.getElementById('convert-btn');
const formatSelect = document.getElementById('format-select');
const fileInfo = document.getElementById('file-info');
const fileName = document.getElementById('file-name');
const convertSection = document.getElementById('convert-section');
const loading = document.getElementById('loading');

// Handlers
selectBtn.addEventListener('click', () => {
    vscode.postMessage({ command: 'selectFile' });
});

convertBtn.addEventListener('click', () => {
    const format = formatSelect.value;
    if (format) {
        setLoading(true);
        vscode.postMessage({ command: 'convert', format: format });
    }
});

// State Management
function setLoading(isLoading) {
    if (isLoading) {
        convertBtn.disabled = true;
        loading.classList.remove('hidden');
    } else {
        convertBtn.disabled = false;
        loading.classList.add('hidden');
    }
}

// Message Listener
window.addEventListener('message', event => {
    const message = event.data;
    switch (message.command) {
        case 'fileSelected':
            fileName.textContent = message.fileName;
            fileInfo.classList.remove('hidden');
            convertSection.classList.remove('hidden');

            // Populate formats
            formatSelect.innerHTML = '';
            message.formats.forEach(format => {
                const option = document.createElement('option');
                option.value = format;
                option.text = format.toUpperCase();
                formatSelect.appendChild(option);
            });
            break;

        case 'conversionSuccess':
            setLoading(false);
            vscode.postMessage({ command: 'showInfo', text: `✅ Converted successfully to ${message.outputPath}` });
            break;

        case 'conversionError':
            setLoading(false);
            vscode.postMessage({ command: 'showError', text: `❌ ${message.error}` });
            break;
    }
});
