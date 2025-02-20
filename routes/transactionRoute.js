const express = require('express');
const transactionRouter = express.Router();
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const mongoose = require("mongoose");

// Create Transaction
transactionRouter.post('/', async (req, res) => {

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
transactionRouter.get('/', async (req, res) => {
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
        const tenantId = req.tenantId;
        // console.log(tenantId)
        // console.log(searchSenderQuery)
        // console.log(searchReceiverQuery)
        // const searchConditions = {
        //     tenantId,
        //     $and: [
        //         { 'sender.senderName': { $regex: searchSenderQuery, $options: 'i' } },
        //         { 'receiver.receiverName': { $regex: searchReceiverQuery, $options: 'i' } }
        //     ]
        // };
        // console.log("Fetching Transaction")
        // // Fetch paginated users with search conditions
        // const transactions = await Transaction.find(searchConditions, '-tenantId')
        //     .populate('sender', 'name')
        //     .populate('receiver', 'name')
        //     .skip(skip)
        //     .limit(limit);

        const searchConditions = {
            tenantId,
            $and: [
                { 'sender.senderName': { $regex: searchSenderQuery, $options: 'i' } },
                { 'receiver.receiverName': { $regex: searchReceiverQuery, $options: 'i' } }
            ]
        };
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

// Get All Transactions From Specific Tenant
transactionRouter.get('/getUsers', async (req, res) => {
    // console.log("Retrievint Sender Receiver")
    try {

        if (!req.tenantId) {
            return res.status(404).json({ error: 'Please include tenant on header' });
        }
        const tenantId = req.tenantId;
        const users = await User.find(
            { tenantId },
            { "name": 1, "email": 1 });
        // console.log("Sending User", users)
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// // // Get All Transactions From Specific Tenant
// // transactionRouter.get('/token', async (req, res) => {
// //     try {

// //         if (!req.tenantId) {
// //             return res.status(404).json({ error: 'Please include tenant on header' });
// //         }

// //         const page = parseInt(req.query.page) || 1; // Default page 1
// //         const limit = parseInt(req.query.limit) || 10; // Default 10 data per page
// //         const skip = (page - 1) * limit;

// //         const searchQuery = req.query.search || '';
// //         const tenantId = req.tenantId;

// //         const searchConditions = {
// //             tenantId,
// //             $or: [
// //                 { name: { $regex: searchQuery, $options: 'i' } },
// //                 { email: { $regex: searchQuery, $options: 'i' } }
// //             ]
// //         };

// //         // Fetch paginated users with search conditions
// //         const users = await Transaction.find(searchConditions, '-tenantId -createdAt -modifiedAt')
// //             .populate('role', 'name code permissions -_id')
// //             .skip(skip)
// //             .limit(limit);

// //         const total = await Transaction.countDocuments(searchConditions);

// //         res.json({
// //             total,
// //             page,
// //             pages: Math.ceil(total / limit),
// //             limit,
// //             data: users,
// //         });
// //     } catch (error) {
// //         res.status(500).json({ error: error.message });
// //     }
// // });





// // Get Transaction by ID
// transactionRouter.get('/:id', async (req, res) => {
//     try {
//         const user = await Transaction.findById(req.params.id);
//         if (!user) return res.status(404).json({ error: 'Transaction not found' });
//         res.json(user);
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// });

// // Update Transaction by ID
// transactionRouter.put('/:id', async (req, res) => {

//     const { name, email, role, status, groups } = req.body;

//     // const session = await mongoose.startSession();
//     // session.startTransaction();

//     try {

//         const tenantId = req.tenantId
//         const userId = req.params.id;

//         if (!tenantId) {
//             return res.status(404).json({ error: 'Please include tenant on header' });
//         }

//         const role = await Role.findOne({ code: req.body.role.toUpperCase(), tenantId: tenantId });
//         if (!role) {
//             return res.status(400).json({ error: 'Role not found for this tenant' });
//         }

//         const existingTransaction = await Transaction.findById(userId);
//         if (!existingTransaction) {
//             return res.status(404).json({ message: "Transaction not found" });
//         }

//         const groupsDB = await Group.find({ code: { $in: groups } });
//         if (groupsDB.length !== groups.length) {
//             return res.status(400).json({ message: 'One or more group codes are invalid.' });
//         }

//         // Fetch existing groups from GroupTransaction
//         // const existingGroupTransactionEntries = await GroupTransaction.find({ userId }).session(session);
//         const existingGroupTransactionEntries = await GroupTransaction.find({ userId });
//         const existingGroupIds = existingGroupTransactionEntries.map(g => g.groupId.toString());

//         const newGroupIds = groupsDB.map(g => g._id.toString());

//         // Find groups to add (new ones that don't exist)
//         const groupsToAdd = newGroupIds.filter(gid => !existingGroupIds.includes(gid));

//         const groupsToRemove = existingGroupIds.filter(gid => !newGroupIds.includes(gid));

//         // Add new GroupTransaction entries
//         if (groupsToAdd.length > 0) {
//             const groupTransactionEntries = groupsToAdd.map(groupId => ({ groupId, userId }));
//             // await GroupTransaction.insertMany(groupTransactionEntries, { session });
//             await GroupTransaction.insertMany(groupTransactionEntries);
//         }

//         // Remove GroupTransaction entries
//         if (groupsToRemove.length > 0) {
//             // await GroupTransaction.deleteMany({ groupId: { $in: groupsToRemove }, userId }).session(session);
//             await GroupTransaction.deleteMany({ groupId: { $in: groupsToRemove }, userId });
//         }

//         existingTransaction.name = req.body.name || existingTransaction.name;
//         existingTransaction.email = req.body.email || existingTransaction.email;
//         existingTransaction.role = role._id;
//         existingTransaction.status = req.body.status || existingTransaction.status;
//         existingTransaction.groups = newGroupIds;
//         await existingTransaction.save();

//         // await session.commitTransaction();
//         // session.endSession();

//         res.status(200).json({ message: 'Transaction updated successfully', user: existingTransaction });

//     } catch (error) {
//         // await session.abortTransaction();
//         // session.endSession();
//         res.status(400).json({ error: error.message });
//     }
// });

// // Delete Transaction by ID
// transactionRouter.delete('/:id', async (req, res) => {
//     try {
//         const deletedTransaction = await Transaction.findByIdAndDelete(req.params.id);
//         if (!deletedTransaction) return res.status(404).json({ error: 'Transaction not found' });
//         res.json({ message: 'Transaction deleted successfully' });
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// });

module.exports = transactionRouter;