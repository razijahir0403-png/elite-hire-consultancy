const PaymentInfo = require('../models/PaymentInfo');
const Client = require('../models/Client');
const AppError = require('../utils/AppError');
const {
  generateNextPaymentId,
  isDuplicatePaymentIdError,
  MAX_GENERATION_ATTEMPTS,
} = require('../utils/paymentIdGenerator');

const buildAggregationPipeline = ({ search = '', status = '', clientId = '', clientName = '' }, sort, skip, limitNum, isExport = false) => {
  const matchStage = { isDeleted: { $ne: true } };

  if (search) {
    matchStage.$or = [
      { paymentId: { $regex: search, $options: 'i' } },
      { clientId: { $regex: search, $options: 'i' } },
      { clientName: { $regex: search, $options: 'i' } },
    ];
  }

  if (clientId) {
    matchStage.clientId = { $regex: clientId, $options: 'i' };
  }
  
  if (clientName) {
    matchStage.clientName = { $regex: clientName, $options: 'i' };
  }

  const pipeline = [
    { $match: matchStage },
    {
      $addFields: {
        paidAmount: { $sum: '$installments.amount' },
      },
    },
    {
      $addFields: {
        dueAmount: { $subtract: ['$totalAmount', '$paidAmount'] },
      },
    },
    {
      $addFields: {
        status: {
          $cond: {
            if: { $eq: ['$paidAmount', 0] },
            then: 'Payment Pending',
            else: {
              $cond: {
                if: { $lte: ['$dueAmount', 0] },
                then: 'Payment Completed',
                else: 'Partially Paid',
              },
            },
          },
        },
      },
    },
  ];

  if (status) {
    // Exact match for status
    pipeline.push({ $match: { status } });
  }

  if (isExport) {
    pipeline.push({ $sort: sort });
    pipeline.push({ $limit: 5000 });
    return pipeline;
  }

  pipeline.push({
    $facet: {
      metadata: [{ $count: 'totalRecords' }],
      data: [
        { $sort: sort },
        { $skip: skip },
        { $limit: limitNum },
      ],
    },
  });

  return pipeline;
};

const getPayments = async (queryParams) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    status = '',
    clientId = '',
    clientName = '',
    sortBy = 'updatedOn',
    sortOrder = 'desc',
  } = queryParams;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  const pipeline = buildAggregationPipeline({ search, status, clientId, clientName }, sort, skip, limitNum);
  const result = await PaymentInfo.aggregate(pipeline);

  const totalRecords = result[0]?.metadata[0]?.totalRecords || 0;
  const records = result[0]?.data || [];

  return {
    records: records.map(record => {
      // Normalize _id to id for frontend
      record.id = record._id;
      return record;
    }),
    pagination: {
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalRecords / limitNum) || 1,
      totalRecords,
    },
  };
};

const getDashboardMetrics = async (queryParams) => {
  // Use same filters to allow dashboard counts to reflect filtered results
  const { search = '', status = '', clientId = '', clientName = '' } = queryParams;
  
  const pipeline = buildAggregationPipeline({ search, status, clientId, clientName }, {}, 0, 0, true);
  // Actually, for dashboard, we don't want the skip/limit. We want to aggregate the results.
  // Instead of using buildAggregationPipeline with export, we can modify the facet or build it manually.
  
  const matchStage = { isDeleted: { $ne: true } };
  if (search) {
    matchStage.$or = [
      { paymentId: { $regex: search, $options: 'i' } },
      { clientId: { $regex: search, $options: 'i' } },
      { clientName: { $regex: search, $options: 'i' } },
    ];
  }
  if (clientId) matchStage.clientId = { $regex: clientId, $options: 'i' };
  if (clientName) matchStage.clientName = { $regex: clientName, $options: 'i' };

  const dashPipeline = [
    { $match: matchStage },
    {
      $addFields: {
        paidAmount: { $sum: '$installments.amount' },
      },
    },
    {
      $addFields: {
        dueAmount: { $subtract: ['$totalAmount', '$paidAmount'] },
      },
    },
    {
      $addFields: {
        status: {
          $cond: {
            if: { $eq: ['$paidAmount', 0] },
            then: 'Payment Pending',
            else: {
              $cond: {
                if: { $lte: ['$dueAmount', 0] },
                then: 'Payment Completed',
                else: 'Partially Paid',
              },
            },
          },
        },
      },
    }
  ];

  if (status) {
    dashPipeline.push({ $match: { status } });
  }

  dashPipeline.push({
    $group: {
      _id: null,
      uniqueClients: { $addToSet: '$clientId' },
      totalPayout: { $sum: '$paidAmount' },
      pendingPayout: { $sum: { $max: [0, '$dueAmount'] } },
    }
  });

  const [metrics] = await PaymentInfo.aggregate(dashPipeline);

  return {
    totalClients: metrics ? metrics.uniqueClients.length : 0,
    totalPayout: metrics ? metrics.totalPayout : 0,
    pendingPayout: metrics ? metrics.pendingPayout : 0,
  };
};

