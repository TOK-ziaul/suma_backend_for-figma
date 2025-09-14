const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  product: {
    name: { type: String, required: true },
    description: String,
    type: { type: String, enum: ['game_access', 'premium_subscription'], required: true }
  },
  paymentMethod: {
    type: String,
    enum: ['stripe', 'paypal', 'apple_pay', 'google_pay'],
    required: true
  },
  paymentDetails: {
    paymentIntentId: String,
    chargeId: String,
    receiptUrl: String
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    deviceInfo: String
  },
  refund: {
    refunded: { type: Boolean, default: false },
    refundId: String,
    refundAmount: Number,
    refundDate: Date,
    reason: String
  }
}, {
  timestamps: true
});

// Method to process refund
purchaseSchema.methods.processRefund = function(refundAmount, reason) {
  this.refund.refunded = true;
  this.refund.refundAmount = refundAmount || this.amount;
  this.refund.refundDate = new Date();
  this.refund.reason = reason;
  this.status = 'refunded';
  
  return this.save();
};

module.exports = mongoose.model('Purchase', purchaseSchema);