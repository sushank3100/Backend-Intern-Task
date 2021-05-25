const express = require('express');
const router = express.Router();
const PostJob = require('../../models/PostJob');
const auth = require('../../middleware/auth');
// @route   POST api/postjob
// @desc    Create postJob by recruiter
// @acess   Private
router.post('/', auth('recruiter'), (req, res) => {
  const {
    title,
    company,
    location,
    jobType,
    ctc,
    maxApps,
    maxPost,
    applyBy,
    skills,
    recruiter,
  } = req.body;

  if (
    !title ||
    !company ||
    !location ||
    !jobType ||
    !ctc ||
    !maxApps ||
    !maxPost ||
    !applyBy ||
    !skills ||
    !recruiter
  ) {
    return res
      .status(400)
      .json({
        msg: "This title company, location, jobType, ctc, maxApps, maxPost, applyBy and skills and recruiter's (name&email) fields are required",
      });
  }
  const newPostJob = new PostJob({
    title,
    company,
    location,
    jobType,
    ctc,
    maxApps,
    maxPost,
    applyBy,
    skills,
    recruiter: {
      id: recruiter._id,
      name: recruiter.name,
      email: recruiter.email,
    },
  });
  newPostJob
    .save()
    .then((postJob) => res.json(postJob))
    .catch((err) => res.status(500).json({ msg: err }));
});

// @route   GET api/postjob
// @desc    Get all Jobs
// @acess   Public
router.get('/', async (req, res) => {
  try {
    const postJob = await PostJob.find().populate('recruiter', ['name']);
    res.json(postJob);
  } catch (err) {
    console.log(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/postjob/:job_id
// @desc    Get current recruiter's postJobs
// @acess   Private
router.get('/:job_id', (req, res) => {
  const id = req.params.job_id;
  PostJob.findById(id)
    .lean()
    .then((postJob) => res.json({ postJob }))
    .catch((err) => {
      console.log(err.message);
      return res.sendStatus(400);
    });
});

// @route   GET api/postJob/byrecruiter/:recruiter_id
// @desc    Get all postJob by recruiter Id
// @acess   Public
router.get('/byrecruiter/:recruiter_id', (req, res) => {
  const recruiterId = req.params.recruiter_id;
  PostJob.find({ 'recruiter.id': recruiterId })
    .lean()
    .then((postJobs) => res.json({ postJobs }))
    .catch((err) => {
      console.log(err.message);
      return res.sendStatus(400);
    });
});
// @route   POST api/postjob/
// @desc    Update postJob by recruiter
// @acess   Private
router.put('/:job_id', auth('Recruiter'), (req, res) => {
  const id = req.params.job_id;
  const { maxApps, maxPost, applyBy } = req.body;
  const errors = [];
  PostJob.findById(id)
    .then((postJob) => {
      if (maxApps) {
        if (maxApps < postJob.numApps)
          errors.push(`Already more applications than ${maxApps}`);
        else postJob.maxApps = maxApps;
      }
      if (maxPost) {
        if (maxPost < postJob.numAccepted)
          errors.push(`Already more acceptances than ${maxPost}`);
        else postJob.maxPost = maxPost;
      }
      if (applyBy) {
        if (applyBy < Date.now())
          errors.push('Deadline date cannot be in the past');
        else postJob.applyBy = applyBy;
      }
      if (errors.length != 0) return res.status(400).json({ errors });
      else {
        postJob
          .save()
          .then((newPostJob) => res.json({ newPostJob }))
          .catch((err) => res.status(500).json({ msg: 'Internal error' }));
      }
    })
    .catch((err) => {
      console.log(err.message);
      return res.status(404).json({ msg: 'Not found' });
    });
});
// @route   DELETE api/postJob/:postJob_id
// @desc    Delete a posted job
// @acess   Private
router.delete('/:postJob_id', auth('Recruiter'), async (req, res) => {
  try {
    const id = req.params.postJob_id;
    let postJob = await PostJob.findByIdAndUpdate(id, { deleted: true });
    await JobStatus.updateMany(
      { postJobId: postJob.id },
      { status: 'Deleted', closeDate: Date.now() }
    );
    res.json({ postJob });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ msg: 'Internal error' });
  }
});
module.exports = router;
