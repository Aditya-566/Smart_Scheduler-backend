import express from 'express';
import { registerUser, loginUser, getMe, forgotPassword, resetPassword, getUsers } from '../controllers/authController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);

router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);
router.get('/me', protect, getMe);
router.get('/users', protect, authorize('ADMIN'), getUsers);

export default router;
