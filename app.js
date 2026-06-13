if (process.env.NODE_ENV !== "production") {
  require('dotenv').config();
}

const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const ejsMate = require('ejs-mate');
const session = require('express-session');
const flash = require('connect-flash');
const Joi = require('joi')
const methodOverride = require('method-override');
const ExpressError = require('./utils/ExpressError');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const User = require('./models/user');
const mongoSanitize = require('express-mongo-sanitize');
const helmet = require('helmet');

const userRoutes = require('./routes/users')
const campgroundsRouters = require('./routes/campground');
const reviewsRoutes = require('./routes/review');
const { MongoStore } = require('connect-mongo');
const dbUrl = process.env.DB_URL || 'mongodb://localhost:27017/yelp-camp';

mongoose.connect(dbUrl)
.then(() => {
        console.log("MONGO CONNECTION OPEN")
    })
    .catch((err) => {
        console.log("OH NO MONGO ERROR");
        console.log(err);
    });

const app = express();
app.set('trust proxy', 1);
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'))

// To parse the submitted url
app.use(express.urlencoded({ extended: true }))
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(mongoSanitize());

const secret = process.env.SESSION_SECRET || 'thisshouldbeabettersecret!';

const store = MongoStore.create({
  mongoUrl: dbUrl,
  touchAfter: 24 * 60 * 60,
  crypto: {
    secret
  }
})

store.on('error', function (e) {
  console.log("SESSION STORE ERROR", e)
})

const sessionConfig = {
  store,
  name: 'session',
  secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}
app.use(session(sessionConfig));
app.use(flash());
app.use(helmet());

const scriptSrcUrls = [
    "https://stackpath.bootstrapcdn.com/",
    "https://kit.fontawesome.com/",
    "https://cdnjs.cloudflare.com/",
    "https://cdn.jsdelivr.net",
    "https://cdn.maptiler.com/"
];

const styleSrcUrls = [
    "https://kit-free.fontawesome.com/",
    "https://stackpath.bootstrapcdn.com/",
    "https://fonts.googleapis.com/",
    "https://use.fontawesome.com/",
    "https://cdn.jsdelivr.net",
    "https://cdn.maptiler.com/",
];

const connectSrcUrls = [
    "https://cdn.maptiler.com",
    "https://cdn.jsdelivr.net",
    "https://api.maptiler.com/"
];

const fontSrcUrls = [
  "https://cdn.jsdelivr.net"
]

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: [],
      connectSrc: ["'self'", ...connectSrcUrls],
      scriptSrc: ["'unsafe-inline'","'self'", ...scriptSrcUrls],
      styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
      workerSrc: ["'self'", "blob:"],
      objectSrc: [],
      imgSrc: [
        "'self'",
        "blob:", 
        "data:", 
        "https://res.cloudinary.com/drmn6q5ob/",
        "https://images.unsplash.com/",
        "https://api.maptiler.com/",
      ],
      fontSrc: ["'self'", ...fontSrcUrls],
    },
  })
);


app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
  res.locals.success = req.flash('success')
  res.locals.error = req.flash('error')
  res.locals.currUser = req.user;
  next();
})

app.get('/fakeuser', async (req, res) => {
  const user = new User({ email: 'cool@gmail.com', username: 'cool'})
  const newUser = await User.register(user, 'chicken')
  res.send(newUser);
})

app.use('/', userRoutes)
app.use('/campgrounds', campgroundsRouters)
app.use('/campgrounds/:id/reviews', reviewsRoutes)

app.get('/', (req, res) => {
  res.render('home')
})

app.all('/{*path}', (req, res, next) => {
  next(new ExpressError('Page not found', 404))
})

app.use((err, req, res, next) => {
  const {status = 500, message = 'Something went wrong'} = err;
  if (!err.message) err.message = 'Oh no, something went wrong'
  res.status(status).render('error', {err})
})

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Serving on port ${port}`)
})