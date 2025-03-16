const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const MicrosoftStrategy = require("passport-microsoft").Strategy;
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

// Microsoft OAuth Strategy
passport.use(
  new MicrosoftStrategy(
    {
      clientID: process.env.MICROSOFT_OAUTH_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_OAUTH_CLIENT_SECRET,
      callbackURL: "http://localhost:5000/api/auth/microsoft/callback",
      scope: ["openid", "email", "profile"],
      resource: "https://graph.microsoft.com"  // This is critical for fetching the profile
    },
    (accessToken, refreshToken, profile, done) => {
      // If passport-microsoft successfully fetched the profile, use it
      if (profile && profile.id) {
        const dataFromMicrosoft = {
          id: profile.id,
          displayName: profile.displayName,
          email: profile.emails?.[0]?.value || profile.username,
          photo: profile.photos?.[0]?.value || "",
        };
        return done(null, dataFromMicrosoft);
      }

      // If the profile is not automatically provided, manually fetch it using Microsoft Graph API.
      const request = require("request");
      request.get(
        {
          url: "https://graph.microsoft.com/v1.0/me",
          headers: { Authorization: `Bearer ${accessToken}` },
          json: true,
        },
        (err, response, body) => {
          if (err) return done(err);
          if (response.statusCode !== 200) {
            return done(new Error("Failed to fetch user profile"));
          }
          const fetchedProfile = {
            id: body.id,
            displayName: body.displayName,
            emails: [{ value: body.mail || body.userPrincipalName }],
          };
          return done(null, fetchedProfile);
        }
      );
    }
  )
);



// passport.serializeUser((user, done) => {
//   done(null, user);
// });

// passport.deserializeUser((obj, done) => {
//   done(null, obj);
// });

module.exports = passport;
