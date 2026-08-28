const fs = require('fs');
const path = require('path');

// Read the alternatives data
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'alternatives-data.json'), 'utf8'));

// Read the current index.ts template (without the placeholder)
let template = fs.readFileSync(path.join(__dirname, 'index.ts'), 'utf8');

// Replace TOOLS_DATA_PLACEHOLDER with actual data
const dataStr = JSON.stringify(data);
template = template.replace('TOOLS_DATA_PLACEHOLDER', dataStr);

// Write the final index.ts
fs.writeFileSync(path.join(__dirname, 'index.ts'), template);
console.log('Generated index.ts:', template.length, 'bytes,', data.length, 'tools');
