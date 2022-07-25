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
const amino = require("@cosmjs/amino");
const crypto = require("@cosmjs/crypto");
const { Buffer } = require('node:buffer');
const { verifyADR36Amino } = require('@keplr-wallet/cosmos');

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

const genNonce = () => {
  const bytes = crypto.Random.getBytes(128);
  const hex = Buffer.from(bytes).toString('hex');
  return hex;
}

const users = [
  {id: 1, username: 'kyle', password: 'password', address: 'regen1rn2mn8p0j3kqgglf7kpn8eshymgy5sm8w4wmj4', nonce: genNonce()}
];
const fetchUserById = (userId) => {
  for (const user of users) {
    if (user.id === userId) {
      return { id: user.id, username: user.username, address: user.address, nonce: user.nonce } ;
    }
  }
}
const fetchUserByAddress = (userAddress) => {
  for (const user of users) {
    if (user.address === userAddress) {
      return { id: user.id, username: user.username, address: user.address, nonce: user.nonce } ;
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
  async function (req, done) {
    const { signature } = req.body;
    const address = amino.pubkeyToAddress(signature.pub_key, "regen");
    try {
      for (const user of users) {
        // assume 1-1 map between a given user and an address.
        if (address === user.address) {
          const { pubkey: decodedPubKey, signature: decodedSignature } = amino.decodeSignature(signature);
          const data = JSON.stringify({
            title: 'Regen Network Login',
            description: 'This is a transaction that allows Regen Network to authenticate you with our application.',
            nonce: user.nonce
          });
          // generate a new nonce for the user to invalidate the current
          // signature...
          user.nonce = genNonce();
          // https://github.com/chainapsis/keplr-wallet/blob/master/packages/cosmos/src/adr-36/amino.ts
          const verified = verifyADR36Amino("regen", address, data, decodedPubKey, decodedSignature);
          if (verified) {
            return done(null, fetchUserById(user.id));
          } else {
            return done(null, false);
          }
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

app.get('/nonce', (req, res, next) => {
  // this endpoint fetches a nonce for a given user by their wallet
  // address. this is a piece of public information so it is ok to
  // have this public.
  //
  // note that is PoC does not include a way of adding new users, but
  // if you do want to add new users you can manually add to the users
  // list and restart the express app.
  if (!req.query.userAddress) {
    const msg = "Invalid or missing userAddress query parameter";
    console.error(msg);
    const err = new Error(msg);
    err.status = 400;
    next(err);
  } else {
    const userInfo = fetchUserByAddress(req.query.userAddress);
    if (!userInfo) {
      const msg = "User not found for the given address";
      console.error(msg);
      const err = new Error(msg);
      err.status = 404;
      next(err);
    } else {
      return res.status(200).send({ nonce: userInfo.nonce }); 
    }
  }
})

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
