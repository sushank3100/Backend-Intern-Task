const express = require('express');
const router = express.Router();
const bycrypt = require('bcryptjs');
const auth = require('../../middleware/auth');
const jwt = require('jsonwebtoken');
const config = require('config');
const { check, validationResult } = require('express-validator');

const User = require('../../models/User');
const Recruiter = require('../../models/Recruiter');

// @route   POST api/auth/users
// @desc    Authenticate user & get token
// @acess   Public
router.post(
  '/users',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      // See if the user exists
      let user = await User.findOne({ email: email });

      if (!user) {
        return res
          .status(400)
          .json({ errors: [{ msg: 'Invalid Credentials' }] });
      }

      const isMatch = await bycrypt.compare(password, user.password);

      if (!isMatch) {
        return res
          .status(400)
          .json({ errors: [{ msg: 'Invalid Credentials' }] });
      }

      jwt.sign(
        { id: user.id, type: 'User' },
        config.get('jwtSecret'),
        { expiresIn: 3600000 },
        (err, token) => {
          if (err) throw err;
          res.json({ token, userType: 'User' });
        }
      );
    } catch (err) {
      console.log(err.message);
      res.status(500).send('Server error');
    }
  }
);
// @route   GET api/auth/users/:id
// @desc    Validate user's token
// @acess   Private
router.get('/users/:user_id', auth('User'), (req, res) => {
  const id = req.params.user_id;
  if (id === req.user.id) {
    return res.json({ loggedIn: true });
  }
  res.sendStatus(401);
});
// @route   POST api/auth/recruiters
// @desc    Authenticate recruiter & get token
// @acess   Public
router.post(
  '/recruiters',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      // See if the recruiter  exists
      let recruiter = await Recruiter.findOne({ email: email });

      if (!recruiter) {
        return res
          .status(400)
          .json({ errors: [{ msg: 'Invalid Credentials' }] });
      }

      const isMatch = await bycrypt.compare(password, recruiter.password);

      if (!isMatch) {
        return res
          .status(400)
          .json({ errors: [{ msg: 'Invalid Credentials' }] });
      }

      jwt.sign(
        { id: recruiter.id, type: 'Recruiter' },
        config.get('jwtSecret'),
        { expiresIn: 3600000 },
        (err, token) => {
          if (err) throw err;
          res.json({ token, userType: 'Recruiter' });
        }
      );
    } catch (err) {
      console.log(err.message);
      res.status(500).send('Server error');
    }
  }
);
// @route   GET api/auth/recruiters/:id
// @desc    Validate recruiter's token
// @acess   Private
router.get('/recruiters/:id', auth('Recruiter'), (req, res) => {
  const id = req.params.id;
  if (id === req.user.id) {
    return res.json({ loggedIn: true });
  }
  res.sendStatus(401);
});

module.exports = router;
