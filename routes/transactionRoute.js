const express = require('express');
const transactionRouter = express.Router();
const Transaction = require('../models/Transaction');
const StorageTransaction = require('../models/StorageTransaction');
const User = require('../models/User');
const mongoose = require("mongoose");

// BEGIN TOKEN

// Create Transaction
transactionRouter.post('/token', async (req, res) => {

    // const { sender, receiver, amount, senderBefore, receiverBefore, senderAfter, receiverAfter } = req.body;
    try {

        const tenantId = req.tenantId
        if (!tenantId) {
            return res.status(404).json({ error: 'Please include tenant on header' });
        }

        // Create the user with the role
        const transaction = new Transaction({
            ...req.body,
            tenantId: tenantId,
        });

        const savedTransaction = await transaction.save();

        res.status(201).json(savedTransaction);
    } catch (error) {

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

// Get All Transactions From Specific Tenant
transactionRouter.get('/token', async (req, res) => {
    // console.log("Retrieving Transactions")
    try {

        if (!req.tenantId) {
            return res.status(404).json({ error: 'Please include tenant on header' });
        }

        const page = parseInt(req.query.page) || 1; // Default page 1
        const limit = parseInt(req.query.limit) || 10; // Default 5 data per page
        const skip = (page - 1) * limit;
        // console.log(page, limit, skip)
        const searchSenderQuery = req.query.searchSender || '';
        const searchReceiverQuery = req.query.searchReceiver || '';
        const searchStartDate = req.query.startDate ? new Date(req.query.startDate) : undefined;
        if (searchStartDate) {
            searchStartDate.setHours(0, 0, 0, 0);
        }
        const searchEndDate = req.query.endDate ? new Date(req.query.endDate) : undefined;
        if (searchEndDate) {
            searchEndDate.setHours(23, 59, 59, 999);
        }
        // console.log(searchStartDate, searchEndDate)
        const tenantId = req.tenantId;

        const searchConditions = {
            tenantId,
            $and: [
                searchSenderQuery ? { 'sender.senderName': { $regex: searchSenderQuery, $options: 'i' } } : {},
                searchReceiverQuery ? { 'receiver.receiverName': { $regex: searchReceiverQuery, $options: 'i' } } : {},
                searchStartDate ? { 'createdAt': { $gte: searchStartDate, $lte: searchEndDate } } : {}
            ]
        };
        // console.log(searchConditions)
        // console.log("Fetching Transaction")
        // Fetch paginated users with search conditions
        const transactions = await Transaction.find(searchConditions, '-tenantId')
            .populate('sender', 'name')
            .populate('receiver', 'name')
            .skip(skip)
            .limit(limit);

        const total = await Transaction.countDocuments(searchConditions);
        // console.log("Sending Transactions")
        res.json({
            total,
            page,
            pages: Math.ceil(total / limit),
            limit,
            data: transactions,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// END TOKEN
// BEGIN STORAGE

// Create Transaction
transactionRouter.post('/storage', async (req, res) => {
    // const { sender, receiver, amount, senderBefore, receiverBefore, senderAfter, receiverAfter } = req.body;
    try {

        const tenantId = req.tenantId
        if (!tenantId) {
            return res.status(404).json({ error: 'Please include tenant on header' });
        }

        // Create the user with the role
        const newStorageTransaction = new StorageTransaction({
            ...req.body,
            tenantId: tenantId,
        });

        const savedTransaction = await newStorageTransaction.save();

        res.status(201).json(savedTransaction);
    } catch (error) {

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

// Get All Transactions From Specific Tenant
transactionRouter.get('/storage', async (req, res) => {
    // console.log("Retrieving Transactions")
    try {

        if (!req.tenantId) {
            return res.status(404).json({ error: 'Please include tenant on header' });
        }

        const page = parseInt(req.query.page) || 1; // Default page 1
        const limit = parseInt(req.query.limit) || 10; // Default 5 data per page
        const skip = (page - 1) * limit;
        // console.log(page, limit, skip)
        const searchSenderQuery = req.query.searchSender || '';
        const searchReceiverQuery = req.query.searchReceiver || '';
        const searchStartDate = req.query.startDate ? new Date(req.query.startDate) : undefined;
        if (searchStartDate) {
            searchStartDate.setHours(0, 0, 0, 0);
        }
        const searchEndDate = req.query.endDate ? new Date(req.query.endDate) : undefined;
        if (searchEndDate) {
            searchEndDate.setHours(23, 59, 59, 999);
        }
        // console.log(searchStartDate, searchEndDate)
        const tenantId = req.tenantId;

        const searchConditions = {
            tenantId,
            $and: [
                searchSenderQuery ? { 'sender.senderName': { $regex: searchSenderQuery, $options: 'i' } } : {},
                searchReceiverQuery ? { 'receiver.receiverName': { $regex: searchReceiverQuery, $options: 'i' } } : {},
                searchStartDate ? { 'createdAt': { $gte: searchStartDate, $lte: searchEndDate } } : {}
            ]
        };
        // console.log("Fetching Transaction")
        // Fetch paginated users with search conditions
        const transactions = await StorageTransaction.find(searchConditions, '-tenantId')
            .populate('sender', 'name')
            .populate('receiver', 'name')
            .skip(skip)
            .limit(limit);

        const total = await StorageTransaction.countDocuments(searchConditions);
        // console.log("Sending Transactions")
        res.json({
            total,
            page,
            pages: Math.ceil(total / limit),
            limit,
            data: transactions,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// END STORAGE

module.exports = transactionRouter;
