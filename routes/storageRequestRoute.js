const express = require('express');
const StorageRequest = require('../models/StorageRequest'); // Get StorageRequest model
const User = require('../models/User'); // Get StorageRequest model
const mongoose = require("mongoose");

const storageRequestRoute = express.Router();

// Create a new StorageRequest
storageRequestRoute.post('/', async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { requester, amount, status } = req.body;
        const newStorageRequest = new StorageRequest({ tenantId, requester, amount, status });
        const savedStorageRequest = await newStorageRequest.save();
        res.status(201).json(savedStorageRequest);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Get all StorageRequests
storageRequestRoute.get('/', async (req, res) => {
    try {
        const tenantId = req.tenantId
        const requests = await StorageRequest.find({ tenantId })
            .populate({ path: 'requester', select: 'name' })

        res.status(200).json(requests);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all StorageRequests For status Field
storageRequestRoute.get('/status', async (req, res) => {
    // console.log("Fetching requests according to status")
    try {

        const tenantId = req.tenantId;
        const page = parseInt(req.query.page) || 1; // Default page 1
        const limit = parseInt(req.query.limit) || 10; // Default 5 data per page
        const skip = (page - 1) * limit;
        // console.log(req.query.page, req.query.limit, req.query.status)
        const status = req.query.status || 0;
        // console.log(status)
        const requests = await StorageRequest.find({ tenantId, status })
            .populate('requester', 'name email')
            .skip(skip)
            .limit(limit);

        // console.log(requests)
        const total = await StorageRequest.countDocuments({ tenantId, status })
        res.status(200).json({
            total,
            page,
            pages: Math.ceil(total / limit),
            limit,
            data: requests,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// // Get a specific StorageRequest by ID
// storageRequestRoute.get('/:id', async (req, res) => {
//     try {
//         const request = await StorageRequest.findById(req.params.id).populate('permissions tenantId');
//         if (!request) return res.status(404).json({ error: 'StorageRequest not found' });
//         res.status(200).json(request);
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// });

// Approve a StorageRequest by ID
storageRequestRoute.put('/approve', async (req, res) => {
    console.log("Approving requests")
    try {
        const requestData = req.body || {};
        // console.log(requestData);
        // console.log("User");
        const updatedUser = await User.findByIdAndUpdate(
            requestData.requester._id,
            { $inc: { totalStorage: requestData.amount } },
            { new: true, runValidators: true }
        );
        // console.log("Updated User", updatedUser)
        console.log("StorageRequest")
        const updatedStorageRequest = await StorageRequest.findByIdAndUpdate(
            requestData._id,
            { $set: { status: 1 } },
            { new: true, runValidators: true }
        );
        // console.log("Updated StorageRequest", updatedStorageRequest)
        if (!updatedStorageRequest) return res.status(404).json({ error: 'StorageRequest not found' });
        res.status(200).json(updatedStorageRequest);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Reject a StorageRequest by ID
storageRequestRoute.put('/reject', async (req, res) => {
    console.log("Rejecting requests")
    try {
        const requestData = req.body || {};
        // console.log(requestData);
        // console.log("StorageRequest");
        const updatedStorageRequest = await StorageRequest.findByIdAndUpdate(
            requestData._id,
            { $set: { status: 2 } },
            { new: true, runValidators: true }
        );
        // console.log("Updated StorageRequest", updatedStorageRequest)
        if (!updatedStorageRequest) return res.status(404).json({ error: 'StorageRequest not found' });
        res.status(200).json(updatedStorageRequest);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// // Delete a StorageRequest by ID
// storageRequestRoute.delete('/:id', async (req, res) => {
//     try {
//         const deletedStorageRequest = await StorageRequest.findByIdAndDelete(req.params.id);
//         if (!deletedStorageRequest) return res.status(404).json({ error: 'StorageRequest not found' });
//         res.status(200).json({ message: 'StorageRequest deleted successfully' });
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// });

module.exports = storageRequestRoute;
