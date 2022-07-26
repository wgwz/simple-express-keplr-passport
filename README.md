# Express, React, Passport and Keplr PoC
This is a proof-of-concept that lays out the basic interactions between
these systems. This code follows work done in [commonwealth][1]. This repos
goal is to see the bare minimum to achieve a keplr login, and specifically
to explore how to use [passport.js][2] to do so.

# Running the PoC
- `(cd frontend && yarn start)`
- `(cd backend && yarn start)`
- Visit [localhost:3001](localhost:3000)
- Modify `users` in `backend/app.js` if you want to test username/password
  auth.
- Note: You must have the [Keplr] browser extension and have created a Keplr
  wallet to test the login with Keplr functionality.

# Primary code

1. `backend/app.js`
2. `frontend/src/App.tsx`

[1]: https://github.com/hicommonwealth/commonwealth/
[2]: http://www.passportjs.org/
[3]: https://www.keplr.app/
