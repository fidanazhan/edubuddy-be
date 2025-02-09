const rbacMiddleware = (requiredRoles) => {
    return (req, res, next) => {
        // Ensure the user and role are present
        if (!req.user || !req.user.role) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Check if the user's role is included in the required roles
        const hasRole = requiredRoles.includes(req.user.role);

        if (!hasRole) {
            return res.status(403).json({ message: 'Insufficient role' });
        }

        // Proceed to the next middleware or route handler
        next();
    };
};

module.exports = rbacMiddleware;
