const mongoose = require('mongoose');
const autoIncrement = require('mongoose-sequence')(mongoose);
const Validator = require('validator');

const requestSchema = new mongoose.Schema(
  {
    order: Number,
    fromCity: {
      type: String,
      required: [true, 'From city is required'],
      maxlength: [100, 'City name must be less than 100 characters'],
      minlength: [2, 'City name must be more than 2 characters'],
    },
    toCity: {
      type: String,
      required: [true, 'To city is required'],
      maxlength: [100, 'City name must be less than 100 characters'],
      minlength: [2, 'City name must be more than 2 characters'],
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
    },

    email: {
      type: String,
      required: [true, 'Please provide email address'],
      lowercase: true,
      trim: true,
      validate: [Validator.isEmail, 'Please provide a valid email'],
    },

    weightKG: {
      type: Number,
      required: [true, 'Weight is required'],
    },

    goods: {
      type: String,
      required: [
        true,
        'Please enter what type of goods needs to be transported',
      ],
    },

    confirmed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);
requestSchema.plugin(autoIncrement, { id: 'request_seq', inc_field: 'order' });

const Request = mongoose.model('Request', requestSchema);
module.exports = Request;
