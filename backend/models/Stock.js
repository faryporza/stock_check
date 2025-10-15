const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  name: {
    type: String,
    default: ''
  },
  supportLevels: [{
    type: Number,
    required: true
  }],
  lastPrice: {
    type: Number,
    default: 0
  },
  distanceToNearestSupport: {
    type: Number,
    default: 0
  },
  distancePercent: {
    type: Number,
    default: 0
  },
  nearestSupport: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index สำหรับการค้นหาและเรียงลำดับ
stockSchema.index({ symbol: 1 }, { unique: true });
stockSchema.index({ distanceToNearestSupport: 1 });
stockSchema.index({ distancePercent: 1 });

module.exports = mongoose.model('Stock', stockSchema);
