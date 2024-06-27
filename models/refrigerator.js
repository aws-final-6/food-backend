const mongoose = require("mongoose");

const IngredientSchema = new mongoose.Schema({
  ing_name: { type: String, required: true },
  ing_exdate: String, // 유통기한
  ing_indate: String, // 냉장고에 재료를 넣은(실제로) 날짜
  color: String,
  ref_no: String,
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    default: () => new mongoose.Types.ObjectId(),
  },
});

const RefrigeratorSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  ref_1: {
    ingredients: [IngredientSchema],
    title: String,
    refType: Number,
  },
  ref_2: {
    ingredients: [IngredientSchema],
    title: String,
    refType: Number,
  },
  ref_3: {
    ingredients: [IngredientSchema],
    title: String,
    refType: Number,
  },
  ref_4: {
    ingredients: [IngredientSchema],
    title: String,
    refType: Number,
  },
});

module.exports = mongoose.model("Refrigerator", RefrigeratorSchema);
