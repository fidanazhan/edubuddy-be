const Tenant = require('../models/Tenant');

const tenantIdentifier = async (req, res, next) => {
  try {
    
    const subdomain = req.headers['x-tenant'];

    // if(!subdomain){
    //   return res.status(404).json({ error: 'Please include tenant on the header.' });
    // }

    // If no subdomain is provided, assume superadmin
    if (!subdomain) {
      req.tenantId = null;
      req.tenantInfo = { role: 'superadmin' };
      return next();
    }

    const tenant = await Tenant.findOne({ subdomain: subdomain.toLowerCase() });
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found.' });
    }

    req.tenantId = tenant._id; 
    req.tenantCode = tenant.code; 
    // req.tenantInfo = tenant; // return tenant object
    // console.log("Req TenantId: " + req.tenantId)   

    next();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = tenantIdentifier;
