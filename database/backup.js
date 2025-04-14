const fs = require('fs');
const path = require('path');
const connectDB = require('../src/config/db'); // Ensure this path is correct
const DB = require('../src/models/DB'); // Import the DB object
const mongoose = require('mongoose'); // Ensure mongoose is installed and used

async function backupDatabase() {
    try {
        await connectDB(); // Connect to the database
        console.log('Connected to the database successfully!');
        console.log('Starting database backup...');
        const backupData = {};

        // Iterate over all collections (models) in DB
        for (const collectionName in DB) {
            if (Object.hasOwnProperty.call(DB, collectionName)) {
                console.log(`Backing up collection: ${collectionName}`);
                try {
                    // Fetch all documents from the collection
                    const data = await DB[collectionName].find().lean(); // Use lean() for plain JavaScript objects

                    // Get the schema of the current model
                    const schema = DB[collectionName].schema;

                    // Transform the data based on the schema
                    const transformedData = data.map(doc => {
                        const transformedDoc = {};

                        for (const key in doc) {
                            if (Object.hasOwnProperty.call(doc, key)) {
                                const fieldType = schema.path(key)?.instance;

                                // Check if the field is an ObjectId
                                if (fieldType === 'ObjectId') {
                                    transformedDoc[key] = doc[key] ? { $oid: doc[key].toString() } : null;
                                } else if (fieldType === 'Date') {
                                    // Format Date fields as ISO strings
                                    transformedDoc[key] = doc[key] ? doc[key].toISOString() : null;
                                } else {
                                    transformedDoc[key] = doc[key];
                                }
                            }
                        }

                        return transformedDoc;
                    });

                    backupData[collectionName] = transformedData;
                } catch (err) {
                    console.error(`Error fetching data from ${collectionName}:`, err);
                }
            }
        }

        // Write the backup data to a JSON file
        const backupPath = path.join(__dirname, 'backup.json');
        console.log(`Writing backup to ${backupPath}...`);
        fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));

        console.log('Database backup completed successfully!');
    } catch (error) {
        console.error('Error during database backup:', error);
    }
}

backupDatabase();