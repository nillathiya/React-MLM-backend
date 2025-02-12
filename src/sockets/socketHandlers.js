module.exports = function (io) {
    const onlineUsers = new Map(); // Track online users
    const onlineAdmins = new Set(); // Track online admins

    io.on("connection", (socket) => {
        console.log("A user connected:", socket.id);

        // User registers to receive messages in their private room
        socket.on("register", (userId) => {
            if (!userId) return;
            socket.join(userId);
            onlineUsers.set(userId, socket.id);
            console.log(`User ${userId} joined their room`);
        });

        // Admin joins the admin room
        socket.on("adminJoin", (adminId) => {
            socket.join("admin-room");
            onlineAdmins.add(adminId);
            console.log("Admin joined the admin room");
        });

        // ✅ Admin sends a message
        socket.on("adminSendMessage", ({ ticketId, userId, text }) => {
            if (!ticketId || !userId || !text) return;

            // Notify the user if online
            io.to(userId).emit("newMessage", { ticketId, sender: "admin", text });

            console.log(`Admin message sent to User ${userId} in Ticket ${ticketId}`);
        });

        // ✅ User sends a message
        socket.on("userSendMessage", ({ ticketId, text, sender, isRead }) => {
            if (!ticketId || !text || !sender) return;

            // Notify admins in the admin room
            io.to("admin-room").emit("newMessage", { ticketId, sender, text, isRead });

            console.log(`User message sent in Ticket ${ticketId}`);
        });


        // socket.on("messagesRead", ({ ticketId, sender }) => {
        //     if (!ticketId || !sender) return;

        //     console.log(`✅ messagesRead event received for ticketId: ${ticketId} from ${sender}`);

        //     // If sender is user, notify the admin
        //     if (sender === "user") {
        //         io.to("admin-room").emit("messagesRead", { ticketId });
        //         console.log(`📢 Emitted messageRead event to admin-room for ticketId: ${ticketId}`);
        //     } 
        //     // If sender is admin, notify the user
        //     else if (sender === "admin") {
        //         io.to(ticketId).emit("messagesRead", { ticketId });
        //         console.log(`📢 Emitted messageRead event to user for ticketId: ${ticketId}`);
        //     }
        // });

        socket.on("seenRequest", ({ ticketId, sender, userId }) => {
            if (!ticketId || !sender) return;
            console.log(`�� SeenRequest event received for ticketId: ${ticketId} from ${sender}`);
            // If sender is admin, notify the user
            if (sender === "admin") {
                io.to(userId).emit("seenRequest", { ticketId });
                console.log(`�� Emitted seenRequest event to user for ticketId: ${ticketId}`);
            }
            // If sender is user, notify the admin
            else if (sender === "user") {
                io.to("admin-room").emit("seenRequest", { ticketId });
                console.log(`�� Emitted seenRequest event to admin-room for ticketId: ${ticketId}`);
            }
        })

        socket.on("seen", ({ ticketId, sender, userId }) => {
            if (!ticketId || !sender) return;
            console.log(`�� Seen event received for ticketId: ${ticketId} from ${sender}`);
            // If sender is admin, notify the user
            if (sender === "admin") {
                io.to(userId).emit("seen", { ticketId });
                console.log(`�� Emitted seen event to user for ticketId: ${ticketId}`);
            }
            // If sender is user, notify the admin
            else if (sender === "user") {
                io.to("admin-room").emit("seen", { ticketId });
                console.log(`�� Emitted seen event to admin-room for ticketId: ${ticketId}`);
            }
        })




        // Notify admins when a new ticket is created
        // socket.on("userCreatedNewTicket", ({ newTicket }) => {
        //     if (!newTicket) return;
        //     io.to("admin-room").emit("newTicketCreated", newTicket);
        // });

        // ✅ Notify admins when a new ticket is created
        //    socket.on("newTicket", (ticket) => {
        //     if (!ticket) return;
        //     io.to("admin-room").emit("newTicketCreated", ticket);
        //     console.log(`New Ticket Created: ${ticket._id}`);
        // });
        socket.on("disconnect", () => {
            console.log("User disconnected:", socket.id);

            // Remove user/admin from online lists
            for (const [userId, socketId] of onlineUsers.entries()) {
                if (socketId === socket.id) {
                    onlineUsers.delete(userId);
                    console.log(`User ${userId} went offline`);
                    break;
                }
            }

            onlineAdmins.forEach((adminId) => {
                if (adminId === socket.id) {
                    onlineAdmins.delete(adminId);
                    console.log(`Admin ${adminId} went offline`);
                }
            });
        });
    });
};
