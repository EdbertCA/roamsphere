const mongoose = require('mongoose');
const cities = require('./cities')
const { places, descriptors, descriptions } = require('./seedHelpers'); 
const { images } = require('./images');
const Campground = require('../models/campground');

const dbUrl = process.env.DB_URL || 'mongodb://localhost:27017/yelp-camp';

mongoose.connect(dbUrl)
  .then(() => {
      console.log("MONGO CONNECTION OPEN")
  })
  .catch((err) => {
      console.log("OH NO MONGO ERROR");
      console.log(err);
  });

const sample = (array) => array[Math.floor(Math.random() * array.length)];
  
const seedDB = async() => {
  await Campground.deleteMany({});
  for (let i = 0; i < 100; i++) {
    const shuffledImages = [...images].sort(() => 0.5 - Math.random());
    const selectedImages = shuffledImages.slice(0, 2);
    const random1000 = Math.floor(Math.random() * 1000);
    const price = Math.floor(Math.random() * 120) + 35;
    const camp = new Campground({
      location: `${cities[random1000].city}, ${cities[random1000].state}`,
      title: `${sample(descriptors)} ${sample(places)}`,
      geometry: {
        type: "Point",
        coordinates: [
          cities[random1000].longitude,
          cities[random1000].latitude
        ]
      },
      images: selectedImages,
      author: '6a0af42649e5e39f447b94e1',
      description: sample(descriptions),
      price
    })
    await camp.save();
  }
}

seedDB().then(() => {
  mongoose.connection.close();
});