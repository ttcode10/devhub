const express = require('express');
const router = express.Router();
const gravatar = require('gravatar');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
const { check, validationResult } = require('express-validator');

const User = require('./../../models/User');

// @route   POST api/user
// @desc    Regiser user
// @access  Public

router.post('/', [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please enter a valid email').isEmail(),
    check('password', 'Please enter password with 6 or more characters').isLength({min: 6})
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
      return res.status(400).json({errors: errors.array()});
    }

    const { name, email, password } = req.body;

    try {
      // See if user exists
      let user = await User.findOne({email});

      if(user) {
        return res.status(400).json({ errors: [{message: 'User already exixts'}]});
      }

      // Get user gravatar
      const avatar = gravatar.url(email, {
        s: '200',
        r: 'g',
        d: 'mm'
      })

      user = new User({
        name,
        email,
        password,
        avatar
      });

      // Encrypt password
      const salt = await bcrypt.genSalt(10);

      user.password = await bcrypt.hash(password, salt);

      await user.save();

      // Return jsonwebtoken
      const payload = {
        user: {
          id: user.id
        }
      }

      jwt.sign(
        payload,
        config.get('jwtSecret'),
        {expiresIn: 360000},
        (err, token) => {
          if (err) throw err;
          res.json({token});
        }
      );

    } catch (error) {
      console.log(error.message);
      res.status(500).send('Server error');
    }

  }
);

module.exports = router;


