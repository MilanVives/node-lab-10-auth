const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('index', { title: req.app.locals.appName, message: 'Welcome to Vivesbib' });
});

module.exports = router;
