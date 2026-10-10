# Lab 10: Authentication and Authorization

Add users, login with JSON Web Tokens, and protect the Vivesbib API with authentication and an admin role.

This lab continues where Lab 08 ended: the starter contains a working version of that lab. The packages `bcrypt`, `jsonwebtoken` and `lodash` are already in `package.json`.

## Getting started

```bash
npm install
npm test
```

`npm test` runs the same checks as the autograder, against a temporary in-memory MongoDB. Run a single requirement with `npm test -- --test-name-pattern="^R1:"`.

The private key for signing tokens never goes in a file. Add `"jwtPrivateKey": ""` to `config/default.json` and map it in `config/custom-environment-variables.json` to the environment variable `vivesbib_jwtPrivateKey`. Before `npm run dev`:

```bash
export vivesbib_jwtPrivateKey=mySecureKey        # macOS / Linux
$Env:vivesbib_jwtPrivateKey = 'mySecureKey'      # PowerShell
```

In `src/server.js`, stop with an error when `config.get('jwtPrivateKey')` is empty.

## Requirements

### R1: POST /api/users registers a user
**2 points**

Create `src/models/user.js` with the `User` model: `name` (5 to 50 characters), `email` (5 to 255, `unique: true`), `password` (5 to 1024), `isAdmin` (Boolean). Add the method `user.generateAuthToken()` that returns `jwt.sign({ _id: this._id, isAdmin: this.isAdmin }, config.get('jwtPrivateKey'))`. Export `{ User, validate }` (Joi: `name` 5 to 50, `email` 5 to 255 and `.email()`, `password` 5 to 255).

Create `src/routes/users.js` on `/api/users`. `POST /` validates (400), refuses an email that already exists with 400 `User already registered.`, hashes the password with `bcrypt` (salt rounds 10), saves the user and sends back only `_id`, `name` and `email` (`_.pick`) with the token in the response header `x-auth-token`.

### R2: POST /api/auth logs a user in
**2 points**

Create `src/routes/auth.js` on `/api/auth`. `POST /` validates `email` and `password` (400), finds the user and compares the password with `bcrypt.compare`. When the email is unknown or the password is wrong, respond 400 `Invalid email or password.` Otherwise send the token: `res.send(user.generateAuthToken())`.

### R3: The auth middleware protects changes to genres
**2 points**

Create `src/middleware/auth.js`: read the token from the header `x-auth-token`. No token: 401 `Access denied. No token provided.` Invalid token: 400 `Invalid token.` Valid: put the decoded payload in `req.user` and call `next()`. Use it on `POST`, `PUT` and `DELETE` in `src/routes/genres.js`.

### R4: GET /api/users/me returns the current user
**2 points**

`GET /api/users/me` (protected with `auth`) returns the logged-in user without the password: `User.findById(req.user._id).select('-password')`.

### R5: Only admins can delete genres
**2 points**

Create `src/middleware/admin.js`: when `req.user.isAdmin` is not true, respond 403 `Access denied.`. Protect `DELETE /api/genres/:id` with `[auth, admin]`. Protect `/api/customers` the same way (`auth` on POST and PUT, `[auth, admin]` on DELETE): an API on the internet must never let anonymous visitors change data. Make a user admin by setting `isAdmin: true` in MongoDB Compass.

## Submitting

Commit your work and run `npm run submit`. Your score and feedback appear under **Releases** after a few minutes. You can submit as often as you like; the latest submission counts.
