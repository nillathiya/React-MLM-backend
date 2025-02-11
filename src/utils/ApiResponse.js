//class object created when constructor is called
class ApiResponse {
    constructor(statusCode, data, message = "Success") {
      this.statusCode = statusCode;
      this.data = data;
      this.message = message;
      this.success = statusCode < 400;
    }
  }
  module.exports = { ApiResponse };
  
  // const data = {
  //   krish: "lathi",
  // };
  // return res
  //   .status(201)
  //   .json(new ApiResponse(200, data, "User registered Successfully"));
  