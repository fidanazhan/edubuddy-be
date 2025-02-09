const passportRoute = require("express").Router();
const passport = require("passport");

passportRoute.get("/login/success", (req, res) => {
    if(req.user){
        res.status(200).json({
            error: false,
            message: "Successfully log in",
            user: req.user
        })
    }else{
        res.status(403).json({error: true, message: "Not authorized"})
    }
})

passportRoute.get("/login/failed", (req, res) => {
    res.status(401).json({error: true, message: "Log in failure"})
})

// passportRoute.get(
//     "/google/callback",
//     passport.authenticate("google", {
//         session: false,
//         failureRedirect: "/login/failed"
//     }),
//     (req, res) => {
//         // Successful authentication
//         console.log("Authenticated User:", req.user); // This is the user object from Google
//         res.redirect(process.env.CLIENT_URL); // Redirect to your client
//     }
// );

// passportRoute.get("/google", passport.authenticate("google", ["profile", "email"]));

passportRoute.get("/logout", (req, res) => {
    req.logout();
    res.redirect("http://localhost:5173")
})

module.exports = passportRoute;