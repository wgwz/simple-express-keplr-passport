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

const newUsers = [
  {id: 1, username: 'kyle', password: 'password', address: 'regen1rn2mn8p0j3kqgglf7kpn8eshymgy5sm8w4wmj4'}
];

passport.serializeUser(function(userId, done) {
  // todo: it's possible that code in serialize/deserialize
  // should be wrapped in process.nextTick (there's references
  // to this in the passport.js docs, probably just performance
  // related).
  done(null, {userId: userId});
});
passport.deserializeUser(function(user, done) {
  const { userId } = user;
  for (const user of newUsers) {
    if (user.id === userId) {
      done(null, user);
    }
  }
});
passport.use(new LocalStrategy(
  function(username, password, done) {
    try {
      for (const user of newUsers) {
        if (user.username == username && user.password == password) {
          return done(null, user.id);
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
      for (const user of newUsers) {
        if (req.body.key.bech32Address === user.address) {
          console.log("REGEN ADDRESS USER MATCH");
          // todo: signature verification...
          return done(null, user.id);
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
    return res.send("You have been signed in via username/password!");
  }
)

app.use('/keplr-login',
  passport.authenticate('keplr'),
  (req, res) => {
    return res.send("You have been signed in via keplr!");
  }
)

app.post('/logout', function(req, res){
  req.logout();
  res.send('You have been logged out!');
})

app.get('/profile',
  (req, res) => {
    if (req.user) {
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
