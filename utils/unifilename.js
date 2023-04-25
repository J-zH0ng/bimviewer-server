const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

function generateUniqueFileName(originalFileName, directoryName) {
    const ext = path.extname(originalFileName);
    const baseName = path.basename(originalFileName, ext);

    let uniqueFileName = baseName + '-' + uuidv4() + ext;

    while (fs.existsSync(`public/${directoryName}/` + uniqueFileName)) {
        uniqueFileName = baseName + '-' + uuidv4() + ext;
    }

    return uniqueFileName;
}

module.exports = generateUniqueFileName