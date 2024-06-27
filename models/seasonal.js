const mongoose = require("mongoose");

const SeasonalSchema = new mongoose.Schema({
  seasonal_name: String,
  seasonal_month: Number,
  seasonal_cate: String,
  seasonal_area: String,
  seasonal_prod_time: String,
  seasonal_kind: String,
  seasonal_efficacy: String,
  seasonal_buytip: String,
  seasonal_cooktip: String,
  seasonal_preptip: String,
  seasonal_detail_url: String,
  seasonal_image_url: String,
});

module.exports = mongoose.model("Seasonal", SeasonalSchema);
