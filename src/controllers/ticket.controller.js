const {Ticket} = require("../models/DB");

// ✅ Create a new ticket
exports.createTicket = async (req, res) => {
    try {
        const { userId, title, description } = req.body;
        if (!userId || !title || !description) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const newTicket = new Ticket({
            userId,
            title,
            description,
            status: "open",
            messages: [],
            unreadMessages: { admin: 0, user: 0 },
        });

        await newTicket.save();

        // Emit event to notify admins
        global.io.to("admin-room").emit("newTicketCreated", newTicket);

        res.status(201).json({ success: true, message: "Ticket created", ticket: newTicket });
    } catch (error) {
        console.error("Error creating ticket:", error);
        res.status(500).json({ error: "Server error" });
    }
};

// ✅ User sends a message
exports.sendMessage = async (req, res) => {
    try {
        const { ticketId, text, sender } = req.body;
        if (!ticketId || !text || !sender) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const ticket = await Ticket.findById(ticketId);
        if (!ticket) return res.status(404).json({ error: "Ticket not found" });
        if (ticket.status !== "open") return res.status(403).json({ error: "Cannot send messages in a closed/completed ticket" });

        // Add message with isRead: false
        const newMessage = { sender, text, isRead: false };
        ticket.messages.push(newMessage);

        // Update unread messages count
        if (sender === "user") {
            ticket.unreadMessages.admin += 1;
        } else {
            ticket.unreadMessages.user += 1;
        }

        await ticket.save();

        // Emit real-time event
        global.io.to(ticket.userId.toString()).emit("newMessage", { ticketId, sender, text, isRead: false });
        global.io.to("admin-room").emit("newMessage", { ticketId, sender, text, userId: ticket.userId.toString(), isRead: false });

        res.status(200).json({ success: true, message: "Message sent", ticket });
    } catch (error) {
        console.log('Error sending message: ' + error.message)
        res.status(500).json({ error: "Server error" });
    }
};

