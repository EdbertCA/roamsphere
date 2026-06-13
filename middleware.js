const Campground = require('./models/campground');
const Review = require('./models/review');
const ExpressError = require('./utils/ExpressError');
const { campgroundSchema, reviewSchema } = require('./models/schema');
const mongoose = require('mongoose');

const isLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.session.returnTo = req.originalUrl
    req.flash('error', 'You must be signed in')
    return res.redirect('/login')
  }
  next();
}

const storeReturnTo = (req, res, next) => {
    if (req.session.returnTo) {
        res.locals.returnTo = req.session.returnTo;
    }
    next();
}

const isAuthor = async (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    req.flash('error', 'Cannot find that listing!');
    return res.redirect('/campgrounds');
  }
  const campground = await Campground.findById(id);
  if (!campground) {
    req.flash('error', 'Cannot find that listing!');
    return res.redirect('/campgrounds');
  }
  if (!campground.author.equals(req.user._id)) {
    req.flash('error', 'No permission to do that');
    return res.redirect(`/campgrounds/${id}`)
  }
  next();
}

const validateCampground = (req, res, next) => {
    const { error } = campgroundSchema.validate(req.body);
    if (error) {
      const msg = error.details.map(el => el.message).join(',');
      throw new ExpressError(msg, 400)
    } else {
      next();
    }
}

const validateReview = (req, res, next) => {
    const { error } = reviewSchema.validate(req.body);
    if (error) {
      const msg = error.details.map(el => el.message).join(',');
      throw new ExpressError(msg, 400)
    } else {
      next();
    }
}

const isReviewAuthor = async (req, res, next) => {
  const { id, reviewId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(reviewId)) {
    req.flash('error', 'Invalid parameters supplied.');
    return res.redirect('/campgrounds');
  }
  const review = await Review.findById(reviewId);
  if (!review.author.equals(req.user._id)) {
    req.flash('error', 'No permission to do that');
    return res.redirect(`/campgrounds/${id}`)
  }
  next();
}

module.exports = 
{ isLoggedIn, storeReturnTo, isAuthor, validateReview, validateCampground, isReviewAuthor }