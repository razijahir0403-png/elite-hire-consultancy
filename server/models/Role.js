const mongoose = require('mongoose');
const softDeletePlugin = require('./plugins/softDeletePlugin');

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Role name is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    permissions: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: 'roles',
  }
);

roleSchema.plugin(softDeletePlugin);

module.exports = mongoose.model('Role', roleSchema);
