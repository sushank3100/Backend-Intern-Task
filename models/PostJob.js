const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PostJobSchema = new Schema({
  recruiter: {
    id: {
      type: Schema.Types.ObjectId,
      ref: 'recruiter',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
  },
  title: {
    type: String,
    required: true,
  },
  company: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  jobType: {
    type: String,
    required: true,
  },
  ctc: {
    type: Number,
    required: true,
  },
  maxApps: {
    type: Number,
    required: true,
  },
  maxPost: {
    type: Number,
    required: true,
  },
  applyBy: {
    type: Date,
    required: true,
  },
  skills: {
    type: [String],
    required: true,
  },
  numApps: {
    type: Number,
    required: true,
    default: 0,
  },
  numAccepted: {
    type: Number,
    required: true,
    default: 0,
  },
  postingDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  duration: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
    max: 6,
  },
  deleted: {
    type: Boolean,
    default: false,
  },
});

module.exports = PostJob = mongoose.model('postJob', PostJobSchema);
