class ApiError extends Error {
    constructor(statusCode, message = "Something went wrong", errors = []) {
        console.log("statusCode",statusCode)
        super(message);
        this.statusCode = statusCode;
        this.data = null;
        this.success = false;
        this.errors = errors;
    }
}
module.exports={ ApiError };