// ✅ Admin replies to a ticket
exports.replyMessage = async (req, res) => {
    try {
        const { ticketId, text } = req.body;
        if (!ticketId || !text) return res.status(400).json({ error: "Missing required fields" });

        const ticket = await Ticket.findById(ticketId);
        if (!ticket) return res.status(404).json({ error: "Ticket not found" });
        if (ticket.status !== "open") return res.status(403).json({ error: "Cannot reply in a closed/completed ticket" });

        ticket.messages.push({ sender: "admin", text });
        ticket.unreadMessages.user += 1;  // Increment unread messages for user
        ticket.updatedAt = new Date();
        await ticket.save();

        // Emit real-time notification for user
        global.io.to(ticket.userId.toString()).emit("newMessage", { ticketId, sender: "admin", text, isRead: false });
        global.io.to("admin-room").emit("newMessage", { ticketId, sender: "admin", text, userId: ticket.userId.toString(), isRead: false });

        res.status(200).json({ status: "success", message: "Reply sent", data: ticket });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
};


// Fetch all tickets for a user
exports.getUserTickets = async (req, res) => {
    try {
        const { userId } = req.params;
        const tickets = await Ticket.find({ userId }).populate("userId", "username name").sort({ updatedAt: -1 });

        res.status(200).json({ success: true, tickets });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
};

// ✅ Fetch all tickets (Admin)
exports.getAllTickets = async (req, res) => {
    try {
        const tickets = await Ticket.find({}, '_id status unreadMessages userId')
            .populate("userId", "username name")
            .sort({ updatedAt: -1 });

        res.status(200).json({ status: "success", message: "successfully get all tickets", data: tickets });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
};

// ✅ Admin updates ticket status
exports.updateTicketStatus = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { status } = req.body;

        if (!["open", "completed", "closed"].includes(status)) {
            return res.status(400).json({ error: "Invalid status" });
        }

        let ticket = await Ticket.findById(ticketId);
        if (!ticket) return res.status(404).json({ error: "Ticket not found" });

        ticket.status = status;
        ticket.updatedAt = new Date();
        await ticket.save();

        res.status(200).json({ status: "success", message: `Ticket status updated to ${status}`, data: ticket });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
};
// Admin deletes a ticket
exports.deleteTicket = async (req, res) => {
    try {
        const { ticketId } = req.params;
        await Ticket.findByIdAndDelete(ticketId);

        res.status(200).json({ success: true, message: "Ticket deleted" });
    } catch (error) {
        console.log("Ticket deleted error :", error);
        res.status(500).json({ error: "Server error" });
    }
};

// ✅ Fetch ticket messages & mark as read
exports.getTicketMessages = async (req, res) => {
    const { ticketId } = req.params;
    const { role } = req.body;

    try {
        // Find the ticket by ID and populate user details
        const ticket = await Ticket.findById(ticketId).populate("userId", "username name");
        if (!ticket) {
            return res.status(404).json({ error: "Ticket not found" });
        }

        let messagesUpdated = false;

        // Mark messages as read based on role
        if (role === "admin") {
            ticket.messages.forEach((msg) => {
                if (msg.sender === "user" && !msg.isRead) {
                    msg.isRead = true;
                    messagesUpdated = true;
                }
            });
            ticket.unreadMessages.admin = 0;
        } else {
            ticket.messages.forEach((msg) => {
                if (msg.sender === "admin" && !msg.isRead) {
                    msg.isRead = true;
                    messagesUpdated = true;
                }
            });
            ticket.unreadMessages.user = 0;
        }

        if (messagesUpdated) {
            await ticket.save(); // Persist updates

            // Emit real-time event
            global.io.to(ticket.userId.toString()).emit("messagesRead", { ticketId });
            global.io.to("admin-room").emit("messagesRead", { ticketId });
        }

        res.status(200).json({
            status: "success",
            message: "Ticket messages retrieved and marked as read",
            data: ticket
        });
    } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({ error: "Server error" });
    }
};

exports.deleteAllTickets = async (req, res) => {
    try {
        await Ticket.deleteMany({});
        res.status(200).json({ success: true, message: "All tickets deleted" });
    } catch (error) {
        console.error("Error deleting all tickets:", error);
        res.status(500).json({ error: "Server error" });
    }
}

// when Admin click on ticket then if that ticket message(send by user) is not been true then we make true
// when User click on ticket then if that ticket message(send by admin) is not been true then we make true
// It's work only when admin or user click on ticket only....
exports.markMessagesAsRead = async (req, res) => {
    try {
        const { ticketId, userId, adminId } = req.body;

        if (!ticketId || (!userId && !adminId)) {
            return res.status(400).json({ success: false, error: "Missing ticketId or userId/adminId" });
        }

        const ticket = await Ticket.findById(ticketId);
        if (!ticket) {
            return res.status(404).json({ success: false, error: "Ticket not found" });
        }

        let messagesUpdated = false;

        if (userId) {
            ticket.messages.forEach((msg) => {
                if (msg.sender === "admin" && !msg.isRead) {
                    msg.isRead = true;
                    messagesUpdated = true;
                }
            });
            ticket.unreadMessages.user = 0;
        }

        if (adminId) {
            ticket.messages.forEach((msg) => {
                if (msg.sender === "user" && !msg.isRead) {
                    msg.isRead = true;
                    messagesUpdated = true;
                }
            });
            ticket.unreadMessages.admin = 0;
        }

        if (messagesUpdated) {
            await ticket.save(); // Ensure the update is persisted
            global.io.to(ticket.userId.toString()).emit("messagesRead", { ticketId });
            global.io.to("admin-room").emit("messagesRead", { ticketId });
        }

        res.status(200).json({ success: true, message: "Messages marked as read" });
    } catch (error) {
        console.error("Error marking messages as read:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
};
