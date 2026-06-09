const express = require('express');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
  getPayments,
  getDashboardMetrics,
  getPaymentById,
  createPayment,
  updatePayment,
  addInstallment,
  softDeletePayment,
  exportPayments,
} = require('../controllers/paymentController');

const router = express.Router();

router.use(protect);

router.get('/dashboard', getDashboardMetrics);
router.get('/export', exportPayments);
router.get('/', getPayments);
router.get('/:id', getPaymentById);
router.post('/', createPayment);
router.put('/:id', updatePayment);
router.put('/:id/installment', addInstallment);

router.delete('/:id', adminOnly, softDeletePayment);

module.exports = router;