const validateClientDetails = async (clientId, clientName) => {
  const client = await Client.findOne({ clientId: String(clientId).trim() });
  if (!client) {
    throw new AppError('The provided Client ID does not exist in the system.', 404);
  }
  if (client.clientName !== String(clientName).trim()) {
    throw new AppError('The provided Client Name does not match the associated Client ID.', 400);
  }
};

const createPayment = async (body, editorName) => {
  const {
    clientId,
    clientName,
    totalAmount,
    paidAmount = 0,
    remarks = '',
  } = body;

  await validateClientDetails(clientId, clientName);

  if (Number(totalAmount) <= 0) {
    throw new AppError('Total amount must be greater than zero.', 400);
  }
  
  if (Number(paidAmount) < 0) {
    throw new AppError('Paid amount cannot be negative.', 400);
  }

  if (Number(paidAmount) > Number(totalAmount)) {
    throw new AppError('Paid amount cannot exceed the total amount.', 400);
  }

  const installments = [];
  if (Number(paidAmount) > 0) {
    installments.push({
      amount: Number(paidAmount),
      recordedBy: editorName,
      recordedOn: new Date(),
      remarks,
    });
  }

  const recordPayload = {
    clientId: String(clientId).trim(),
    clientName: String(clientName).trim(),
    totalAmount: Number(totalAmount),
    installments,
    createdBy: editorName,
    updatedBy: editorName,
    updatedOn: new Date(),
  };

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const paymentId = await generateNextPaymentId();
    try {
      const record = await PaymentInfo.create({ paymentId, ...recordPayload });
      return record;
    } catch (err) {
      if (isDuplicatePaymentIdError(err)) {
        console.warn(
          `[PaymentInfo] Duplicate paymentId "${paymentId}" on create (attempt ${attempt}/${MAX_GENERATION_ATTEMPTS}). Retrying with next sequence.`
        );
        if (attempt === MAX_GENERATION_ATTEMPTS) {
          throw new AppError(
            'Unable to assign a unique payment ID after multiple attempts. Please try again.',
            409
          );
        }
        continue;
      }
      throw err;
    }
  }

  throw new AppError('Unable to assign a unique payment ID. Please try again.', 409);
};

const getPaymentById = async (id) => {
  const mongoose = require('mongoose');
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid Payment ID', 400);
  }

  const pipeline = [
    { $match: { _id: new mongoose.Types.ObjectId(id) } },
    {
      $addFields: {
        paidAmount: { $sum: '$installments.amount' },
      },
    },
    {
      $addFields: {
        dueAmount: { $subtract: ['$totalAmount', '$paidAmount'] },
      },
    },
    {
      $addFields: {
        status: {
          $cond: {
            if: { $eq: ['$paidAmount', 0] },
            then: 'Payment Pending',
            else: {
              $cond: {
                if: { $lte: ['$dueAmount', 0] },
                then: 'Payment Completed',
                else: 'Partially Paid',
              },
            },
          },
        },
      },
    },
  ];
  
  const [record] = await PaymentInfo.aggregate(pipeline);
  if (!record) {
    throw new AppError('Payment record not found', 404);
  }
  record.id = record._id;
  return record;
};

