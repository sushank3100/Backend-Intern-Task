const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
const { check, validationResult } = require('express-validator');
const auth = require('../../middleware/auth');
const User = require('../../models/User');
const JobStatus = require('../../models/JobStatus');

// @route   POST api/users
// @desc    Register user
// @acess   Public
router.post(
  '/',
  [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('mobile', 'Please enter a  correct mobile number').isLength({
      min: 10,
      max: 10,
    }),
    check(
      'password',
      'Please enter a password with 6 or more characters'
    ).isLength({ min: 6 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, mobile, password } = req.body;

    try {
      // See if the user exists
      let user = await User.findOne({ email: email });

      if (user) {
        return res
          .status(400)
          .json({ errors: [{ msg: 'User already exists' }] });
      }
      user = new User({
        name,
        email,
        mobile,
        password,
      });

      // Encrypt password
      const salt = await bcrypt.genSalt(10);

      user.password = await bcrypt.hash(password, salt);

      // await user.save();
      await user.save((err, payload) => {
        if (err) {
          return res.status(400).json({
            message: 'Something Went Wrong...',
          });
        }
        const token = jwt.sign(
          { _id: payload._id, type: 'User' },
          config.get('jwtSecret'),
          {
            expiresIn: '3600000m',
          }
        );
        const { _id, name, email, mobile } = user;
        res.json({
          token,
          user: { _id, name, email, mobile },
          userType: 'User',
        });
      });
    } catch (err) {
      console.log(err.message);
      res.status(500).send('Server error');
    }
  }
);
// @route   GET api/users
// @desc    Get all users
// @acess   Public
router.get('/', (req, res) => {
  User.find({})
    .then((users) => res.send({ users }))
    .catch((err) => {
      console.log(err.message);
      res.sendStatus(400);
    });
});
// @route   GET api/users/:user_id
// @desc    Get a user by id
// @acess   Public
router.get('/:user_id', (req, res) => {
  const id = req.params.user_id;
  User.findById(id)
    .select('-password')
    .lean()
    .then((user) => res.json({ user }))
    .catch((err) => {
      console.log(err.message);
      return res.sendStatus(400);
    });
});
// @route   GET api/users/bypostJob/:postJob_id
// @desc    Get users by postJob by Id
// @acess   Public
router.get('/bypostJob/:postJob_id', async function (req, res) {
  const postJobId = req.params.postJob_id;
  let applications = await JobStatus.find({ postJobId });
  applications = applications.map((application) => application.userId);
  User.find({ _id: { $in: applications } })
    .select('-password')
    .lean()
    .then((users) => res.json({ users }))
    .catch((err) => {
      console.log(err.message);
      return res.sendStatus(400);
    });
});
// @route   GET api/users/byrecruiter/:recruiter_id
// @desc    Get users accepted by recruiter by recruiter's Id
// @acess   Public
router.get('/byrecruiter/:recruiter_id', async function (req, res) {
  try {
    const recruiterId = req.params.recruiter_id;
    let postJobs = await PostJob.find({ 'recruiter.id': recruiterId });
    const postJobIds = postJobs.map((postJob) => postJob.id);
    let applications = await JobStatus.find({
      postJobId: { $in: postJobIds },
    });
    applications = applications.filter(
      (application) => application.status === 'Accepted'
    );
    const acceptedIds = applications.map((application) => application.userId);
    let users = await User.find({ _id: { $in: acceptedIds } });
    users = users.map((user) => {
      let application = applications.find(
        (application) => application.userId == user.id
      );
      let postJob = postJobs.find((l) => l.id == application.postJobId);
      return {
        id: user.id,
        name: user.name,
        jobType: postJob.jobType,
        title: postJob.title,
        joiningDate: application.closeDate,
      };
    });
    return res.json({ users });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ msg: 'Internal error' });
  }
});

// @route   PUT api/users/:user_id
// @desc    Update user by Id
// @acess   Private
router.put('/:user_id', auth('User'), (req, res) => {
  const id = req.params.user_id;
  const { name, email, education, experience } = req.body;
  user
    .findById(id)
    .then((user) => {
      if (name) user.name = name;
      if (email) user.email = email;
      if (skills) user.skills = skills;
      if (education) user.education = education;
      if (experience) user.experience = experience;
      user.save().then((updatedUser) => {
        const { password, ...userToSend } = updatedUser.toObject();
        res.json({ user: userToSend });
      });
    })
    .catch((err) => {
      console.log(err);
      return res.status(404).json({ msg: 'Not found' });
    });
});
module.exports = router;
