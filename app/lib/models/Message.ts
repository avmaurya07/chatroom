import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room",
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  userName: {
    type: String,
    required: true,
  },
  userEmoji: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Add index for auto-deletion after 24 hours
messageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

export const Message =
  mongoose.models.Message || mongoose.model("Message", messageSchema);
