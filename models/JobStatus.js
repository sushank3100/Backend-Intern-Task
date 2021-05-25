const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const JobStatusSchema = new Schema({
  postJobId: {
    type: Schema.Types.ObjectId,
    ref: 'PostJob',
    required: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    required: true,
    default: 'Applied',
  },
  appDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  closeDate: {
    type: Date,
    default: () => Date.now() + 2 * 365 * 24 * 3600 * 1000,
  },
  sop: { type: String, default: '' },
});

module.exports = JobStatus = mongoose.model('JobStatus', JobStatusSchema);
