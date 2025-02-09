const mongoose = require('mongoose');

// Permission Schema
const permissionSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    code: {type: String, required: true}, // The code will be inserted on JWT code
    description: String
});

module.exports = mongoose.model('Permission', permissionSchema);