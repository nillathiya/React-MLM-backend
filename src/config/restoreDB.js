// src/config/restoreDB.js
const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const db = require('../models/DB');

const backupDir = path.join(__dirname, '../../mongo_backup');

async function restoreCollections(options = {}) {
  const {
    specificCollections = null,
    skipDuplicates = true, // Option to skip duplicate key errors
  } = options;

  try {
    if (mongoose.connection.readyState === 0) {
      throw new Error('Database connection not established');
    }

    try {
      await fs.access(backupDir);
    } catch (error) {
      throw new Error(`Backup directory ${backupDir} not found`);
    }

    const files = await fs.readdir(backupDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));

    // Map collections to their exact file names (no partial matching)
    const collectionsToRestore = specificCollections 
      ? specificCollections.filter(col => db[col] && jsonFiles.includes(`${col}.json`))
      : Object.keys(db).filter(col => jsonFiles.includes(`${col}.json`));

    if (collectionsToRestore.length === 0) {
      throw new Error('No matching collections found in backup');
    }

    for (const collectionName of collectionsToRestore) {
      try {
        const Model = db[collectionName];
        
        // Drop existing collection
        await Model.collection.drop()
          .catch(err => {
            if (err.codeName !== 'NamespaceNotFound') throw err;
          });

        const filePath = path.join(backupDir, `${collectionName}.json`);
        const data = await fs.readFile(filePath, 'utf8');
        const documents = JSON.parse(data);

        if (documents.length > 0) {
          const batchSize = 1000;
          for (let i = 0; i < documents.length; i += batchSize) {
            const batch = documents.slice(i, i + batchSize);
            try {
              await Model.insertMany(batch, { 
                ordered: false, // Continue on errors
                continueOnError: skipDuplicates // Skip duplicates if true
              });
            } catch (error) {
              if (error.code === 11000 && skipDuplicates) {
                console.log(`Skipped ${error.writeErrors.length} duplicate entries in ${collectionName}`);
              } else {
                throw error;
              }
            }
          }
          console.log(`Restored ${collectionName} from ${collectionName}.json (${documents.length} documents)`);
        } else {
          console.log(`No documents to restore for ${collectionName} from ${collectionName}.json`);
        }

        // Handle batch files if they exist
        const batchFiles = jsonFiles.filter(file => 
          file.startsWith(`${collectionName}_batch`) && file.endsWith('.json')
        );
        
        for (const batchFile of batchFiles) {
          const batchFilePath = path.join(backupDir, batchFile);
          const batchData = await fs.readFile(batchFilePath, 'utf8');
          const batchDocs = JSON.parse(batchData);

          if (batchDocs.length > 0) {
            for (let i = 0; i < batchDocs.length; i += batchSize) {
              const batch = batchDocs.slice(i, i + batchSize);
              try {
                await Model.insertMany(batch, { 
                  ordered: false,
                  continueOnError: skipDuplicates
                });
              } catch (error) {
                if (error.code === 11000 && skipDuplicates) {
                  console.log(`Skipped ${error.writeErrors.length} duplicate entries in ${collectionName} from ${batchFile}`);
                } else {
                  throw error;
                }
              }
            }
            console.log(`Restored ${collectionName} from ${batchFile} (${batchDocs.length} documents)`);
          }
        }
      } catch (error) {
        console.error(`Error restoring ${collectionName}:`, error);
      }
    }

    return {
      success: true,
      restoredCollections: collectionsToRestore,
      backupDir
    };

  } catch (error) {
    console.error('Restore failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
restoreCollections();
module.exports = {
  restoreCollections
};