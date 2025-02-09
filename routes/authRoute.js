
// ------------------------------------------ Auth Route ------------------------------------------
// Route for authentication. This route contains the API for login, create refresh token and logout.

const express = require('express');
const jwt = require('jsonwebtoken');
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const authRoute = express.Router();
require('dotenv').config();
require("../middleware/passportMiddleware") 
const User = require("../models/User")


// Dummy user data (replace with DB query in real-world scenario)
const users = [
    { id: 1, username: 'admin', password: 'password123', permissions: ['view_dashboard', 'manage_users'] },
    { id: 2, username: 'user', password: 'userpass', permissions: ['view_dashboard'] }
];

// googleData is user's data from google
const generateToken = (user, googleData) => {
    return jwt.sign(
        { 
            id: user.id, 
            name: googleData.displayName,
            email: user.email,
            photo: googleData.photo,
            role: user.role?.code,
            permissions: user.role?.permissions?.map(permission => permission.code) || []
        }, 
        process.env.JWT_SECRET, 
        { expiresIn: '1d' });
};

const generateRefreshToken = (user) => {
    return jwt.sign({ id: user.id }, process.env.REFRESH_SECRET, { expiresIn: '7d' });
};

// Refresh Token Route
authRoute.post('/refresh', (req, res) => {
    const { token } = req.body;
    if (!token || !refreshTokens.includes(token)) {
        return res.status(403).json({ message: 'Refresh token not valid' });
    }

    try {
        const decoded = jwt.verify(token, process.env.REFRESH_SECRET);
        const user = users.find(u => u.id === decoded.id);
        const newAccessToken = generateToken(user);

        res.json({ accessToken: newAccessToken });
    } catch (err) {
        return res.status(403).json({ message: 'Invalid refresh token' });
    }
});

authRoute.get('/google', (req, res, next) => {
    const subdomain = req.query.subdomain;
    const state = JSON.stringify({ subdomain });
    passport.authenticate('google', { scope: ['profile', 'email'], state: state })(req, res, next);
  });

authRoute.get(
    "/google/callback",
    passport.authenticate("google", {
        session: false,
        failureRedirect: "/login/failed"
    }),
    async (req, res) => {
        try {
            const userEmail = req.user.email;
            const user = await User.findOne({ email: userEmail })
                .populate({
                    path: 'role',
                    select: 'name code permissions', // Fetch role name, code, and permissions
                    populate: {
                        path: 'permissions',
                        select: 'name code' // Fetch only permission name and code
                    }
                });

                const { subdomain } = JSON.parse(req.query.state); // Parse the state to get the subdomain

            if (user) {
                const accessToken = generateToken(user, req.user);
                const refreshToken = generateRefreshToken(user);

                user.refreshToken = refreshToken;
                await user.save();

                const clientURL = `${process.env.HYPERTEXT_TRANSFER_PROTOCOL}${subdomain}.${process.env.CLIENT_URL}/login`;
                const redirectURL = `${clientURL}?accessToken=${accessToken}&refreshToken=${refreshToken}`;

                res.redirect(redirectURL);
            } 
            
            if (!user) {
                const clientURL = `${process.env.HYPERTEXT_TRANSFER_PROTOCOL}${subdomain}.${process.env.CLIENT_URL}/login`;
                const redirectURL = `${clientURL}?error=User does not exist`;
            
                return res.redirect(redirectURL);
            }
            
        } catch (error) {
            console.error("Error during Google callback:", error);
            res.status(500).send("Internal Server Error");
        }
    }
);

// Logout Route (Optional, to invalidate refresh tokens)
// authRoute.post('/logout', (req, res) => {
//     const { token } = req.body;
//     refreshTokens = refreshTokens.filter(t => t !== token);
//     res.json({ message: 'Logged out successfully' });
// });

module.exports = authRoute;