const updatePayment = async (id, body, editorName) => {
  const mongoose = require('mongoose');
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid Payment ID', 400);
  }

  const record = await PaymentInfo.findById(id);
  if (!record) {
    throw new AppError('Payment record not found', 404);
  }

  const {
    clientId,
    clientName,
    totalAmount,
    paidAmount,
    remarks = '',
  } = body;

  if (clientId !== undefined && clientName !== undefined && (clientId !== record.clientId || clientName !== record.clientName)) {
    await validateClientDetails(clientId, clientName);
    record.clientId = String(clientId).trim();
    record.clientName = String(clientName).trim();
  }

  const currentPaidAmount = record.installments.reduce((sum, inst) => sum + inst.amount, 0);

  if (totalAmount !== undefined) {
    if (Number(totalAmount) <= 0) {
      throw new AppError('Total amount must be greater than zero.', 400);
    }
    
    // Check if new total amount is less than what's already paid
    if (Number(totalAmount) < currentPaidAmount) {
      throw new AppError(`Total amount cannot be less than the already paid amount (${currentPaidAmount}).`, 400);
    }
    
    record.totalAmount = Number(totalAmount);
  }

  const dueAmount = record.totalAmount - currentPaidAmount;

  if (paidAmount !== undefined && paidAmount !== '') {
    const amountToPay = Number(paidAmount);
    if (amountToPay < 0) {
      throw new AppError('Paid amount cannot be negative.', 400);
    }
    if (amountToPay > 0) {
      if (amountToPay > dueAmount) {
        throw new AppError(`Installment amount (${amountToPay}) exceeds the remaining due amount (${dueAmount}).`, 400);
      }
      
      record.installments.push({
        amount: amountToPay,
        recordedBy: editorName,
        recordedOn: new Date(),
        remarks,
      });
    }
  }

  record.updatedBy = editorName;
  record.updatedOn = new Date();

  await record.save();
  return getPaymentById(id);
};

const addInstallment = async (id, body, editorName) => {
  const mongoose = require('mongoose');
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid Payment ID', 400);
  }

  const record = await PaymentInfo.findById(id);
  if (!record) {
    throw new AppError('Payment record not found', 404);
  }

  const { amount, remarks = '' } = body;

  if (Number(amount) <= 0) {
    throw new AppError('Installment amount must be greater than zero.', 400);
  }

  if (!record.installments) {
    record.installments = [];
  }

  const paidAmount = record.installments.reduce((sum, inst) => sum + inst.amount, 0);
  const dueAmount = record.totalAmount - paidAmount;

  if (Number(amount) > dueAmount) {
    throw new AppError(`Installment amount (${amount}) exceeds the remaining due amount (${dueAmount}).`, 400);
  }

  record.installments.push({
    amount: Number(amount),
    recordedBy: editorName,
    recordedOn: new Date(),
    remarks,
  });

  record.updatedBy = editorName;
  record.updatedOn = new Date();

  await record.save();
  return getPaymentById(id);
};

const softDeletePayment = async (id) => {
  const mongoose = require('mongoose');
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid Payment ID', 400);
  }

  const record = await PaymentInfo.findById(id);
  if (!record) {
    throw new AppError('Payment record not found', 404);
  }
  await record.softDelete();
  return { message: 'Payment record removed successfully' };
};

const exportPayments = async (queryParams) => {
  const { search = '', status = '', clientId = '', clientName = '', sortBy = 'updatedOn', sortOrder = 'desc' } = queryParams;
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
  
  const pipeline = buildAggregationPipeline({ search, status, clientId, clientName }, sort, 0, 0, true);
  const records = await PaymentInfo.aggregate(pipeline);
  
  return records.map(record => {
    record.id = record._id;
    return record;
  });
};

module.exports = {
  getPayments,
  getPaymentById,
  getDashboardMetrics,
  createPayment,
  updatePayment,
  addInstallment,
  softDeletePayment,
  exportPayments,
};
