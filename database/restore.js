const fs = require('fs');
const path = require('path');
const connectDB = require('../src/config/db'); // Ensure this path is correct
const DB = require('../src/models/DB'); // Import the DB object
const mongoose = require('mongoose'); // Ensure mongoose is installed and used

async function restoreDatabase() {
    try {
        await connectDB(); // Connect to the database
        console.log('Connected to the database successfully!');
        console.log('Starting database restore...');

        // Read the backup file
        const backupPath = path.join(__dirname, 'backupfresh.json');
        if (!fs.existsSync(backupPath)) {
            throw new Error('Backup file not found!');
        }

        const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));

        // Iterate over all collections in the backup
        for (const collectionName in backupData) {
            if (Object.hasOwnProperty.call(backupData, collectionName)) {
                console.log(`Restoring collection: ${collectionName}`);
                try {
                    const model = DB[collectionName];
                    if (!model) {
                        console.warn(`Model for collection "${collectionName}" not found in DB.js. Skipping...`);
                        continue;
                    }

                    // Transform the data back to the correct format
                    const transformedData = backupData[collectionName].map(doc => {
                        const transformedDoc = {};

                        for (const key in doc) {
                            if (Object.hasOwnProperty.call(doc, key)) {
                                const fieldType = model.schema.path(key)?.instance;

                                // Check if the field is an ObjectId
                                if (fieldType === 'ObjectId' && doc[key]?.$oid) {
                                    transformedDoc[key] = new mongoose.Types.ObjectId(doc[key].$oid);
                                } else if (fieldType === 'Date' && doc[key]) {
                                    // Parse Date fields
                                    transformedDoc[key] = new Date(doc[key]);
                                } else {
                                    transformedDoc[key] = doc[key];
                                }
                            }
                        }

                        return transformedDoc;
                    });

                    // Clear the collection and insert the restored data
                    await model.deleteMany({});
                    await model.insertMany(transformedData);

                    console.log(`Restored ${transformedData.length} documents into "${collectionName}"`);
                } catch (err) {
                    console.error(`Error restoring collection "${collectionName}":`, err);
                }
            }
        }

        console.log('Database restore completed successfully!');
    } catch (error) {
        console.error('Error during database restore:', error);
    }
}

restoreDatabase();