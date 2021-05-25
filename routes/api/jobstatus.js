const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const JobStatus = require('../../models/JobStatus');
const User = require('../../models/User');
const PostJob = require('../../models/PostJob');

const statuses = ['Applied', 'Shortlisted', 'Rejected', 'Accepted'];

// @route   POST api/jobstatus
// @desc    Create a Job Application
// @acess   Private
router.post('/', auth('User'), async function (req, res) {
  const { postJobId, userId, sop } = req.body;
  if (!sop) return res.status(400).json({ msg: 'Please enter SOP' });

  const user = await User.findById(userId);
  const postJob = await PostJob.findById(postJobId);
  if (!user || !postJob) return res.sendStatus(400);

  const userApplications = await JobStatus.find({ userId });
  let numActive = 0;
  for (let application of userApplications) {
    if (application.status === 'Accepted')
      return res
        .status(400)
        .json({ msg: "Can't apply when already accepted into a job" });
    if (application.status !== 'Deleted' || application.status !== 'Rejected')
      numActive += 1;
  }
  if (numActive >= 10)
    return res.status(400).json({ msg: "Can't apply to more than 10 jobs" });

  if (postJob.applyBy < Date.now())
    return res.status(400).json({ msg: 'Deadline passed' });

  const application = await JobStatus.findOne({ postJobId, userId });
  if (application) return res.status(400).json({ msg: 'Already applied' });

  if (postJob.numApps >= postJob.maxApps)
    return res.status(400).json({ msg: 'Maximum applications reached' });

  const newApplication = new JobStatus({ postJobId, userId, sop });
  newApplication
    .save()
    .then((application) => {
      PostJob.findByIdAndUpdate(postJobId, { $inc: { numApps: 1 } })
        .then(() => res.json({ application }))
        .catch((err) => res.status(500).json({ msg: 'Internal error' }));
    })
    .catch((err) => res.status(500).json({ msg: 'Internal error' }));
});

// @route   GET api/jobstatus/byuser/:userid
// @desc    Get applications by user
// @acess   Public
router.get('/byuser/:userid', (req, res) => {
  const userId = req.params.userid;
  JobStatus.find({ userId: userId })
    .lean()
    .then((applications) => res.json({ applications }))
    .catch((err) => {
      return res.sendStatus(400);
    });
});
// @route   GET api/jobstatus/byuser/:userid/:postJob_id
// @desc    Get applications by user
// @acess   Public
router.get('/byuser/:user_id/:postJob_id', (req, res) => {
  const userId = req.params.user_id;
  const postJobId = req.params.postJob_id;
  JobStatus.find({ userId: userId, postJobId: postJobId })
    .lean()
    .then((application) => res.json({ application }))
    .catch((err) => {
      return res.sendStatus(400);
    });
});
// @route   DELETE api/jobstatus/byuser/:userid/:postJob_id
// @desc    DELETE a job application by userid and jobid
// @acess   Private
router.delete('/byuser/:user_id/:postJob_id', auth('User'), (req, res) => {
  const userId = req.params.user_id;
  const postJobId = req.params.postJob_id;
  JobStatus.findOneAndDelete({ userId: userId, postJobId: postJobId })
    .lean()
    .then((application) => res.json('This application has been deleted'))
    .catch((err) => {
      return res.sendStatus(400);
    });
});

// @route   GET api/jobstatus/bypostJob/:postJob_id
// @desc    Get applications by postJob
// @acess   Public
router.get('/bypostJob/:postJob_id', (req, res) => {
  const postJobId = req.params.postJob_id;
  JobStatus.find({ postJobId: postJobId })
    .lean()
    .then((applications) => res.json({ applications }))
    .catch((err) => {
      return res.sendStatus(400);
    });
});

// @route   GET api/jobstatus/byrecruiter/:recruiter_id
// @desc    Get applications by recruiter
// @acess   Public
router.get('/byrecruiter/:recruiter_id', async function (req, res) {
  try {
    const recruiterId = req.params.recruiter_id;
    let postJobs = await PostJob.find({ 'recruiter.id': recruiterId });
    postJobs = postJobs.map((postJob) => postJob.id);
    let applications = await JobStatus.find({ postJobId: { $in: postJobs } });
    return res.json({ applications });
  } catch {
    return res.status(500).json({ msg: 'Internal error' });
  }
});

// @route   PUT api/jobstatus/:jobStatus_id
// @desc    Update the application
// @acess   Public
router.put('/:jobStatus_id', auth('Recruiter'), async function (req, res) {
  const id = req.params.jobStatus_id;
  const { status } = req.body;

  if (!statuses.includes(status)) return res.sendStatus(400);

  const application = await JobStatus.findById(id);
  if (!application) return res.sendStatus(400);
  if (application.closeDate < Date.now())
    return res.status(400).json({ msg: 'Application already closed' });

  if (status === 'Accepted') {
    const postJob = await PostJob.findById(application.postJobId);
    if (postJob.numAccepted >= postJob.maxPost)
      return res.status(400).json({ msg: 'Job full application closed' });

    if (postJob.numAccepted + 1 >= postJob.maxPost) {
      await JobStatus.updateMany(
        {
          postJobId: application.postJobId,
          status: { $ne: 'Accepted' },
          _id: { $ne: id },
        },
        { status: 'Rejected', closeDate: Date.now() }
      );
    }
    await JobStatus.updateMany(
      { userId: application.userId, _id: { $ne: id } },
      { status: 'Rejected', closeDate: Date.now() }
    );
    postJob.numAccepted += 1;
    await postJob.save();
  }
  application.status = status;
  if (status === 'Accepted' || status === 'Rejected')
    application.closeDate = Date.now();
  const updatedApplication = await application.save();
  res.json({ application: updatedApplication });
});

module.exports = router;
