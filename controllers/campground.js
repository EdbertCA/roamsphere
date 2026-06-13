const Campground = require('../models/campground');
const User = require('../models/user');
const mongoose = require('mongoose');
const { cloudinary } = require('../cloudinary')
const maptilerClient = require("@maptiler/client");
maptilerClient.config.apiKey = process.env.MAPTILER_API_KEY;

module.exports.index = async (req, res) => {
  const { search, minPrice, maxPrice, sort } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = 9;
  const skip = (page - 1) * limit;

  const query = {};

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' }},
      { location: {$regex: search, $options: 'i' }}
    ]
  }

  if ((minPrice && maxPrice) && (minPrice > maxPrice)) {
    req.flash('error', 'Maximum price must be greater or equal to minimum price');
    return res.redirect('/campgrounds')
  }

  if (minPrice || maxPrice)  {
    query.price = {};

    if (minPrice) {
      query.price.$gte = Number(minPrice);
    }
    if (maxPrice) {
      query.price.$lte = Number(maxPrice);
    }
  }
  
  const sortOptions = {
    price_asc: { price: 1 },
    price_desc: { price: -1 },
    rating_desc: { avgRating: -1 }
  };

  const sortOption = sortOptions[sort] || {};

  const totalCampgrounds = await Campground.countDocuments(query);
  const totalPages = Math.ceil(totalCampgrounds / limit);
  const queryParams = new URLSearchParams(req.query);
  queryParams.delete('page');

  const queryString = queryParams.toString();
  
  const paginatedCampgrounds = await Campground.find(query)
  .sort(sortOption)
  .skip(skip)
  .limit(limit)
  .populate({
    path: 'reviews',
    select: 'rating'
  });

  const mapCampgrounds = await Campground.find(query);

  let favoriteIds = [];

  if (req.user) {
    favoriteIds = req.user.favorites.map(id => id.toString());
  }

  res.render('campgrounds/index', {
    campgrounds: paginatedCampgrounds,
    mapCampgrounds,
    search,
    minPrice,
    maxPrice,
    sort,
    page,
    totalPages,
    totalCampgrounds,
    queryString,
    favoriteIds
  });
}

module.exports.renderNewForm = (req, res) => {
  res.render('campgrounds/new')
}

module.exports.createCampground = async (req, res, next) => {
  const geoData = await maptilerClient.geocoding.forward(req.body.campground.location, { limit: 1 });
  if (!geoData.features?.length) {
      req.flash('error', 'Could not geocode that location. Please try again and enter a valid location.');
      return res.redirect('/campgrounds/new');
  }
  const campground = new Campground(req.body.campground);
  campground.geometry = geoData.features[0].geometry;
  campground.location = geoData.features[0].place_name;
  campground.images =  req.files.map(f => ({ url: f.path, filename: f.filename }))
  campground.author = req.user._id
  await campground.save();
  req.flash('success', 'Successfully made a new campground');
  res.redirect(`/campgrounds/${campground._id}`)
}

module.exports.showCampground = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
      req.flash('error', 'Cannot find that listing!');
      return res.redirect('/campgrounds');
  }
  const campground = await Campground.findById(id)
  .populate({
    path: 'reviews',
    populate: {
      path: 'author',
    }
  })
  .populate('author');
  if (!campground) {
    req.flash('error', 'Listing is not available');
    return res.redirect('/campgrounds');
  } 
  let isFavorited = false;

  if (req.user) {
    isFavorited = req.user.favorites.some(favId => favId.equals(campground._id));
  }
  res.render('campgrounds/show', { campground, isFavorited });
}

module.exports.renderEditForm = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
      req.flash('error', 'Cannot find that listing!');
      return res.redirect('/campgrounds');
  }
  const campground = await Campground.findById(id);
  if (!campground) {
    req.flash('error', 'Listing is not available');
    return res.redirect('/campgrounds');
  } 
  res.render('campgrounds/edit', { campground });
}

module.exports.updateCampground = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
      req.flash('error', 'Cannot find that listing to update!');
      return res.redirect('/campgrounds');
  }
  const geoData = await maptilerClient.geocoding.forward(req.body.campground.location, { limit: 1 });
  if (!geoData.features?.length) {
    req.flash('error', 'Could not geocode that location. Please try again and enter a valid location.');
    return res.redirect(`/campgrounds/${id}/edit`);
  }
  const campground = await Campground.findByIdAndUpdate(id, {... req.body.campground}, { returnDocument: 'after' });
  if (!campground) {
      req.flash('error', 'Cannot find that listing!');
      return res.redirect('/campgrounds');
  }
  campground.geometry = geoData.features[0].geometry;
  campground.location = geoData.features[0].place_name;
  const imgs = req.files.map(f => ({ url: f.path, filename: f.filename })) 
  campground.images.push(...imgs)
  await campground.save();
  if (req.body.deleteImages) {
    for (let filename of req.body.deleteImages) {
      await cloudinary.uploader.destroy(filename);
    }
    await campground.updateOne({
      $pull: { images: { filename : { $in: req.body.deleteImages }}}
    })
  }
  req.flash('success', 'Successfully updated a new campground');
  res.redirect(`/campgrounds/${campground._id}`)
}

module.exports.deleteCampground = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
      req.flash('error', 'Invalid listing deletion request.');
      return res.redirect('/campgrounds');
  }
  const campground = await Campground.findById(id);
  if (!campground) {
      req.flash('error', 'This listing was already deleted!');
      return res.redirect('/campgrounds');
  }
  if (!campground.author.equals(req.user._id)) {
    req.flash('error', 'No permission to do that');
    return res.redirect(`/campgrounds/${id}`)
  }
  await Campground.findByIdAndDelete(id);
  req.flash('success', 'Successfully deleted the campground');
  res.redirect('/campgrounds');
}

module.exports.addFavorite = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    req.flash('error', 'Invalid listing request.');
    return res.redirect('/campgrounds');
  }
  const user = await User.findById(req.user._id);

  if (!user.favorites.includes(id)) {
    user.favorites.push(id);
   await user.save();
  }
  req.flash('success', 'Successfully add to your favorites!');
  res.redirect(`/campgrounds/${id}`);
}

module.exports.removeFavorite = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    req.flash('error', 'Invalid listing request.');
    return res.redirect('/campgrounds');
  }
  await User.findByIdAndUpdate(req.user._id, { $pull: { favorites: id }});
  req.flash('success', 'Removed from your favorites.');
  res.redirect(`/campgrounds/${id}`);
}