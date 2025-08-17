import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  creatorId: {
    type: String,
    required: true,
  },
  isPrivate: {
    type: Boolean,
    default: false,
  },
  isPersonal: {
    type: Boolean,
    default: false,
  },
  p1: {
    type: {
      id: String,
      name: String,
      emoji: String,
    },
    required: function (this: { isPersonal?: boolean }) {
      return this.isPersonal;
    },
  },
  p2: {
    type: {
      id: String,
      name: String,
      emoji: String,
    },
    required: function (this: { isPersonal?: boolean }) {
      return this.isPersonal;
    },
  },
  activeUsers: {
    type: Map,
    of: {
      userId: String,
      userName: String,
      userEmoji: String,
      lastActive: Date,
    },
    default: new Map(),
  },
  inviteLinks: [
    {
      code: String,
      isOneTime: Boolean,
      usedBy: [String],
      createdAt: Date,
    },
  ],
  lastActive: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Add index for auto-deletion after 24 hours of inactivity
roomSchema.index({ lastActive: 1 }, { expireAfterSeconds: 86400 });

export const Room = mongoose.models.Room || mongoose.model("Room", roomSchema);
