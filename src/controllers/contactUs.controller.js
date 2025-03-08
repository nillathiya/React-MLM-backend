const { ContactUs } = require('../models/DB');
const { ApiError } = require('../utils/apiError');
const { ApiResponse } = require('../utils/apiResponse');
const common = require('../helpers/common');

exports.getAllContactMessage = async (req, res, next) => {
    try {
        const messages = await ContactUs.find({}).sort({ _id: -1 }); 
        return res.status(200).json(new ApiResponse(200, messages, "Get All Contact Messages"));
    } catch (error) {
        next(error);
    }
};

exports.createContactMessage = async (req, res, next) => {
    const { name, email, mobile, subject, message } = req.body;
    try {
        // Validate required fields
        const requiredFields = ["name", "email", "mobile", "subject", "message"];
        const validationResult = await common.requestFieldsValidation(requiredFields, req.body);

        if (!validationResult.status) {
            throw new ApiError(400, `Missing fields: ${validationResult.missingFields.join(", ")}`)
        }

        const newMessage = new ContactUs({ name, email, mobile, subject, message });
        await newMessage.save();
        return res.status(200).json(new ApiResponse(200, {}, "Message sent successfully"));
    } catch (error) {
        next(error);
    }
}

exports.changeContactMesasgeStatus = async (req, res, next) => {
    try {
        const { id,status } = req.body;

        // Find the message by ID
        const message = await ContactUs.findById(id);
        if (!message) {
            throw new ApiError(404, "Message not found");
        }

        // Update the message status
        const updatedMessage = await ContactUs.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );

        return res.status(200).json(new ApiResponse(200, updatedMessage, "Message status updated successfully"));
    } catch (error) {
        next(error);
    }
};
