const mongoose = require('mongoose');
const Campground = require('../models/campground');

mongoose.connect('mongodb://127.0.0.1:27017/yelp-camp');

async function updateAllCampgroundRatings() {
  const campgrounds = await Campground.find({}).populate('reviews');

  for (let campground of campgrounds) {
    campground.reviewCount = campground.reviews.length;

    if (campground.reviews.length === 0) {
      campground.avgRating = 0;
    } else {
      const totalRating = campground.reviews.reduce((total, review) => {
        return total + review.rating;
      }, 0);

      campground.avgRating = totalRating / campground.reviews.length;
    }

    await campground.save();

    console.log(
      `${campground.title}: ${campground.avgRating} (${campground.reviewCount} reviews)`
    );
  }

  console.log('Finished updating ratings');
  mongoose.connection.close();
}

updateAllCampgroundRatings();
