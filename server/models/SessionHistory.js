const mongoose = require('mongoose');

const sessionHistorySchema = new mongoose.Schema(
    {
        employeeEmail: {
            type: String,
            required: true,
            trim: true,
            lowercase: true
        },
        loginDate: {
            type: String, // Format: YYYY-MM-DD
            required: true
        },
        loginTime: {
            type: Date,
            required: true
        },
        endTime: {
            type: Date,
            default: null
        },
        type: {
            type: String,
            enum: ['Active', 'End Session', 'Logout', 'Auto Logout'],
            default: 'Active'
        },
        sessionDuration: {
            type: Number, // Stored in milliseconds
            default: 0
        }
    },
    { timestamps: true }
);

sessionHistorySchema.index({ employeeEmail: 1, loginDate: 1 });
sessionHistorySchema.index({ createdAt: -1 });

module.exports = mongoose.model('SessionHistory', sessionHistorySchema);
