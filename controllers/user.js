const User = require('../models/user');
const Campground = require('../models/campground');
const Review = require('../models/review');
const mongoose = require('mongoose');

module.exports.renderRegister = (req, res) => {
  res.render('users/register')
}

module.exports.registerUser = async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const user = new User({ email, username });
    const registeredUser = await User.register(user, password);
    req.login(registeredUser, function (err) {
      if (err) {
        return next(err);
      } else {
        req.flash('success', 'Welcome to Yelp Camp');
        res.redirect('/campgrounds');
      }
    })
  } catch (e) {
    req.flash('error', e.message)
    res.redirect('/register');
  }
}

module.exports.renderLogin = (req, res) => {
  res.render('users/login')
}

module.exports.loginUser = async (req, res) => {
  req.flash('success', 'Welcome back')
  const redirectUrl = res.locals.returnTo || '/campgrounds'
  res.redirect(redirectUrl)
}

module.exports.logoutUser = (req, res) => {
  req.logout(function(err) {
    if (err) {
      return next(err);
    }

    req.flash('success', 'Goodbye');
    res.redirect('/campgrounds');
  });
}

module.exports.showUser = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    req.flash('error', 'User not found.');
    return res.redirect('/campgrounds');
  }

  const foundUser = await User.findById(id);
  if (!foundUser) {
    req.flash('error', 'User not found.');
    return res.redirect('/campgrounds');
  }

  const campgrounds = await Campground.find({ author: foundUser._id}).limit(6)
  const totalCampgrounds = await Campground.countDocuments({ author: foundUser._id})
  const reviewCount = await Review.countDocuments({ author: foundUser._id });
  const favoriteCount = foundUser.favorites.length;

  const favoriteIds = foundUser.favorites.map(favId => favId.toString());

  res.render('users/show', {
    foundUser, 
    campgrounds, 
    totalCampgrounds,
    reviewCount, 
    favoriteCount, 
    favoriteIds
  })
}

module.exports.renderEdit = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    req.flash('error', 'User does not exist.');
    return res.redirect('/campgrounds');
  }

  const foundUser = await User.findById(id);
  if (!foundUser) {
    req.flash('error', 'User does not exist');
    return res.redirect('/campgrounds');
  } 
  res.render('users/edit', { foundUser });
}

module.exports.editUser = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    req.flash('error', 'Unable to update profile.');
    return res.redirect('/campgrounds');
  }
  
  const foundUser = await User.findByIdAndUpdate(id, {... req.body.user}, { returnDocument: 'after', runValidators: true });
  if (!foundUser) {
    req.flash('error', 'User profile not found.');
    return res.redirect('/campgrounds');
  }

  if (req.file) {
    foundUser.avatar = {
      url: req.file.path,
      filename: req.file.filename
    };
    await foundUser.save();
  }
  req.flash('success', 'Successfully updated the profile');
  res.redirect(`/users/${foundUser._id}`)
}

module.exports.showAllCampgrounds = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    req.flash('error', 'User not found.');
    return res.redirect('/campgrounds');
  }
  const foundUser = await User.findById(id);
  if (!foundUser) {
    req.flash('error', 'User not found');
    return res.redirect('/campgrounds');
  }

  const page = parseInt(req.query.page) || 1;
  const limit = 9;
  const skip = (page - 1) * limit;

  const campgrounds = await Campground.find({ author: foundUser._id })
  .skip(skip)
  .limit(limit)
  const totalCampgrounds = await Campground.countDocuments({ author: foundUser._id });
  
  const totalPages = Math.ceil(totalCampgrounds/ limit);

  const favoriteIds = foundUser.favorites.map(favId => favId.toString());

  res.render('users/ownedCampgrounds', { 
    foundUser, 
    campgrounds, 
    favoriteIds, 
    page, 
    totalPages 
  })
}