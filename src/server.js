const mongoose = require('mongoose');
const app = require('./app');

const uri = process.env.MONGODB_URI || 'mongodb://localhost/vivesbib';
const port = process.env.PORT || 3000;

mongoose.connect(uri)
  .then(() => {
    console.log('Connected to MongoDB...');
    app.listen(port, () => console.log(`Listening on port ${port}...`));
  })
  .catch((err) => { console.error('Could not connect to MongoDB...', err.message); process.exit(1); });
