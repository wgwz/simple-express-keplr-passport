const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const cookieSession = require('cookie-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const cors = require('cors');

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

app.use(cookieSession({
  name: 'session',
  keys: ['supersecrets'],
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  sameSite: 'none',
  secure: false,
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(cors({
  origin: ['http://localhost:3001'], // frontend url
  credentials: true,
}));

const users = {
  kyle: 'password',
}

passport.serializeUser(function(username, done) {
  done(null, username);
});
passport.deserializeUser(function(username, done) {
  done(null, username);
});
passport.use(new LocalStrategy(
  function(username, password, done) {
    try {
      if (username in users) {
        if (users[username] == password) {
          return done(null, username);
        } else {
          return done(null, false);
        }
      } else {
        return done(null, false);
      }
    } catch (err) {
      return done(err);
    }
  },
))

app.use('/welcome', (req, res) => {
  return res.send("Please sign in at /login");
})

app.use('/login',
  passport.authenticate('local'),
  (req, res) => {
    return res.send("You have been signed in!");
  }
)

app.post('/logout', function(req, res){
  req.logout();
  res.send('You have been logged out!');
})

app.get('/profile',
  (req, res) => {
    if (req.user) {
      return res.send(`Hi, ${req.user}!`);
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
