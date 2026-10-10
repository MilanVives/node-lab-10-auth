const express = require('express');
const morgan = require('morgan');
const path = require('node:path');
const config = require('config');
const logger = require('./middleware/logger');
const home = require('./routes/home');
const genres = require('./routes/genres');
const customers = require('./routes/customers');

const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, '..', 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(logger);
if (app.get('env') === 'development') app.use(morgan('tiny'));

app.locals.appName = config.get('name');

app.use('/', home);
app.use('/api/genres', genres);
app.use('/api/customers', customers);

module.exports = app;
