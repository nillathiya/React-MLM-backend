const axios = require("axios");

const transaction = {};

transaction.verify = async (txHash, amount, userAddress) => {
    try {
        const apiUrl = "https://web3check.companywebsite.in/verifybsc";
        const requestData = {
            api_key: process.env.WEB3_API_KEY, 
            hash: txHash,
            from: userAddress,
            payment_amount: amount,
            token: "0x7B5E2af1a89a1a23D8031077a24A2454D81b3fbd",
            httpprovider: "https://data-seed-prebsc-1-s1.binance.org:8545/",
        };

        console.log(`Verifying transaction ${txHash} for user ${userAddress}`);

        // Send verification request
        const response = await axios.post(apiUrl, requestData, {
            headers: { "Content-Type": "application/json" },
        });

        const result = response.data;
        return result.status === "true" ? 1 : 0;
    } catch (error) {
        console.error("Error in verify transaction:", error.message);
        return 0;
    }
};

module.exports = transaction;
