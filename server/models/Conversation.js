const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['direct', 'group'],
      default: 'direct',
      required: true,
    },
    name: {
      type: String,
      trim: true,
      default: '',
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    lastMessageText: {
      type: String,
      default: '',
      trim: true,
    },
    lastMessageSender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    clearedBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        clearedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    hiddenFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
    collection: 'conversations',
  }
);

conversationSchema.pre('validate', function (next) {
  if (Array.isArray(this.clearedBy)) {
    this.clearedBy = this.clearedBy.filter((c) => c && c.user);
  }
  if (Array.isArray(this.hiddenFor)) {
    this.hiddenFor = this.hiddenFor.filter(Boolean);
  }
  next();
});

conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastMessageAt: -1 });
conversationSchema.index({ type: 1, participants: 1 });
conversationSchema.index({ isDeleted: 1 });
conversationSchema.index({ participants: 1, hiddenFor: 1, lastMessageAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
