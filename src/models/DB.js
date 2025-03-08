const db = {};

const User = require('./User');
const Ticket = require('./Ticket');
const AdminUser = require('./AdminUser');
const FundTransaction = require('./FundTransaction');
const Wallet = require('./Wallet');
const Transaction = require('./Transaction');
const IncomeTransaction = require('./IncomeTransaction');
const WalletSettings = require('./WalletSettings');
const Orders = require('./Orders');
const PinDetail = require('./PinDetail');
const AdminSettings = require('./AdminSettings');
const RankSettings = require('./RankSettings');
const Plan=require('./Plan');
const NewsEvent=require('./NewsEvent');

db.User = User;
db.Ticket = Ticket;
db.AdminUser = AdminUser;
db.FundTransaction = FundTransaction;
db.Wallet = Wallet;
db.Transaction = Transaction;
db.IncomeTransaction = IncomeTransaction;
db.WalletSettings = WalletSettings;
db.Orders = Orders;
db.PinDetail = PinDetail;
db.AdminSettings = AdminSettings;
db.RankSettings = RankSettings;
db.Plan=Plan;
db.NewsEvent=NewsEvent;

// For the first time when tables are empty
for (let collectionname in db) {
    // It's okay to call createCollection() if you need to ensure the collection exists with specific options.
    db[collectionname].createCollection().catch(err => {
        console.error(`Error creating collection ${collectionname}:`, err);
    });
}

module.exports = db;
