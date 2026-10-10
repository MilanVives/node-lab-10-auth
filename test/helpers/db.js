const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongo;
let connecting;

function connect() {
  connecting = (async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
  })();
  return connecting;
}

async function clear() {
  for (const collection of Object.values(mongoose.connection.collections)) await collection.deleteMany({});
}

async function disconnect() {
  // When --test-name-pattern filters out every test in a file, node:test runs the
  // root after() without waiting for an async before(): wait for connect() first.
  if (connecting) await connecting.catch(() => {});
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
}

module.exports = { connect, clear, disconnect };
