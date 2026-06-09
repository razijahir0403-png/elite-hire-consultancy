const mongoose = require('mongoose');
const softDeletePlugin = require('./plugins/softDeletePlugin');

const installmentSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
      min: [0, 'Installment amount must be positive'],
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    recordedBy: {
      type: String,
      required: true,
    },
    recordedOn: {
      type: Date,
      default: Date.now,
    },
    remarks: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: true }
);

const paymentInfoSchema = new mongoose.Schema(
  {
    paymentId: {
      type: String,
      required: [true, 'Please provide a payment ID'],
      unique: true,
      trim: true,
    },
    clientId: {
      type: String,
      required: [true, 'Please provide a client ID'],
      trim: true,
    },
    clientName: {
      type: String,
      required: [true, 'Please provide a client name'],
      trim: true,
    },
    totalAmount: {
      type: Number,
      required: [true, 'Please provide the total amount'],
      min: [0, 'Total amount must be positive'],
    },
    installments: [installmentSchema],
    createdBy: {
      type: String,
      required: true,
    },
    updatedBy: {
      type: String,
      required: true,
    },
    updatedOn: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'payments',
  }
);

paymentInfoSchema.plugin(softDeletePlugin);

module.exports = mongoose.model('PaymentInfo', paymentInfoSchema);
