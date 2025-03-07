// ------------------------ Tenant Management ------------------------
// This one is for handling tenant by superadmin. 

const express = require('express');
const tenantRouter = express.Router();
const Tenant = require('../models/Tenant');
const authMiddleware = require("../middleware/authMiddleware")
const rbacMiddleware = require("../middleware/rbacMiddleware")
const Config = require('../models/Config')

tenantRouter.post('/', async (req, res) => {
  try {

    req.body.subdomain = req.body.subdomain.toLowerCase(); // Make the subdomain as lower case before save into db

    const existedSubdomain = await Tenant.findOne({ subdomain: req.body.subdomain });
    if (existedSubdomain) {
      return res.status(401).json({ error: 'This subdomain already exist' });
    }

    const tenant = new Tenant(req.body);
    const savedTenant = await tenant.save();
    res.status(201).json(savedTenant);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get All Tenants
tenantRouter.get('/', authMiddleware, rbacMiddleware(['manage_tenant', 'view_tenant']), async (req, res) => {
  try {
    const tenants = await Tenant.find();
    res.json(tenants);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Tenant by ID
tenantRouter.get('/:id', authMiddleware, rbacMiddleware(['manage_tenant', 'view_tenant']), async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    res.json(tenant);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Tenant by subdomain
tenantRouter.get('/exist', authMiddleware, rbacMiddleware(['manage_tenant', 'view_tenant']), async (req, res) => {
  try {
    const { subdomain } = req.query;
    // if (!subdomain) {
    //   return res.status(400).json({ error: 'Subdomain is required' });
    // }
    const tenant = await Tenant.findOne({ subdomain });
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    const config = await Config.findOne({ tenantId: tenant._id })
    res.status(200).json({ tenant, config });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Tenant by ID
tenantRouter.put('/:id', authMiddleware, rbacMiddleware(['manage_tenant']), async (req, res) => {
  try {
    const updatedTenant = await Tenant.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedTenant) return res.status(404).json({ error: 'Tenant not found' });
    res.json(updatedTenant);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete Tenant by ID
tenantRouter.delete('/:id', authMiddleware, rbacMiddleware(['manage_tenant']), async (req, res) => {
  try {
    const deletedTenant = await Tenant.findByIdAndDelete(req.params.id);
    if (!deletedTenant) return res.status(404).json({ error: 'Tenant not found' });
    res.json({ message: 'Tenant deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = tenantRouter;
