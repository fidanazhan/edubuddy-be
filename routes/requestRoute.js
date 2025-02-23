const express = require('express');
const Request = require('../models/Request'); // Get Request model
const StorageRequest = require('../models/StorageRequest'); // Get StorageRequest model
const User = require('../models/User'); // Get Request model
const mongoose = require("mongoose");

const requestRoute = express.Router();

// BEGIN TOKEN

// Create a new Request
requestRoute.post('/token', async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { requester, amount, status, reason } = req.body;
        const newRequest = new Request({ tenantId, requester, amount, status, reason });
        const savedRequest = await newRequest.save();
        res.status(201).json(savedRequest);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Get all Requests
requestRoute.get('/token', async (req, res) => {
    try {
        const tenantId = req.tenantId
        const requests = await Request.find({ tenantId })
            .populate({ path: 'requester', select: 'name' })

        res.status(200).json(requests);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all Requests For Select Field
requestRoute.get('/token/status', async (req, res) => {
    // console.log("Fetching requests according to status")
    try {

        const tenantId = req.tenantId;
        const page = parseInt(req.query.page) || 1; // Default page 1
        const limit = parseInt(req.query.limit) || 10; // Default 5 data per page
        const skip = (page - 1) * limit;
        // console.log(req.query.page, req.query.limit, req.query.status)
        const status = req.query.status || 0;
        // console.log(status)
        const requests = await Request.find({ tenantId, status })
            .populate('requester', 'name email')
            .skip(skip)
            .limit(limit);

        // console.log(requests)
        const total = await Request.countDocuments({ tenantId, status })
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


// // Get a specific Request by ID
// requestRoute.get('/:id', async (req, res) => {
//     try {
//         const request = await Request.findById(req.params.id).populate('permissions tenantId');
//         if (!request) return res.status(404).json({ error: 'Request not found' });
//         res.status(200).json(request);
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// });

// Approve a Request by ID
requestRoute.put('/token/approve', async (req, res) => {
    // console.log("Approving requests")
    try {
        const requestData = req.body || {};
        // console.log(requestData);
        // console.log("User");
        const updatedUser = await User.findByIdAndUpdate(
            requestData.requester._id,
            { $inc: { totalToken: requestData.amount } },
            { new: true, runValidators: true }
        );
        // console.log("Updated User", updatedUser)
        // console.log("Request")
        const updatedRequest = await Request.findByIdAndUpdate(
            requestData._id,
            { $set: { status: 1 } },
            { new: true, runValidators: true }
        );
        // console.log("Updated Request", updatedRequest)
        if (!updatedRequest) return res.status(404).json({ error: 'Request not found' });
        res.status(200).json(updatedRequest);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Reject a Request by ID
requestRoute.put('/token/reject', async (req, res) => {
    // console.log("Rejecting requests")
    try {
        const requestData = req.body || {};
        // console.log(requestData);
        // console.log("Request");
        const updatedRequest = await Request.findByIdAndUpdate(
            requestData._id,
            { $set: { status: 2 } },
            { new: true, runValidators: true }
        );
        // console.log("Updated Request", updatedRequest)
        if (!updatedRequest) return res.status(404).json({ error: 'Request not found' });
        res.status(200).json(updatedRequest);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// END TOKEN
// BEGIN STORAGE

// Create a new StorageRequest
requestRoute.post('/storage', async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { requester, amount, status, reason } = req.body;
        const newStorageRequest = new StorageRequest({ tenantId, requester, amount, status, reason });
        const savedStorageRequest = await newStorageRequest.save();
        res.status(201).json(savedStorageRequest);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Get all StorageRequests
requestRoute.get('/storage', async (req, res) => {
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
requestRoute.get('/storage/status', async (req, res) => {
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

// Approve a StorageRequest by ID
requestRoute.put('/storage/approve', async (req, res) => {
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
requestRoute.put('/storage/reject', async (req, res) => {
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

// END STORAGE

module.exports = requestRoute;

// // Delete a Request by ID
// requestRoute.delete('/:id', async (req, res) => {
//     try {
//         const deletedRequest = await Request.findByIdAndDelete(req.params.id);
//         if (!deletedRequest) return res.status(404).json({ error: 'Request not found' });
//         res.status(200).json({ message: 'Request deleted successfully' });
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// });
