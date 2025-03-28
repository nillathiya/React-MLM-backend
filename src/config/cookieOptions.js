exports.userCookieOptions = {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"? true : false,
    path: "/",
};


exports.adminCookieOptions = {
    httpOnly: false,
    sameSite: "lax", 
    secure: process.env.NODE_ENV === "production" ? true : false,
    path: "/",
}