const express = require('express');
const mongoose = require('mongoose');
const Group = require('../models/Group');
const GroupUser = require('../models/GroupUser');
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

const groupRouter = express.Router();

// CREATE API FOR GROUP
groupRouter.post('/', authMiddleware, async (req, res) => {
  const { name, description, code } = req.body;

  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Please include tenant in the header' });
    }

    // Check if user exists
    const userExists = await User.findById(req.decodedJWT.id);
    if (!userExists) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (/\s/.test(code)) {
      return res.status(400).json({ error: 'Group code must not contain spaces' });
    }

    // Check if group code already exists within the tenant
    const existingGroup = await Group.findOne({ code, tenantId });
    if (existingGroup) {
      return res.status(400).json({ error: 'Group code already exists within this tenant' });
    }

    // Create group
    const newGroup = new Group({ name, description, code, createdBy: req.decodedJWT.id, tenantId });
    await newGroup.save();

    res.status(201).json({ message: 'Group created successfully', group: newGroup });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error: ' + err });
  }
});


// Get group by specific tenants
groupRouter.get('/tenant', authMiddleware, async (req, res) => {

  try {
      const tenantId = req.tenantId;
      if (!tenantId) {
          return res.status(404).json({ message: 'Please include tenant on the header' });
      }

      const page = parseInt(req.query.page) || 1; // Default page 1
      const limit = parseInt(req.query.limit) || 10; // Default 10 items per page
      const skip = (page - 1) * limit;
      const searchQuery = req.query.search || '';

      const searchConditions = {
          tenantId,
          name: { $regex: searchQuery, $options: 'i' } // Search by group name (case insensitive)
      };

      // Fetch paginated groups with search conditions
      const groups = await Group.find(searchConditions)
          .skip(skip)
          .limit(limit);

      const total = await Group.countDocuments(searchConditions);

      res.json({
          total,
          page,
          pages: Math.ceil(total / limit),
          limit,
          data: groups,
      });
  } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
  }
});

// API for select2
groupRouter.get('/tenant/select', async (req, res) => {

  try {
    
    const tenantId = req.tenantId
    if (!tenantId) {
      return res.status(404).json({ message: 'Please include tenant on the header' });
    }

    // Fetch groups under this tenant
    const groups = await Group.find({ tenantId })
              .select('name code -_id');;

    res.status(200).json(groups);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});



// UPDATE API FOR GROUP
groupRouter.put('/:groupId', authMiddleware, async (req, res) => {
  const { groupId } = req.params;
  const { name, description, code } = req.body;

  try {
    // Ensure the tenantId is included in the request headers
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Please include tenant in the header' });
    }

    // Find the group and ensure it belongs to the tenant
    const group = await Group.findOne({ _id: groupId, tenantId });
    if (!group) {
      return res.status(404).json({ message: 'Group not found or does not belong to the tenant' });
    }

    // Check if the new code (if provided) is already used within the same tenant
    if (code && code !== group.code) {
      const existingGroup = await Group.findOne({ code, tenantId });
      if (existingGroup) {
        return res.status(400).json({ message: 'Group code already exists within this tenant' });
      }

      if (/\s/.test(code)) {
        return res.status(400).json({ error: 'Group code must not contain spaces' });
      }
    }

    

    // Update group details
    const updatedGroup = await Group.findOneAndUpdate(
      { _id: groupId, tenantId },
      { $set: { name: name || group.name, description: description || group.description, code: code || group.code } },
      { new: true } // Return updated document
    );

    res.status(200).json({ message: 'Group updated successfully', group: updatedGroup });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

groupRouter.delete('/:groupId', async (req, res) => {
  const { groupId } = req.params;
  const tenantId = req.tenantId;
  
  try {
    // Ensure the group exists and belongs to the correct tenant
    const group = await Group.findOne({ _id: groupId, tenantId });

    if (!group) {
      return res.status(404).json({ message: 'Group not found or does not belong to the tenant' });
    }

    // Delete the group
    await Group.deleteOne({ _id: groupId });

    res.status(200).json({ message: 'Group deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


// Get users from group
groupRouter.get('/getUsers/:groupId', authMiddleware, async (req, res) => {
  try {
    const { groupId } = req.params;
    const tenantId = req.decodedJWT.tenant; // Extracted from token
    const searchUserId = req.query.search || ''; // Search by userId
    const page = parseInt(req.query.page) || 1; // Default to page 1
    const limit = parseInt(req.query.limit) || 10; // Default to 10 results per page
    const skip = (page - 1) * limit;

    // Validate groupId
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ error: 'Invalid groupId' });
    }

    // Build query
    const query = { groupId, tenantId };
    if (searchUserId && mongoose.Types.ObjectId.isValid(searchUserId)) {
      query.userId = searchUserId; // Search by exact userId
    }

    // Fetch users with pagination
    const usersInGroup = await GroupUser.find(query)
      .populate('userId', 'name email') // Populate user details
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await GroupUser.countDocuments(query);

    res.json({
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
      data: usersInGroup,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error, ' + error.message });
  }
});




module.exports = groupRouter;
