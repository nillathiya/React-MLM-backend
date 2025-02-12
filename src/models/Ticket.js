const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  sender: { type: String, enum: ['user', 'admin'], required: true },
  text: { type: String, required: true },
  isRead: { type: Boolean, default: false } 
});

const TicketSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, enum: ["open", "completed", "closed"], default: "open" },
  messages: [messageSchema],
  unreadMessages: {
    admin: { type: Number, default: 0 },
    user: { type: Number, default: 0 }
  }
}, { timestamps: true });

module.exports = mongoose.model("Ticket", TicketSchema);
