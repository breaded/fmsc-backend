const mongoose = require('mongoose');

const carrierSchema = new mongoose.Schema({
  created_dt: Date,
  data_source_modified_dt: Date,
  entity_type: String,
  operating_status: String,
  legal_name: String,
  dba_name: String,
  physical_address: String,
  phone: String,
  usdot_number: Number,
  mc_mx_ff_number: String,
  power_units: Number,
  out_of_service_date: Date,
});

module.exports = mongoose.model('Carrier', carrierSchema);
