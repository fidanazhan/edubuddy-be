const express = require('express');
const userRouter = express.Router();
const User = require('../models/User');
const Tenant = require('../models/Tenant')
const Role = require('../models/Role')
const Group = require('../models/Group')
const GroupUser = require('../models/GroupUser')
const mongoose = require("mongoose");

// Create User
userRouter.post('/', async (req, res) => {

    const { name, email, role, status, groups } = req.body;

    // const session = await mongoose.startSession();
    // session.startTransaction();
    
    try {

        const tenantId = req.tenantId
        if(!tenantId){
            return res.status(404).json({ error: 'Please include tenant on header' });
        }

        // Search for the role by name and tenantId
        const role = await Role.findOne({ code: req.body.role.toUpperCase(), tenantId: tenantId });        
        if (!role) {
            return res.status(400).json({ error: 'Role not found for this tenant' });
        }

        const groupsDB = await Group.find({ code: { $in: groups } });
        if (groupsDB.length !== groups.length) {
            return res.status(400).json({ message: 'One or more group codes are invalid.' });
        }

        const groupIds = groupsDB.map(g => g._id);
        
        // Create the user with the role
        const user = new User({
            ...req.body,
            tenantId: tenantId,
            groups: groupIds,
            role: role._id // Assuming you want to store the role reference in the User model
        });

        // Add entries to GroupUser
        const groupUserEntries = groupIds.map(groupId => ({
            groupId,
            userId: savedUser._id
        }));

        // await GroupUser.insertMany(groupUserEntries, { session });
        await GroupUser.insertMany(groupUserEntries);

        // await session.commitTransaction();
        // session.endSession();
        
        const savedUser = await user.save();
        res.status(201).json(savedUser);
    } catch (error) {
        // await session.abortTransaction();
        // session.endSession();

        if (error.code === 11000) {
            return res.status(400).json({ error: 'This email is already in use. Please choose a different email address.' });
        }

        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: 'Name field is missing or invalid' });
        }

        if (error instanceof mongoose.Error.CastError) {
            return res.status(400).json({ error: 'Invalid ID format' }); // Invalid ID format for tenant or role
        }

        if (error.name === 'MongoNetworkError') {
            return res.status(500).json({ error: 'Network connection error' }); // Database connection error
        }

        res.status(400).json({ error: error.message });
    }
});

// Get All Users From Specific Tenant
userRouter.get('/', async (req, res) => {
    try {

        if(!req.tenantId){
            return res.status(404).json({ error: 'Please include tenant on header' });
        }

        const page = parseInt(req.query.page) || 1; // Default page 1
        const limit = parseInt(req.query.limit) || 10; // Default 5 data per page
        const skip = (page - 1) * limit;

        const searchQuery = req.query.search || '';
        const tenantId = req.tenantId;

        const searchConditions = {
            tenantId,
            $or: [
                { name: { $regex: searchQuery, $options: 'i' } },
                { email: { $regex: searchQuery, $options: 'i' } } 
            ]
        };

        // Fetch paginated users with search conditions
        const users = await User.find(searchConditions, '-tenantId -createdAt -modifiedAt')
            .populate('groups', 'name code')
            .populate('role', 'name code permissions -_id')
            .skip(skip)
            .limit(limit);

        const total = await User.countDocuments(searchConditions);

        res.json({
            total,
            page,
            pages: Math.ceil(total / limit),
            limit,
            data: users,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});





// Get User by ID
userRouter.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update User by ID
userRouter.put('/:id', async (req, res) => {

    const { name, email, role, status, groups } = req.body;

    // const session = await mongoose.startSession();
    // session.startTransaction();

    try {
     
        const tenantId = req.tenantId
        const userId = req.params.id;

        if(!tenantId){
            return res.status(404).json({ error: 'Please include tenant on header' });
        }
        
        const role = await Role.findOne({ code: req.body.role.toUpperCase(), tenantId: tenantId });
        if (!role) {
            return res.status(400).json({ error: 'Role not found for this tenant' });
        }

        const existingUser = await User.findById(userId);
        if (!existingUser) {
            return res.status(404).json({ message: "User not found" });
        }

        const groupsDB = await Group.find({ code: { $in: groups } });
        if (groupsDB.length !== groups.length) {
            return res.status(400).json({ message: 'One or more group codes are invalid.' });
        }

        // Fetch existing groups from GroupUser
        // const existingGroupUserEntries = await GroupUser.find({ userId }).session(session);
        const existingGroupUserEntries = await GroupUser.find({ userId });
        const existingGroupIds = existingGroupUserEntries.map(g => g.groupId.toString());

        const newGroupIds = groupsDB.map(g => g._id.toString());

        // Find groups to add (new ones that don't exist)
        const groupsToAdd = newGroupIds.filter(gid => !existingGroupIds.includes(gid));

        // ✅ FIXED: Find groups to remove (existing ones that are NOT in the new request)
        const groupsToRemove = existingGroupIds.filter(gid => !newGroupIds.includes(gid));

        console.log("----------------------------")
        console.log("Groups (RequestGroup): " + groups)
        console.log("Groups (ExistingGroup): " + existingGroupIds)
        console.log("Groups (NewGroupId): " + newGroupIds)
        console.log("Groups (Add): " + groupsToAdd)
        console.log("Groups (Remove): " + groupsToRemove)

        // Add new GroupUser entries
        if (groupsToAdd.length > 0) {
            const groupUserEntries = groupsToAdd.map(groupId => ({ groupId, userId }));
            // await GroupUser.insertMany(groupUserEntries, { session });
            await GroupUser.insertMany(groupUserEntries);
        }

        // Remove GroupUser entries
        if (groupsToRemove.length > 0) {
            // await GroupUser.deleteMany({ groupId: { $in: groupsToRemove }, userId }).session(session);
            await GroupUser.deleteMany({ groupId: { $in: groupsToRemove }, userId });
        }

        existingUser.name = req.body.name || existingUser.name;
        existingUser.email = req.body.email || existingUser.email;
        existingUser.role = role._id;
        existingUser.status = req.body.status || existingUser.status;
        existingUser.groups = newGroupIds;
        await existingUser.save();

        // await session.commitTransaction();
        // session.endSession();

        res.status(200).json({ message: 'User updated successfully', user: existingUser });

    } catch (error) {
        // await session.abortTransaction();
        // session.endSession();
        res.status(400).json({ error: error.message });
    }
});

// Delete User by ID
userRouter.delete('/:id', async (req, res) => {
    try {
        const deletedUser = await User.findByIdAndDelete(req.params.id);
        if (!deletedUser) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = userRouter;