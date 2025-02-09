const express = require('express');
const mongoose = require('mongoose');
const Group = require('../models/Group');
const Tenant = require('../models/Tenant');
const User = require('../models/User');

const router = express.Router();

/**
 * @route   POST /groups
 * @desc    Create a new group under a specific tenant
 */
router.post('/', async (req, res) => {
  const { name, description, createdBy } = req.body;

  try {

    const tenantId = req.tenantId
    if(!tenantId){
        return res.status(404).json({ error: 'Please include tenant on header' });
    }

    const userExists = await User.findById(createdBy);
    if (!userExists) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create group
    const newGroup = new Group({ name, description, createdBy: userExists, tenantId: tenantId });
    await newGroup.save();

    res.status(201).json({ message: 'Group created successfully', group: newGroup });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /groups
 * @desc    Get all groups for a specific tenant
 */
router.get('/tenant', async (req, res) => {

  try {
    
    const tenantId = req.tenantId
    if (!tenantId) {
      return res.status(404).json({ message: 'Please include tenant on the header' });
    }

    // Fetch groups under this tenant
    const groups = await Group.find({ tenantId });

    res.status(200).json(groups);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/tenant/select', async (req, res) => {

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

/**
 * @route   PUT /groups/:groupId
 * @desc    Update a group under the same tenant
 */
router.put('/:groupId', async (req, res) => {
  const { groupId } = req.params;
  const { name, description, tenantId } = req.body;

  try {
    // Ensure the group exists and belongs to the correct tenant
    const group = await Group.findOne({ _id: groupId, tenantId });

    if (!group) {
      return res.status(404).json({ message: 'Group not found or does not belong to the tenant' });
    }

    // Update group details
    group.name = name || group.name;
    group.description = description || group.description;
    await group.save();

    res.status(200).json({ message: 'Group updated successfully', group });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   DELETE /groups/:groupId
 * @desc    Delete a group under the same tenant
 */
router.delete('/:groupId', async (req, res) => {
  const { groupId } = req.params;
  const { tenantId } = req.body; // Ensure tenant ID is provided for security

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

module.exports = router;
