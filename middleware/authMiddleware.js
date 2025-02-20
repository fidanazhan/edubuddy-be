const jwt = require('jsonwebtoken');
require('dotenv').config();

const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization');

    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token.split(' ')[1], process.env.JWT_SECRET);
        req.decodedJWT = decoded;
        next();
    } catch (err) {
        res.status(403).json({ message: 'Token is not valid' });
    }
};

module.exports = authMiddleware;
