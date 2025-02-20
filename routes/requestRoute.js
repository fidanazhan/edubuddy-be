const express = require('express');
const Request = require('../models/Request'); // Get Request model
const User = require('../models/User'); // Get Request model
const mongoose = require("mongoose");

const requestRoute = express.Router();

// Create a new Request
requestRoute.post('/', async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { requester, amount, status } = req.body;
        const newRequest = new Request({ tenantId, requester, amount, status });
        const savedRequest = await newRequest.save();
        res.status(201).json(savedRequest);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Get all Requests
requestRoute.get('/', async (req, res) => {
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
requestRoute.get('/status', async (req, res) => {
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
requestRoute.put('/approve', async (req, res) => {
    console.log("Approving requests")
    try {
        const requestData = req.body || {};
        console.log(requestData);
        console.log("User");
        const updatedUser = await User.findByIdAndUpdate(
            requestData.requester._id,
            { $inc: { totalToken: requestData.amount } },
            { new: true, runValidators: true }
        );
        console.log("Updated User", updatedUser)
        console.log("Request")
        const updatedRequest = await Request.findByIdAndUpdate(
            requestData._id,
            { $set: { status: 1 } },
            { new: true, runValidators: true }
        );
        console.log("Updated Request", updatedRequest)
        if (!updatedRequest) return res.status(404).json({ error: 'Request not found' });
        res.status(200).json(updatedRequest);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Reject a Request by ID
requestRoute.put('/reject', async (req, res) => {
    console.log("Rejecting requests")
    try {
        const requestData = req.body || {};
        console.log(requestData);
        console.log("Request");
        const updatedRequest = await Request.findByIdAndUpdate(
            requestData._id,
            { $set: { status: 2 } },
            { new: true, runValidators: true }
        );
        console.log("Updated Request", updatedRequest)
        if (!updatedRequest) return res.status(404).json({ error: 'Request not found' });
        res.status(200).json(updatedRequest);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

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

module.exports = requestRoute;
