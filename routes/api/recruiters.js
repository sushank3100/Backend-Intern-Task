const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
const { check, validationResult } = require('express-validator');
const auth = require('../../middleware/auth');

const Recruiter = require('../../models/Recruiter');
const PostJob = require('../../models/PostJob');

// @route   POST api/recruiters
// @desc    Register recruiter
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

    const { name, email, password, mobile, bio } = req.body;

    try {
      // See if the recruiter exists
      let recruiter = await Recruiter.findOne({ email: email });

      if (recruiter) {
        return res
          .status(400)
          .json({ errors: [{ msg: 'Recruiter already exists' }] });
      }
      recruiter = new Recruiter({
        name,
        email,
        password,
        mobile,
        bio,
      });

      // Encrypt password
      const salt = await bcrypt.genSalt(10);

      recruiter.password = await bcrypt.hash(password, salt);

      // await recruiter.save();
      await recruiter.save((err, payload) => {
        if (err) {
          return res.status(400).json({
            message: 'Something Went Wrong...',
          });
        }
        const token = jwt.sign({ _id: payload._id,type: "Recruiter"  }, config.get('jwtSecret'), {
          expiresIn: '3600000m',
        });
        const { _id, name, email, bio } = recruiter;
        res.json({
          token,
          recruiter: { _id, name, email, bio },
          userType: "Recruiter",
        });
      });
    } catch (err) {
      console.log(err.message);
      res.status(500).send('Server error');
    }
  }
);
// @route   GET api/recruiters/:recruiter_id
// @desc    Get a recruiter by Id
// @acess   Public
router.get('/:id', (req, res) => {
  const id = req.params.id;
  Recruiter.findById(id)
    .select('-password')
    .lean()
    .then((recruiter) => res.json({ recruiter }))
    .catch((err) => {
      console.log(err.message);
      return res.sendStatus(400);
    });
});
// @route   PUT api/recruiters/:recruiter_id
// @desc    Update a recruiter details by Id
// @acess   Private
router.put('/:recruiter_id', auth('Recruiter'), (req, res) => {
  const id = req.params.recruiter_id;
  const { name, email, mobile, bio } = req.body;
  Recruiter.findById(id)
    .then((recruiter) => {
      const updatePostJob =
        recruiter.name !== name || recruiter.email !== email;
      if (name) recruiter.name = name;
      if (email) recruiter.email = email;
      if (mobile) recruiter.mobile = mobile;
      if (bio || bio === '') recruiter.bio = bio;
      recruiter.save().then((updatedRecruiter) => {
        if (updatePostJob) {
          PostJob.updateMany(
            { 'recruiter.id': updatedRecruiter.id },
            {
              'recruiter.name': updatedRecruiter.name,
              'recruiter.email': updatedRecruiter.email,
            }
          ).then(() => {
            const { password, ...recruiterToSend } =
              updatedRecruiter.toObject();
            return res.json({ recruiter: recruiterToSend });
          });
        } else {
          const { password, ...recruiterToSend } = updatedRecruiter.toObject();
          res.json({ recruiter: recruiterToSend });
        }
      });
    })
    .catch((err) => {
      console.log(err.message);
      return res.status(404).json({ msg: 'Not found' });
    });
});

module.exports = router;
