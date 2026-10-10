function logger(req, res, next) {
  console.log('Middleware logger');
  next();
}
module.exports = logger;
