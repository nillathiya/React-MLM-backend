// src/config/exportDB.js
const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const db = require('../models/DB'); // Import your existing DB configuration

// Configuration
const outputDir = path.join(__dirname, '../../mongo_backup'); // Fixed directory that will be overwritten

async function exportAllCollections(options = {}) {
  const {
    specificCollections = null,
  } = options;

  try {
    // Ensure we're connected (your connectDB is already called in DB.js)
    if (mongoose.connection.readyState === 0) {
      throw new Error('Database connection not established');
    }

    // Remove existing directory and recreate it
    await fs.rm(outputDir, { recursive: true, force: true });
    await fs.mkdir(outputDir, { recursive: true });

    // Determine which collections to export
    const collectionsToExport = specificCollections 
      ? specificCollections.filter(col => db[col]) 
      : Object.keys(db);

    // Export each collection
    for (const collectionName of collectionsToExport) {
      try {
        const Model = db[collectionName];
        const documents = await Model.find({}).lean();
        
        const filePath = path.join(outputDir, `${collectionName}.json`);
        await fs.writeFile(
          filePath,
          JSON.stringify(documents, null, 2)
        );
        console.log(`Exported ${collectionName} to ${filePath} (${documents.length} documents)`);
      } catch (error) {
        console.error(`Error exporting ${collectionName}:`, error);
      }
    }

    return {
      success: true,
      outputDir,
      exportedCollections: collectionsToExport
    };

  } catch (error) {
    console.error('Export failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Function to export with batch processing
async function exportWithBatch(options = {}) {
  const {
    batchSize = 1000,
    specificCollections = null,
  } = options;

  try {
    if (mongoose.connection.readyState === 0) {
      throw new Error('Database connection not established');
    }

    // Remove existing directory and recreate it
    await fs.rm(outputDir, { recursive: true, force: true });
    await fs.mkdir(outputDir, { recursive: true });

    const collectionsToExport = specificCollections 
      ? specificCollections.filter(col => db[col]) 
      : Object.keys(db);

    for (const collectionName of collectionsToExport) {
      try {
        const Model = db[collectionName];
        let skip = 0;
        let batchNum = 0;

        while (true) {
          const documents = await Model.find({})
            .skip(skip)
            .limit(batchSize)
            .lean();

          if (documents.length === 0) break;

          const filePath = path.join(outputDir, `${collectionName}_batch${batchNum}.json`);
          await fs.writeFile(
            filePath,
            JSON.stringify(documents, null, 2)
          );
          console.log(`Exported ${collectionName} batch ${batchNum} to ${filePath} (${documents.length} documents)`);

          skip += batchSize;
          batchNum++;
        }
      } catch (error) {
        console.error(`Error exporting ${collectionName}:`, error);
      }
    }

    return {
      success: true,
      outputDir,
      exportedCollections: collectionsToExport
    };

  } catch (error) {
    console.error('Export failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
exportAllCollections();

module.exports = {
  exportAllCollections,
  exportWithBatch
};