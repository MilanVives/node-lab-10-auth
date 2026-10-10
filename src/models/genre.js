const mongoose = require('mongoose');
const Joi = require('joi');

const Genre = mongoose.model('Genre', new mongoose.Schema({
  name: { type: String, required: true, minlength: 5, maxlength: 50 },
}));

function validateGenre(genre) {
  return Joi.object({ name: Joi.string().min(5).max(50).required() }).validate(genre);
}

module.exports = { Genre, validate: validateGenre };
