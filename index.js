const express = require('express');
const connectDB = require('./config/db');
const tenantIdentifier = require('./middleware/tenantIdentifier');
const tenantRoutes = require('./routes/tenantRoute');
const userRoute = require('./routes/userRoute');
const authMiddleware = require('./middleware/authMiddleware');
const authRoute = require('./routes/authRoute');
const roleRoute = require('./routes/roleRoute');
const groupRoute = require('./routes/groupRoute');
const permissionRoute = require('./routes/permissionRoute');
const passport = require("passport");
const passportRoute = require("./routes/passportRoute")
const chatRoute = require('./routes/chatRoute')
const fileRoute = require('./routes/fileRoute')
const configRoute = require('./routes/configRoute')
const modelConfigRoute = require('./routes/modelConfigRoute')
const transactionRoute = require('./routes/transactionRoute')
const session = require("express-session");
require("./middleware/passportMiddleware")

const cors = require('cors');

require('dotenv').config();

const app = express();
app.use(express.json());

let corsOptions = {
  origin: (origin, callback) => {
    if (!origin || origin.endsWith('.localhost:5173') || origin === 'http://localhost:5173') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true // Allow cookies if needed
};

app.use(cors(corsOptions));
app.use(tenantIdentifier); // Middleware for tenant identification

app.use(passport.initialize());
//app.use(passport.session());


// Tenant-specific routes
app.use('/api/tenant', tenantRoutes);
app.use('/api/user', userRoute);
app.use('/api/auth', authRoute);
app.use('/api/role', roleRoute);
app.use('/api/permission', permissionRoute)
app.use('/api', passportRoute)
app.use('/api/chat', chatRoute)
app.use('/api/group', groupRoute)
app.use('/api/file', fileRoute)
app.use('/api/config', configRoute)
app.use('/api/modelConfig', modelConfigRoute)
app.use('/api/transaction', transactionRoute)

// Start the server
const PORT = process.env.PORT;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
