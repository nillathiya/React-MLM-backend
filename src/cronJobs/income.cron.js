const mongoose = require("mongoose");
const Income = require("../models/incomeModel"); // Income schema
const Transaction = require("../models/transactionModel"); // Transaction schema

const royalityIncome = async () => {
  try {
    // Fetch all eligible income records
    const eligibleIncomes = await Income.find({ source: "royality" });

    if (eligibleIncomes.length === 0) return;

    // Prepare transactions array
    const transactions = eligibleIncomes.map((userDetails) => ({
      tx_u_code: userDetails.ben_from,
      u_code: userDetails.u_code,
      tx_type: "income",
      debit_credit: "credit",
      source: "royality",
      wallet_type: "main_wallet",
      amount: userDetails.amount,
      date: userDetails.date,
      status: userDetails.status,
      distribute_per: userDetails.VPP,
      user_prsnt: userDetails.package,
    }));

    // Bulk insert into transactions collection
    await Transaction.insertMany(transactions);

    console.log("Royality income transactions inserted successfully.");
  } catch (error) {
    console.error("Error in royalityIncome:", error);
  }
};

module.exports = { royalityIncome };
