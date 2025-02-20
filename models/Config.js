const mongoose = require("mongoose");

const configSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true }, // Tenant reference
  config: {
    accessTokenTTL: { type: Number, default: 15, required: true }, // Token expiry in minutes
    refreshTokenTTL: { type: Number, default: 1440, required: true }, // Refresh token expiry in minutes
    maxFailedLoginAttempts: { type: Number, default: 5, required: true }, // Lockout threshold
    googleLogin: { type: Boolean, default: false, required: true },
    microsoftLogin: { type: Boolean, default: false, required: true },
  },
  img: {
    loginLogoUrl: { type: String, default: "", required: true },
    bannerUrl: { type: String, default: "", required: true },
    dashboardLogoUrl: { type: String, default: "", required: true },
  }
}, { timestamps: true });


module.exports = mongoose.model("config", configSchema);
// token : {}
// theme : {loginPageURL, BannerURL, dashboardLogoURL}