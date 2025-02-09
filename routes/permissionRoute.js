const express = require('express');
const Permission = require('../models/Permission'); // Adjust path if necessary

const permissionRoute = express.Router();

// Create a new Permission
permissionRoute.post('/', async (req, res) => {
    try {
        const { name, code, description } = req.body;
        const newPermission = new Permission({ name, code, description });
        const savedPermission = await newPermission.save();
        res.status(201).json(savedPermission);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Get all Permissions
permissionRoute.get('/', async (req, res) => {
    try {
        const permissions = await Permission.find();
        res.status(200).json(permissions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get a specific Permission by ID
permissionRoute.get('/:id', async (req, res) => {
    try {
        const permission = await Permission.findById(req.params.id);
        if (!permission) return res.status(404).json({ error: 'Permission not found' });
        res.status(200).json(permission);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update a Permission by ID
permissionRoute.put('/:id', async (req, res) => {
    try {
        const { name, description } = req.body;
        const updatedPermission = await Permission.findByIdAndUpdate(
            req.params.id,
            { name, description },
            { new: true, runValidators: true }
        );
        if (!updatedPermission) return res.status(404).json({ error: 'Permission not found' });
        res.status(200).json(updatedPermission);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Delete a Permission by ID
permissionRoute.delete('/:id', async (req, res) => {
    try {
        const deletedPermission = await Permission.findByIdAndDelete(req.params.id);
        if (!deletedPermission) return res.status(404).json({ error: 'Permission not found' });
        res.status(200).json({ message: 'Permission deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = permissionRoute;
