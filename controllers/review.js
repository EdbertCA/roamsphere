const Review = require('../models/review');
const Campground = require('../models/campground');
const mongoose = require('mongoose');

async function updateCampgroundRating(campId) {
  const campground = await Campground.findById(campId).populate('reviews');
  if (!campground.reviews.length) {
    campground.avgRating = 0;
    campground.reviewCount = 0;
  } else {
    const totalRating = campground.reviews.reduce(
      (total, currReview) => total + currReview.rating,
      0
    )
    campground.avgRating = totalRating / campground.reviews.length;
    campground.reviewCount = campground.reviews.length;
  }
  await campground.save();
}

module.exports.createReview = async(req, res) => {
  const { id } = req.params;
    
  if (!mongoose.Types.ObjectId.isValid(id)) {
    req.flash('error', 'Cannot submit review: Invalid listing.');
    return res.redirect('/campgrounds');
  }
  const campground = await Campground.findById(id);
  if (!campground) {
    req.flash('error', 'Cannot add review: That listing no longer exists!');
    return res.redirect('/campgrounds');
  }
  if (req.body.review.rating == 0) {
    req.flash('error', 'Review must be from 1 to 5');
    return res.redirect(`/campgrounds/${campground._id}`)
  }
  const review = new Review(req.body.review);
  review.author = req.user._id;
  campground.reviews.push(review);
  await campground.save();
  await review.save();
  await updateCampgroundRating(id);
  req.flash('success', 'Created a new review');
  res.redirect(`/campgrounds/${campground._id}`)
}

module.exports.deleteReview = async (req, res) => {
  const { id, reviewId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(reviewId)) {
    req.flash('error', 'Invalid request parameters.');
    return res.redirect('/campgrounds');
  }
  const campground = await Campground.findByIdAndUpdate(id, { $pull: { reviews: reviewId }});
  if (!campground) {
    req.flash('error', 'That listing no longer exists!');
    return res.redirect('/campgrounds');
  }
  const review = await Review.findByIdAndDelete(reviewId);
  await updateCampgroundRating(id);
  req.flash('success', 'Successfully deleted the review');
  res.redirect(`/campgrounds/${id}`)
}