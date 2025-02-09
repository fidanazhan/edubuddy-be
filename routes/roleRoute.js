const express = require('express');
const Role = require('../models/Role'); // Get Role model
const Permission = require("../models/Permission") // Get Permission Model
const mongoose = require("mongoose");

const roleRoute = express.Router();

// Create a new Role
roleRoute.post('/', async (req, res) => {
    try {
        const { name, code, permissions, tenantId } = req.body;

        // Give error if the tenant is invalid.
        if (!mongoose.Types.ObjectId.isValid(tenantId)) {
            return res.status(400).json({ error: "Invalid tenant ID." });
        }

        const existingRole = await Role.findOne({ name, tenantId });
        if (existingRole) {
            return res.status(400).json({ error: "Role already exists for this tenant." });
        }
        
        // Find permissions by code and return their IDs
        const foundPermissions = await Permission.find({ code: { $in: permissions } });

        // Give error if the permission is not found in the db
        if (foundPermissions.length !== permissions.length) {
            return res.status(400).json({ error: "Some permissions do not exist." });
        }

        const permissionIds = foundPermissions.map(p => p._id);
        const newRole = new Role({ name, code: code, permissions: permissionIds, tenantId });
        const savedRole = await newRole.save();
        res.status(201).json(savedRole);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Get all Roles
roleRoute.get('/', async (req, res) => {
    try {

        const tenantId = req.tenantId
        if(!tenantId){
            return res.status(404).json({ error: 'Please include tenant on header' });
        }

        const roles = await Role.find({ tenantId })
            .populate({ path: 'permissions', select: 'name code' })
            .populate({ path: 'tenantId', select: 'name subdomain' });

        res.status(200).json(roles);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all Roles For Select Field
roleRoute.get('/select', async (req, res) => {
    try {
        const tenantId = req.tenantId
        if (!tenantId) {
            return res.status(404).json({ error: 'Please include tenant in header' });
        }

        const roles = await Role.find({ tenantId })
            .select('name code -_id');

        res.status(200).json(roles);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Get a specific Role by ID
roleRoute.get('/:id', async (req, res) => {
    try {
        const role = await Role.findById(req.params.id).populate('permissions tenantId');
        if (!role) return res.status(404).json({ error: 'Role not found' });
        res.status(200).json(role);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update a Role by ID
roleRoute.put('/:id', async (req, res) => {
    try {
        const { name, permissions, tenantId } = req.body;
        const updatedRole = await Role.findByIdAndUpdate(
            req.params.id,
            { name, permissions, tenantId },
            { new: true, runValidators: true }
        );
        if (!updatedRole) return res.status(404).json({ error: 'Role not found' });
        res.status(200).json(updatedRole);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Delete a Role by ID
roleRoute.delete('/:id', async (req, res) => {
    try {
        const deletedRole = await Role.findByIdAndDelete(req.params.id);
        if (!deletedRole) return res.status(404).json({ error: 'Role not found' });
        res.status(200).json({ message: 'Role deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = roleRoute;
