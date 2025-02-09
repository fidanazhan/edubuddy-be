const rbacMiddleware = (requiredPermissions) => {
    return (req, res, next) => {
        if (!req.user || !req.user.permissions) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const hasPermission = requiredPermissions.some(permission => req.user.permissions.includes(permission));

        if (!hasPermission) {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }
        
        next();
    };
};

module.exports = rbacMiddleware;