const multer = require('multer');
const fs = require('fs');
const path = require('path');
const uuid = require('uuid'); // Add a unique ID for file names
const dateUtils = require('../helpers/dateUtils');
const { ApiError } = require('../utils/apiError');

// Configuration
const uploadFolder = process.env.UPLOAD_FOLDER || path.resolve('./public/uploads');
const maxFileSize = process.env.MAX_FILE_SIZE || 10 * 1024 * 1024; // Default to 10MB

// Ensure the upload folder exists
const ensureUploadFolderExists = () => {
    if (!fs.existsSync(uploadFolder)) {
        fs.mkdirSync(uploadFolder, { recursive: true });
    }
};

// Define storage configuration for multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        ensureUploadFolderExists();
        cb(null, uploadFolder);
    },
    filename: (req, file, cb) => {
        const readableDate = dateUtils.getCurrentDate();
        const uniqueFilename = `${readableDate}_${uuid.v4()}_${file.originalname}`;
        cb(null, uniqueFilename);
    },
});

// Define multer upload with limits and file type filter
const upload = multer({
    storage: storage,
    limits: {
        fileSize: maxFileSize, // Configurable max file size
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            return cb(new Error('Invalid file type. Only images are allowed.'));
        }
    },
});

const handleFileUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return next(new ApiError(400, err.message));
    }
    if (err instanceof ApiError) {
        return next(err);
    }
    next(err);
};

module.exports = { upload, handleFileUploadError };
