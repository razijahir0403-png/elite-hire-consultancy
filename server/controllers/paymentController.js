const asyncHandler = require('../utils/asyncHandler');
const paymentService = require('../services/paymentService');

const getPayments = asyncHandler(async (req, res) => {
  const result = await paymentService.getPayments(req.query);
  res.status(200).json({
    success: true,
    data: result.records,
    pagination: result.pagination,
  });
});

const getDashboardMetrics = asyncHandler(async (req, res) => {
  const metrics = await paymentService.getDashboardMetrics(req.query);
  res.status(200).json({
    success: true,
    data: metrics,
  });
});

const getPaymentById = asyncHandler(async (req, res) => {
  const record = await paymentService.getPaymentById(req.params.id);
  res.status(200).json({
    success: true,
    data: record,
  });
});

const createPayment = asyncHandler(async (req, res) => {
  const editorName = req.user?.name || 'System';
  const record = await paymentService.createPayment(req.body, editorName);
  
  res.status(201).json({
    success: true,
    message: 'Payment record created successfully',
    data: record,
  });
});

const updatePayment = asyncHandler(async (req, res) => {
  const editorName = req.user?.name || 'System';
  const record = await paymentService.updatePayment(req.params.id, req.body, editorName);
  
  res.status(200).json({
    success: true,
    message: 'Payment record updated successfully',
    data: record,
  });
});

const addInstallment = asyncHandler(async (req, res) => {
  try {
    const editorName = req.user?.name || 'System';
    const record = await paymentService.addInstallment(req.params.id, req.body, editorName);
    
    res.status(200).json({
      success: true,
      message: 'Installment added successfully',
      data: record,
    });
  } catch (error) {
    console.error("Installment Update Error:", error);
    // If it's not an AppError, we still want to throw so asyncHandler catches it or handle it here
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      res.status(400).json({
        success: false,
        message: error.message
      });
      return;
    }
    throw error;
  }
});

const softDeletePayment = asyncHandler(async (req, res) => {
  const response = await paymentService.softDeletePayment(req.params.id);
  res.status(200).json({
    success: true,
    message: response.message,
  });
});

const exportPayments = asyncHandler(async (req, res) => {
  const records = await paymentService.exportPayments(req.query);
  res.status(200).json({
    success: true,
    data: records,
  });
});

module.exports = {
  getPayments,
  getDashboardMetrics,
  getPaymentById,
  createPayment,
  updatePayment,
  addInstallment,
  softDeletePayment,
  exportPayments,
};
