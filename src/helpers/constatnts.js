exports.API_KEY=process.env.API_KEY;
exports.DEFAULT_BTC_ADDRESS="15pTMWP4xWkaCmQMYfXdsRKYNW7XtAaKx8";
exports.DEFAULT_ITEMS_PER_PAGE = 10;
exports.DEFAULT_CURRENT_PAGE = 1;

exports.PASSWORD_REGEX = /^[A-Za-z0-9]{8,16}$/;

exports.ERROR_MESSAGES = {
    INVALID_PASSWORD: "Password must be 8-16 characters long and contain only letters and numbers.",
};
