const mongoose = require('mongoose')
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose')

const UserSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  bio: {
    type: String,
    maxlength: 100
  },
  location: {
    type: String,
    maxlength: 50
  },
  avatar: {
    url: String,
    filename: String
  },
  favorites: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Campground'
    }
  ]
})

UserSchema.plugin(passportLocalMongoose.default);

module.exports = mongoose.model('User', UserSchema);