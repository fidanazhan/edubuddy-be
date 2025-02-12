const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
require('dotenv').config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_OAUTH_CLIENT_ID,
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      callbackURL: "http://localhost:5000/api/auth/google/callback",
      scope: ["profile","email"]
    },
    (accessToken, refreshToken, profile, done) => {
      
      // Here, you process the user profile data
      const dataFromGoogle = {
        id: profile.id,
        displayName: profile.displayName,
        email: profile.emails[0].value,
        photo: profile.photos[0].value,
      };

      // Pass the user data to Passport's `done` function
      return done(null, dataFromGoogle);

      //return done(null, profile);
    }
  )
);
