const dateUtils = {}

dateUtils.getCurrentDate = () => {
    let today = new Date();
    let dd = today.getDate();
    let mm = today.getMonth() + 1;
    let yyyy = today.getFullYear();
    if (dd < 10) {
        dd = "0" + dd;
    }
    if (mm < 10) {
        mm = "0" + mm;
    }
    today = yyyy + "-" + mm + "-" + dd;
    return today;
};

dateUtils.formatDate = (date, format = 'YYYY-MM-DD HH:mm:ss') => {
    return moment(date).format(format);
},

dateUtils.getCurrentTimestamp = (format = 'YYYY-MM-DD HH:mm:ss') => {
        return moment().format(format);
},

dateUtils.fromUnixTimestamp = (timestamp, format = 'YYYY-MM-DD HH:mm:ss') => {
        return moment.unix(timestamp).format(format);
},

dateUtils.toISOString=(date) => {
    return moment(date).toISOString();
}


module.exports = dateUtils;
