const mongoose = require('mongoose');
const autoIncrement = require('mongoose-sequence')(mongoose);

const { Schema } = mongoose;

const loadSchema = new Schema(
  {
    // Generate random unique number
    order: Number,
    name: {
      type: String,
      required: [true, 'A Load must have a name'],
      maxlength: [30, 'A load name must have less or equal then 50 characters'],
      minlength: [3, 'A load name must have more or equal then 5 characters'],
    },
    to: {
      type: String,
      required: [true, 'Please enter city name where loads are being sent'],
    },
    from: {
      type: String,
      required: [true, 'Please enter city name from where you are sending'],
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      default: 'Pending',
      enum: {
        values: ['Pending', 'In Progress', 'Completed'],
        message: 'Load status accepts only: Pending, In Progress, Completed',
      },
    },
    clientName: {
      type: String,
      required: true,
      maxlength: [
        20,
        'A client name must have less or equal then 50 characters',
      ],
      minlength: [3, 'A client name must have more or equal then 3 characters'],
    },

    freight: {
      type: String,
    },
    profit: {
      type: String,
    },
    dispatcher: {
      type: Object,
    },
    typeOfTransportation: {
      type: String,
      default: 'Truck',
      enum: {
        values: ['Truck', 'Ship', 'Air', 'Railway'],
        message: 'Load status accepts only: Truck, Ship, Air, Railway',
      },
    },
    totalBalance: {
      type: Number,
      default: 0,
    },
    documents: [
      {
        _id: {
          type: String,
        },
        filename: { type: String },
        fileLink: { type: String },
        s3_key: { type: String },
      },
    ],
  },
  { timestamps: true }
);

loadSchema.plugin(autoIncrement, { id: 'order_seq', inc_field: 'order' });

const Load = mongoose.model('Load', loadSchema);

module.exports = Load;
