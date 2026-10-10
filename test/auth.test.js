process.env.vivesbib_jwtPrivateKey = process.env.vivesbib_jwtPrivateKey || 'test-private-key';
const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const request = require('supertest');
const db = require('./helpers/db');
const app = require('../src/app');

before(db.connect);
after(db.disconnect);
beforeEach(db.clear);
const KEY = process.env.vivesbib_jwtPrivateKey;

function userModel() {
  assert.ok(fs.existsSync('src/models/user.js'), 'Create src/models/user.js that exports { User, validate }');
  return require('../src/models/user').User;
}
const register = (body = {}) => request(app).post('/api/users').send({ name: 'Ada Lovelace', email: 'ada@example.com', password: 'secret123', ...body });
const tokenFor = (isAdmin = false) => new (userModel())({ name: 'Test User', email: 't@example.com', password: 'x', isAdmin }).generateAuthToken();

describe('R1: POST /api/users registers a user', () => {
  it('returns the user without password and a token header', async () => {
    const res = await register();
    assert.equal(res.status, 200, 'POST /api/users should respond with 200');
    assert.deepEqual(Object.keys(res.body).sort(), ['_id', 'email', 'name'], 'Only send _id, name and email back (use _.pick)');
    assert.ok(res.headers['x-auth-token'], 'The token should be in the x-auth-token response header');
  });
  it('stores a bcrypt hash, not the password', async () => {
    await register();
    const user = await userModel().findOne({ email: 'ada@example.com' });
    assert.ok(user, 'The user should be saved in MongoDB');
    assert.notEqual(user.password, 'secret123', 'Never store the plain password');
    assert.ok(await bcrypt.compare('secret123', user.password), 'The stored password should be a bcrypt hash of the password');
  });
  it('refuses a duplicate email and invalid input', async () => {
    await register();
    assert.equal((await register()).status, 400, 'Registering the same email twice should give 400 "User already registered."');
    assert.equal((await register({ email: 'x' })).status, 400, 'An invalid email should give 400');
  });
});

describe('R2: POST /api/auth logs a user in', () => {
  it('returns a valid token for correct credentials', async () => {
    const { body } = await register();
    const res = await request(app).post('/api/auth').send({ email: 'ada@example.com', password: 'secret123' });
    assert.equal(res.status, 200, 'POST /api/auth with correct credentials should respond with 200');
    let payload;
    assert.doesNotThrow(() => { payload = jwt.verify(res.text, KEY); }, 'POST /api/auth should send the token (res.send(token)) signed with config.get("jwtPrivateKey")');
    assert.equal(payload._id, body._id, 'The token payload should contain the user _id');
  });
  it('refuses a wrong password or unknown email with 400', async () => {
    await register();
    assert.equal((await request(app).post('/api/auth').send({ email: 'ada@example.com', password: 'wrongpass' })).status, 400, 'A wrong password should give 400');
    assert.equal((await request(app).post('/api/auth').send({ email: 'nobody@example.com', password: 'secret123' })).status, 400, 'An unknown email should give 400');
  });
});

describe('R3: The auth middleware protects changes to genres', () => {
  it('responds 401 without a token and 400 with an invalid token', async () => {
    const res = await request(app).post('/api/genres').send({ name: 'Comedy' });
    assert.equal(res.status, 401, 'POST /api/genres without x-auth-token should give 401');
    assert.equal(res.text, 'Access denied. No token provided.');
    const bad = await request(app).post('/api/genres').set('x-auth-token', 'garbage').send({ name: 'Comedy' });
    assert.equal(bad.status, 400, 'An invalid token should give 400 "Invalid token."');
  });
  it('lets a logged-in user create a genre', async () => {
    const token = tokenFor();
    const res = await request(app).post('/api/genres').set('x-auth-token', token).send({ name: 'Comedy' });
    assert.ok([200, 201].includes(res.status), `With a valid token POST /api/genres should succeed, got ${res.status}`);
  });
});

describe('R4: GET /api/users/me returns the current user', () => {
  it('returns the user without password', async () => {
    const reg = await register();
    const res = await request(app).get('/api/users/me').set('x-auth-token', reg.headers['x-auth-token'] || '');
    assert.equal(res.status, 200, 'GET /api/users/me with a valid token should respond with 200');
    assert.equal(res.body.email, 'ada@example.com');
    assert.equal(res.body.password, undefined, 'Do not send the password back (select("-password"))');
  });
  it('requires a token', async () => {
    assert.equal((await request(app).get('/api/users/me')).status, 401, 'GET /api/users/me without a token should give 401');
  });
});

describe('R5: Only admins can delete genres', () => {
  it('forbids normal users and allows admins', async () => {
    // Create tokens before request(app): supertest starts a server immediately, and a
    // throw between request() and the request being sent would leave it open.
    const userToken = tokenFor(false);
    const adminToken = tokenFor(true);
    const created = await request(app).post('/api/genres').set('x-auth-token', userToken).send({ name: 'Western' });
    const id = created.body._id || new mongoose.Types.ObjectId();
    const user = await request(app).delete(`/api/genres/${id}`).set('x-auth-token', userToken);
    assert.equal(user.status, 403, 'DELETE /api/genres/:id by a non-admin should give 403');
    const admin = await request(app).delete(`/api/genres/${id}`).set('x-auth-token', adminToken);
    assert.equal(admin.status, 200, 'DELETE /api/genres/:id by an admin should succeed');
  });
});
