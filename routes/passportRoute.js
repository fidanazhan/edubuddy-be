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

passportRoute.get("/logout", (req, res) => {
    req.logout();
    res.redirect("http://localhost:5173")
})

module.exports = passportRoute;