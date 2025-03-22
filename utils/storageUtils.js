// utils/storageUtils.js

function parseStorage(storageString) {
    const regex = /^(\d+)(B|KB|MB|GB)$/; // Regex to extract value and unit
    const match = storageString.match(regex);
    
    if (!match) {
        throw new Error("Invalid storage format. Use format like '10MB', '512KB', etc.");
    }

    const value = parseInt(match[1], 10); // Extract numeric value
    const unit = match[2]; // Extract unit

    return convertToBytes(value, unit);
}

function convertToBytes(value, unit) {
    const units = {
        'B': 1,
        'KB': 1024,
        'MB': 1024 * 1024,
        'GB': 1024 * 1024 * 1024
    };

    return value * (units[unit] || 1);
}

module.exports = { parseStorage, convertToBytes }; // Export functions
