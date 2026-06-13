const express = require('express');
const router = express.Router();
const catchAsync = require('../utils/catchAsync');
const passport = require('passport');
const User = require('../models/user');
const { storeReturnTo } = require('../middleware');
const users = require('../controllers/user');
const { isLoggedIn } = require('../middleware')
const multer  = require('multer')
const { storage } = require('../cloudinary');
const upload = multer({ storage })

router.route('/register')
  .get(users.renderRegister)
  .post(catchAsync(users.registerUser))

router.route('/login')
  .get(users.renderLogin)
  .post(
    storeReturnTo, 
    passport.authenticate('local', { failureFlash: true, failureRedirect: '/login'}),
    catchAsync(users.loginUser)
  )

router.get('/users/:id/campgrounds', catchAsync(users.showAllCampgrounds))

router.route('/users/:id')
  .get(catchAsync(users.showUser))
  .put(isLoggedIn, upload.single('avatar'), catchAsync(users.editUser))

router.get('/users/:id/edit', catchAsync(users.renderEdit))

router.get('/logout', users.logoutUser)

module.exports = router;