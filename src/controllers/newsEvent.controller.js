const { NewsEvent } = require('../models/DB');
const { ApiError } = require('../utils/apiError');
const { ApiResponse } = require('../utils/apiResponse');
const common = require('../helpers/common');

exports.createNewsEvent = async (req, res, next) => {
    try {
        const { title, description, hotlinks, category, tags, eventDate, expiresAt } = req.body;

        if (!req._IS_ADMIN_ACCOUNT) {
            throw new ApiError(403, "Unauthorized access.");
        }

        // Validate required fields
        const requiredFields = ["title", "description", "category"];
        const validationResponse = await common.requestFieldsValidation(requiredFields, req.body);

        if (!validationResponse.status) {
            throw new ApiError(400, `Missing fields: ${validationResponse.missingFields.join(", ")}`);
        }

        // Handle image uploads
        const uploadedImages = req.files?.map((file) => `/uploads/${file.filename}`) || [];

        // Convert JSON strings to arrays if needed
        let parsedHotlinks = [];
        let parsedTags = [];

        try {
            parsedHotlinks = hotlinks ? JSON.parse(hotlinks) : [];
            parsedTags = tags ? JSON.parse(tags) : [];
        } catch (error) {
            throw new ApiError(400, "Invalid JSON format for hotlinks or tags.");
        }

        // Ensure eventDate and expiresAt are valid dates
        const parsedEventDate = eventDate ? new Date(eventDate) : null;
        const parsedExpiresAt = expiresAt ? new Date(expiresAt) : null;

        if (parsedEventDate && isNaN(parsedEventDate.getTime())) {
            throw new ApiError(400, "Invalid eventDate format.");
        }
        if (parsedExpiresAt && isNaN(parsedExpiresAt.getTime())) {
            throw new ApiError(400, "Invalid expiresAt format.");
        }

        // Create the news event
        const newsEvent = new NewsEvent({
            title,
            description,
            images: uploadedImages,
            hotlinks: parsedHotlinks,
            category,
            tags: parsedTags,
            eventDate: parsedEventDate,
            expiresAt: parsedExpiresAt,
            createdBy: req.user._id,
        });

        await newsEvent.save();

        return res.status(201).json(new ApiResponse(201, newsEvent, "News/Event created successfully."));
    } catch (error) {
        next(error);
    }
};


exports.getPublishedNewsEvents = async (req, res, next) => {
    try {
        const { tag, category } = req.body;
        let filter = { published: true };

        if (tag) filter.tags = tag;
        if (category) filter.category = category;

        const newsEvents = await NewsEvent.find(filter).sort({ createdAt: -1 });
        return res.status(200).json(new ApiResponse(200, newsEvents, "News/Event get successfully"))
    } catch (error) {
        next(error)
    }
};

exports.getAllNewsEvents = async (req, res, next) => {
    try {
        const newsEvents = await NewsEvent.find({}).sort({ createdAt: -1 });
        return res.status(200).json(new ApiResponse(200, newsEvents, "News/Event get successfully"))
    } catch (error) {
        next(error)
    }
};


exports.getNewsEventById = async (req, res, next) => {
    try {
        const { id } = req.body;
        const newsEvent = await NewsEvent.findById(id);
        if (!newsEvent)
            throw new ApiError(404, "News/Event not found")

        // Increase view count
        newsEvent.views += 1;
        await newsEvent.save();

        return res.status(200).json(new ApiResponse(200, newsEvent, "News/Event get successfully"))
    } catch (error) {
        next(error)
    }
};


exports.updateNewsEvent = async (req, res, next) => {
    try {
        const { id, hotlinks, tags, ...updateData } = req.body;
        const newsEvent = await NewsEvent.findById(id);
        if (!newsEvent) throw new ApiError(404, "News/Event not found");

        // Parse `hotlinks` and `tags` safely
        if (hotlinks) {
            updateData.hotlinks = JSON.parse(hotlinks);
        }
        if (tags) {
            updateData.tags = JSON.parse(tags);
        }

        // Parse updateImageIndex from the request body
        const updateImageIndices = JSON.parse(req.body.updateImageIndex || "[]");  
        const uploadedImages = [...newsEvent.images];

        if (req.files && req.files.length > 0) {
            req.files.forEach((file, index) => {
                const relativePath = `/uploads/${file.filename}`;
                const updateImageIndex = updateImageIndices[index];

                if (typeof updateImageIndex === "number" && updateImageIndex >= 0 && updateImageIndex < uploadedImages.length) {
                    uploadedImages[updateImageIndex] = relativePath;
                } else {
                    uploadedImages.push(relativePath);
                }
            });
        }

        // Assign updated images back to the newsEvent
        updateData.images = uploadedImages;
        Object.assign(newsEvent, updateData);
        await newsEvent.save();

        return res.status(200).json(new ApiResponse(200, newsEvent, "News/Event updated"));
    } catch (error) {
        next(error);
    }
};


exports.deleteNewsEvent = async (req, res, next) => {
    try {
        const { id } = req.body;
        const newsEvent = await NewsEvent.findByIdAndDelete(id);
        if (!newsEvent) throw new ApiError(404, "News/Event not found");

        return res.status(200).json(new ApiResponse(200, {}, "News/Event Deleted"))
    } catch (error) {
        next(error)
    }
};


exports.togglePublishStatus = async (req, res) => {
    try {
        const { id } = req.body;
        const newsEvent = await NewsEvent.findById(id);
        if (!newsEvent) throw new ApiError(404, "News/Event not found");

        newsEvent.published = !newsEvent.published;
        await newsEvent.save();

        return res.status(200).json(new ApiResponse(200, {}, `News/Event ${newsEvent.published ? "published" : "unpublished"}`))
    } catch (error) {
        next(error)
    }
};