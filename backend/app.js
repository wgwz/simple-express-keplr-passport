const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const cookieSession = require('cookie-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const cors = require('cors');
const passportCustom = require('passport-custom');
const CustomStrategy = passportCustom.Strategy;

const app = express();

// required for sessions to work behind proxys
app.set('trust proxy', 1);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// this cookie session uses an http-only cookie, which
// means that it cannot be accessed from JS.
app.use(cookieSession({
  name: 'session',
  keys: ['supersecrets'],
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  sameSite: 'lax',
  secure: false,
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(cors({
  origin: ['http://localhost:3001'], // frontend url
  credentials: true,
}));

const users = [
  {id: 1, username: 'kyle', password: 'password', address: 'regen1rn2mn8p0j3kqgglf7kpn8eshymgy5sm8w4wmj4'}
];
const fetchUserById = (userId) => {
  for (const user of users) {
    if (user.id === userId) {
      return { id: user.id, username: user.username, address: user.address } ;
    }
  }
}

passport.serializeUser(function(user, done) {
  // todo: it's possible that code in serialize/deserialize
  // should be wrapped in process.nextTick (there's references
  // to this in the passport.js docs, probably just performance
  // related).
  // 
  // serialize is about what will end up in the http-only session
  // cookie in terms of user data. very important to not include
  // private information here.
  done(null, { userId: user.id });
});

passport.deserializeUser(function(user, done) {
  // deserialize is about what ends up in req.user when the session
  // cookie gets parsed. private info should be carefully handled
  // here, as it could potentially expose that info if this is being
  // used in a response.
  const { userId } = user;
  done(null, fetchUserById(userId));
});

passport.use(new LocalStrategy(
  function(username, password, done) {
    try {
      for (const user of users) {
        if (user.username == username && user.password == password) {
          return done(null, fetchUserById(user.id));
        }
      }
    } catch (err) {
      return done(err);
    }
    return done(null, false);
  },
))

passport.use("keplr", new CustomStrategy(
  function (req, done) {
    try {
      for (const user of users) {
        if (req.body.key.bech32Address === user.address) {
          // note: i'm assuming 1-1 address-user correspondance for now..
          // todo: signature verification...
          return done(null, fetchUserById(user.id));
        }
      }
    } catch (err) {
      return done(err);
    }
    return done(null, false);
  }
));

app.use('/login',
  passport.authenticate('local'),
  (req, res) => {
    return res.send({
      user: req.user,
      message: "You have been signed in via username/password!"
    });
  }
)

app.use('/keplr-login',
  passport.authenticate('keplr'),
  (req, res) => {
    return res.send({
      user: req.user,
      message: "You have been signed in via keplr!"
    });
  }
)

app.post('/logout', function(req, res){
  req.logout();
  res.send('You have been logged out!');
})

app.get('/profile',
  (req, res) => {
    if (req.user) {
      // this is just a dummy api endpoint that illustrates
      // how we can pull the users info out of `req.user` which
      // can subsequently be used for fetching data for this user.
      return res.send(`Hi, ${req.user.username}!`);
    } else {
      return res.status(401).send("Sorry, you haven't signed in yet..");
    }
  }
)

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
