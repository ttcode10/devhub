const express = require('express');
const router = express.Router();
const Post = require('./../../models/Post');
const auth = require('./../../middleware/auth');
const { check, validationResult } = require('express-validator');
const User = require('../../models/User');

// @route   POST api/posts
// @desc    Create a post
// @access  Private
router.post('/',
  [
    auth,
    [
      check('text', 'Text is required').not().isEmpty()
    ]
  ], async (req, res) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
      return res.status(400).json({errors: errors.array()});
    }

    try {
      const user = await User.findById(req.user.id).select('-password');

      const newPost = new Post({
        text: req.body.text,
        name: user.name,
        avatar: user.avatar,
        user: req.user.id
      });

      const post = await newPost.save();
      return res.json(post)

    } catch (error) {
      console.log(error.message);
      return res.status(500).send('Server error');
    }
  }
);



// @route   GET api/posts
// @desc    Get all posts
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const posts = await Post.find().sort({date: -1});
    return res.json(posts);
  } catch (error) {
    console.log(error.message);
    return res.status(500).send('Server error');
  }
});


// @route   GET api/posts/:id
// @desc    Get a post by id
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if(!post) {
      return res.status(404).json({message: 'Post not found'});
    }
    return res.json(post);
  } catch (error) {
    console.log(error.message);
    if(error.kind === 'ObjectId') {
      return res.status(404).json({message: 'Post not found'});
    }
    return res.status(500).send('Server error');
  }
});



// @route   DELETE api/posts/:id
// @desc    Delete a post by id
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if(!post) {
      return res.status(404).json({message: 'Post not found'});
    }

    // Check user if owns the post
    if(post.user.toString() !== req.user.id) {
      return res.status(401).json({message: 'User not authorized'})
    }
    await post.remove();
    res.json({message: 'Post removed'});

  } catch (error) {
    console.log(error.message);
    return res.status(500).send('Server error');
  }
});



// @route   PUT api/posts/:id/likes
// @desc    Like a post
// @access  Private
router.put('/:id/likes', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    // Check if the user has already liked the post
    if(post.likes.filter(item => item.user.toString() === req.user.id).length > 0) {
      return res.status(400).json({message: 'Post already liked'});
    }

    post.likes.unshift({user: req.user.id});
    await post.save();
    return res.json(post.likes);

  } catch (error) {
    console.log(error.message);
    return res.status(500).send('Server error');
  }
});


// @route   Delete api/posts/:id/likes
// @desc    Unlike a post
// @access  Private
router.delete('/:id/likes', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    // Check if the user has already liked the post
    if(post.likes.filter(item => item.user.toString() === req.user.id).length === 0) {
      return res.status(400).json({message: 'The post has not been liked'});
    }
    const removedIndex = post.likes.map(item => item.user.toString()).indexOf(req.user.id);
    post.likes.splice(removedIndex, 1);
    await post.save();
    return res.json(post.likes);
  } catch (error) {
    console.log(error.message);
    return res.status(500).send('Server error');
  }
});



// @route   POST api/posts/:id/comments
// @desc    Add a comment
// @access  Private
router.post('/:id/comments',
  [
    auth,
    [
      check('text', 'Text is required').not().isEmpty()
    ]
  ], async (req, res) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
      return res.status(400).json({erors: errors.array()});
    }

    try {
      const post = await Post.findById(req.params.id);
      const user = await User.findById(req.user.id).select('-password');
  
      const newComment = {
        text: req.body.text,
        name: user.name,
        avatar: user.avatar,
        user: req.user.id
      }
      post.comments.unshift(newComment);
      await post.save();

      return res.json(post);

    } catch (error) {
      console.log(error.message);
      return res.status(500).send('Server error');
    }
  }
);




// @route   DELETE api/posts/:id/comments/:comment_id
// @desc    Delete a comment
// @access  Private
router.delete('/:id/comments/:comment_id', auth, async (req, res) => {
  try {
    // Check if comment exists
    const post = await Post.findById(req.params.id);
    const removedComment = await post.comments.find(item => item.id === req.params.comment_id);
    if (!removedComment) {
      return res.status(404).json({message: 'Comment not found'});
    }

    // Check if the user owns the comment
    const removedIndex = await post.comments.map(item => item.id).indexOf(req.params.comment_id);
    if(removedComment.user.toString() !== req.user.id) {
      return res.status(400).json({message: 'You are not authorized to delete this comment'});
    }
    post.comments.splice(removedIndex, 1);
    await post.save();
    return res.json(post);

  } catch (error) {
    console.log(error.message);
    return res.status(500).send('Server error');
  }
});



module.exports = router;