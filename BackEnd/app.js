require('dotenv').config(); 
const createError = require('http-errors');
const express = require('express');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const mongoose = require('mongoose');
const connectDB = require('./Config/Db');
const multer  = require('multer');
const path    = require('path');
const cors = require('cors');
const indexRouter = require('./routes/index');
const usersRouter = require('./routes/userRoutes');
const authRoutes = require('./routes/AuthRoutes');
const ContractRoutes = require('./routes/contractRoutes');
const subscriptionRoutes = require("./routes/subscriptionRoutes"); 
const BuildingRoutes = require("./routes/buidingRoutes"); 
const ApartmentRoutes = require("./routes/apartmentRoutes"); 
const passport = require('passport');
const paassaportSetup = require('./Config/Oauth'); 
 const bodyParser = require('body-parser');
const chatingRoutes = require('./routes/ChattingRoute.js');
const imageRoutes = require ("./routes/imageRoutes")
const delegateRoutes = require('./routes/delegateRoutes');
const eventRoutes = require('./routes/eventRoutes');
const claimsRoutes = require('./routes/claimsRoutes');
const taskRoutes = require('./routes/taskRoutes');
const InvoiceRouter = require('./routes/InvoiceRoute');
const cron = require('node-cron');
const { checkAndExpireContracts } = require('./Controllers/contractController.js');
const RecurringInvoice = require('./Models/ScheduledInvoices.js');
const { scheduleRecurringInvoice } = require('./Controllers/InvoiceController.js');
 const crmRoutes = require('./routes/crmRoutes');
 const contactRoutes= require('./routes/contactRoutes');
const notificationRoutes = require('./routes/notificationRoute.js');
const documentRoutes = require('./routes/documentRoutes.js'); 
require('./Utils/CronJobs'); 
const { protect } = require('./Middlewares/AuthMiddleware.js');
const poll = require('./Models/poll.js');
const gamificationRoutes = require('./routes/gamificationRoute.js');
const pollRoutes = require('./routes/pollRoutes.js');
const { initScheduledTasks } = require('./Utils/CronJobs.js');
const { scheduleEventReminders } = require('./Controllers/EventController.js');
const { scheduleSubscriptionExpirationNotifications } = require('./Controllers/SubscriptionController');
const assistantConfigRoutes = require('./routes/assistantConfigRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const uploadRoutes = require('./routes/uploadRoutes.js');

const session = require('express-session');
const MongoStore = require('connect-mongo'); 
const app = express(); 

// Allow CORS preflight explicitly and allow our custom headers
app.all('*', (req, res, next) => {
  // If you want to allow many dev origins, you can overwrite Origin per request instead of "*"
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
  res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type, Authorization, x-recaptcha-token, x-temp-token");
  // Optional: allow credentials if you're using cookies/sessions
  // res.header("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});



connectDB();

const PORT = process.env.PORT || 3000;



app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: true }));

app.use(logger('dev'));
app.use(express.json()); 
app.use(express.urlencoded({ extended: false })); 
app.use(cookieParser());

const isProduction = process.env.NODE_ENV === 'production';
//alow
const allowedOrigins = isProduction
  ? ['https://nestleo.com', 'https://www.nestleo.com']
  : ['http://localhost:3000'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (Postman / native apps)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-recaptcha-token', 'x-temp-token', 'X-Requested-With'],
  credentials: true
}));


app.use('/api/upload', uploadRoutes);
// Serve static files from /uploads without authentication
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/public', express.static(path.join(__dirname, 'public')));

app.use('/api/documents', documentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chats', chatingRoutes); 
app.use('/api/tasks', taskRoutes);
app.use("/api/claims",claimsRoutes);
app.use('/api/tasks', taskRoutes);
app.use("/api/claims",claimsRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/Contracts", ContractRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/delegate",delegateRoutes);
app.use("/api/Building", BuildingRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/invoices',InvoiceRouter);
app.use('/api/polls', pollRoutes);
app.use('/api/review', reviewRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/assistant-config', assistantConfigRoutes);
app.use("/api/", ApartmentRoutes);
app.use("/image", imageRoutes);
app.use('/auth', authRoutes); 
app.use('/users', usersRouter); 

app.use('/', indexRouter); 
//hello

  app.use(session({
    secret: process.env.SESSION_SECRET || 'changeme',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      client: mongoose.connection.getClient(), // uses the connected client
      collectionName: 'sessions'
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
      secure: process.env.NODE_ENV === 'production'
    }
  }));

app.use(passport.initialize());
app.use(passport.session());

// Add these middleware before your routes
app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true })); 

const initRecurringInvoices = async () => {
  try {
    const activeRecurringInvoices = await RecurringInvoice.find({ active: true });
    activeRecurringInvoices.forEach(invoice => {
      // Pass the proper recurring invoice id (as a string or ObjectId)
      console.log(`Scheduling recurring invoice with ID: ${invoice._id}`);
      scheduleRecurringInvoice(invoice._id.toString());
    });
  } catch (err) {
    console.error('Error initializing recurring invoice schedules:', err);
  }
};

initRecurringInvoices();
initScheduledTasks();
scheduleEventReminders();
scheduleSubscriptionExpirationNotifications();

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'jade');  // Or 'pug'

// Catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// Error handler
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});


module.exports = app;
