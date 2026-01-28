const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '../resources/fluxify-icon.svg');
const pngPath = path.join(__dirname, '../resources/fluxify-icon.png');

console.log('Generating PNG icon from SVG...');

sharp(svgPath)
    .resize(128, 128)
    .png()
    .toFile(pngPath)
    .then(info => {
        console.log('✅ Icon generated successfully:', info);
    })
    .catch(err => {
        console.error('❌ Error generating icon:', err);
    });
