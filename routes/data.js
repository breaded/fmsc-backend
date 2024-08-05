const express = require('express');
const router = express.Router();
const Carrier = require('../models/Carriers');
const { google } = require('googleapis');
const credentials = require('../key.json');

// Fetch data from Google Sheets and save it to the database
async function fetchDataAndSave() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    const authClient = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    const spreadsheetId = process.env.SPREADSHEET_ID;
    const range = 'FMSCA_records (2)!A:Z';

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    console.log('API Response:', response.data);

    const rows = response.data.values;
    if (rows.length) {
      const headers = rows[0];
      const dataRows = rows.slice(1);

      for (const row of dataRows) {
        const carrierData = headers.reduce((obj, header, index) => {
          obj[header.toLowerCase().replace(/ /g, '_')] = row[index];
          return obj;
        }, {});

        // Convert date strings to Date objects
        if (carrierData.created_dt) {
          carrierData.created_dt = new Date(carrierData.created_dt);
        }
        if (carrierData.modified_dt) {
          carrierData.modified_dt = new Date(carrierData.modified_dt);
        }
        if (carrierData.out_of_service_date) {
          carrierData.out_of_service_date = new Date(carrierData.out_of_service_date);
        }

        const carrier = new Carrier(carrierData);
        await carrier.save();
      }
    }
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
}

// Fetch Google Sheets data for troubleshooting
router.get('/fetch-sheets-data', async (req, res) => {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    const authClient = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    const spreadsheetId = process.env.SPREADSHEET_ID;
    const range = 'FMSCA_records (2)!A:Z';

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    res.json(response.data.values);
  } catch (error) {
    res.status(500).send('Error fetching data from Google Sheets');
  }
});

// Fetch paginated carrier data with filters
router.get('/data', async (req, res) => {
  try {
    const { page = 1, limit = 100, filters = '{}' } = req.query;
    const parsedFilters = JSON.parse(filters);

    let query = {};
    Object.keys(parsedFilters).forEach((key) => {
      query[key] = { $regex: parsedFilters[key], $options: 'i' };
    });

    const carriers = await Carrier.find(query)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Carrier.countDocuments(query);

    res.json({ data: carriers, total });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

router.get('/data/:id', async (req, res) => {
  try {
    const carrier = await Carrier.findById(req.params.id);
    if (!carrier) {
      return res.status(404).send('Carrier not found');
    }
    res.json(carrier);
  } catch (err) {
    res.status(500).send('Error fetching carrier details');
  }
});

// Endpoint to trigger data fetch and save
router.get('/update-data', async (req, res) => {
  try {
    await fetchDataAndSave();
    res.json({ message: 'Data updated successfully' });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

module.exports = router;
