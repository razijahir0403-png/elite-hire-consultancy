const express = require('express');
const router = express.Router();
const { registerUser, loginUser } = require('../controllers/authController');
const { getAllUsers, approveUser } = require('../controllers/userController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { authValidators, userValidators } = require('../utils/validators');
const validate = require('../middleware/validate');

router.post('/register', authValidators.register, validate, registerUser);
router.post('/login', authValidators.login, validate, loginUser);

router.get('/users', protect, adminOnly, getAllUsers);
router.put('/users/:id/approve', protect, adminOnly, userValidators.approveUser, validate, approveUser);

module.exports = router;
