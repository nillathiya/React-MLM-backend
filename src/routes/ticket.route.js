const express = require("express");
const router = express.Router();
const ticketController = require("../controllers/ticket.controller.js");


router.post("/create", ticketController.createTicket); // User creates a new ticket

router.post("/message/send", ticketController.sendMessage); // User sends a message in an open ticket

router.post("/user/:userId", ticketController.getUserTickets); // Fetch all tickets for a user

router.post("/all", ticketController.getAllTickets); // Fetch all tickets (admin)

router.post("/message/reply", ticketController.replyMessage); // Admin replies in a ticket

router.post("/status/:ticketId", ticketController.updateTicketStatus); // Admin updates ticket status

router.post("/:ticketId/delete", ticketController.deleteTicket); // Admin deletes a ticket

router.post("/:ticketId/messages", ticketController.getTicketMessages);

router.post("/delete/all", ticketController.deleteAllTickets);

router.post("/mark-read", ticketController.markMessagesAsRead);

module.exports = router;

