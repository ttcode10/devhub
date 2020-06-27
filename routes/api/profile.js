const express = require('express');
const router = express.Router();
const Profile = require('./../../models/Profile');
const User = require('./../../models/User');
const auth = require('./../../middleware/auth');
const { check, validationResult } = require('express-validator');
const { route } = require('./users');
const request = require('request');
const config = require('config');


// @route   GET api/profile/me
// @desc    Get current user profile
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({user: req.user.id}).populate('user', ['name', 'avatar']);
    if(!profile) {
      return res.status(400).json({message: 'There is no profile for this user'});
    } res.status(200).json(profile);
  } catch (error) {
    console.log(error.message);
    return res.status(500).send('Server error');
  }
});



// @route   POST api/profile
// @desc    Create or update current user profile
// @access  Private
router.post('/',
  [
    auth,
    [
      check('status').not().isEmpty().withMessage('Status is required'),
      check('skills').not().isEmpty().withMessage('Skills are required')
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
      return res.status(400).json({errors: errors.array()});
    }
    const {
      company,
      location,
      website,
      bio,
      skills,
      status,
      githubusername,
      youtube,
      twitter,
      instagram,
      linkedin,
      facebook
    } = req.body;

    const profileFields = {};
    profileFields.user = req.user.id;
    if (company) profileFields.company = company;
    if (location) profileFields.location = location;
    if (website) profileFields.website = website;
    if (bio) profileFields.bio = bio;
    if (status) profileFields.status = status;
    if (githubusername) profileFields.githubusername = githubusername;
    if (skills) {
      profileFields.skills = skills.split(',').map(skill => skill.trim());
    }
    profileFields.social = {};
    if (youtube) profileFields.social.youtube = youtube;
    if (twitter) profileFields.social.twitter = twitter;
    if (instagram) profileFields.social.instagram = instagram;
    if (linkedin) profileFields.social.linkedin = linkedin;
    if (facebook) profileFields.social.facebook = facebook;

    try {
      // See if profile exists
      let profile = await Profile.findOne({user: req.user.id});

      if(profile) {
        // Update profile if exists
        await Profile.findOneAndUpdate(
          {user: req.user.id},
          {$set: profileFields},
          {new: true}
        );
        return res.json(profile);
      }
      // Create profile if not exists
      profile = new Profile(profileFields);
      await profile.save();
      return res.json(profile);

    } catch (error) {
      console.log(error.message);
      return res.status(500).send('Server error');
    }
  }
);

// @route   GET api/profile
// @desc    Get all profiles
// @access  Public
router.get('/', async (req, res) => {
  try {
    const profiles = await Profile.find().populate('user', ['name', 'avatar']);
    return res.json(profiles);
  } catch (error) {
    console.log(error.message);
    return res.status(500).send('Server error');
  }
});

// @route   GET api/profile/user/:user_id
// @desc    Get profile by user ID
// @access  Public
router.get('/user/:user_id', async (req, res) => {
  try {
    const profile = await Profile.findOne({user: req.params.user_id}).populate('user', ['name', 'avatar']);
    if(!profile) {
      return res.status(400).json({message: 'Profile not found'});
    }
    return res.json(profile);
  } catch (error) {
    console.log(error.message);
    if(error.kind == 'ObjectId') {
      return res.status(400).json({message: 'Profile not found'});
    }
    return res.status(500).send('Server error');
  }
});

// @route   DELETE api/profile
// @desc    Get profile by user ID
// @access  Public
router.delete('/', auth, async (req, res) => {
  try {
    await Profile.findOneAndRemove({user: req.user.id});
    await User.findOneAndRemove({_id: req.user.id});
    return res.json({message: 'User removed'});
  } catch (error) {
    console.log(error.message);
    return res.status(500).send('Server error');
  }
});

// @route   PUT api/profile/experience
// @desc    Update profile experience
// @access  Private
router.put('/experience', [auth, [
  check('title').not().isEmpty().withMessage('Title is required'),
  check('company').not().isEmpty().withMessage('Company is required'),
  // check('from', 'From date is required and needs to be from the past').not().isEmpty().custom((value, {req}) => (req.body.to ? value < req.body.to : false))
  // check('from').custom((value, {req}) => {
  //   if(!!req.body.to && value > req.body.to) {
  //     throw new Error('From date is required and must before end date')
  //   }
  // })
]], async (req, res) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()) {
    return res.status(400).json({errors: errors.array()});
  }

  const {
    title,
    company,
    location,
    from,
    to,
    current,
    description
  } = req.body;

  const newExp = {
    title,
    company,
    location,
    from,
    to,
    current,
    description
  };

  try {
    const profile = await Profile.findOne({user: req.user.id});
    profile.experience.unshift(newExp);
    await profile.save();
    res.json(profile);
  } catch (error) {
    console.log(error.message);
    return res.status(500).send('Server error');
  }
});


// @route   DELETE api/profile/experience/:exp_id
// @desc    DELETE profile experience
// @access  Private

router.delete('/experience/:exp_id', auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({user: req.user.id});
    // Get removed index
    const removedIndex = profile.experience.map(item => item.id).indexOf(req.params.exp_id);
    profile.experience.splice(removedIndex, 1);
    await profile.save();
    res.json(profile);
  } catch (error) {
    console.log(error.message);
    return res.status(500).send('Server error');
  }
})


// @route   PUT api/profile/education
// @desc    Add/update profile education
// @access  Private

router.put('/education', [auth, [
  check('school').not().isEmpty().withMessage('School is required'),
  check('degree').not().isEmpty().withMessage('Degree is required'),
  check('fieldofstudy').not().isEmpty().withMessage('Field of study is required'),
  check('from').not().isEmpty().withMessage('From date of study is required'),
]], async (req, res) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()) {
    return res.status(400).json({errors: errors.array()});
  }
  const {school, degree, fieldofstudy, from, to, current, description} = req.body;
  const newEdu = {
    school,
    degree,
    fieldofstudy,
    from,
    to,
    current,
    description
  }
  try {
    const profile = await Profile.findOne({user: req.user.id});
    profile.education.unshift(newEdu);
    await profile.save();
    res.json(profile);
  } catch (error) {
    console.log(error.message);
    return res.status(500).send('Server error');
  }
})


// @route   DELETE api/profile/education/:edu_id
// @desc    DELETE profile education
// @access  Private

router.delete('/education/:edu_id', auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({user: req.user.id});
    // Find removed index
    const removedIndex = profile.education.map(item => item.id).indexOf(req.params.edu_id);
    profile.education.splice(removedIndex, 1);
    await profile.save();
    res.json(profile);
  } catch (error) {
    console.log(error.message);
    return res.status(500).send('Server error');
  }
})


// @route   GET api/profile/github/:username
// @desc    GET user repos from github
// @access  Public

router.get('/github/:username', async (req, res) => {
  try {
    const options = {
      uri: `https://api.github.com/users/${req.params.username}/repos?per_page=5&sort=created:asc&client_id=${config.get('githubClientId')}&client_secret=${config.get('githubSecret')},`,
      method: 'GET',
      headers: {'user-agent': 'node.js'}
    }

    request(options, (error, response, body) => {
      if(error) console.log(error);
      if(response.statusCode !== 200) {
        return res.status(404).json({message: 'No Github profile found'});
      }
      return res.json(JSON.parse(body));
    });
  } catch (error) {
    console.log(error.message);
    return res.status(500).send('Server error');
  }
})


module.exports = router;