const mongoose = require("mongoose");

const RecipeSchema = new mongoose.Schema({
  recipe_no: { type: Number, required: true },
  recipe_title: { type: String, required: true },
  recipe_class: [
    {
      cate_no: { type: Number }, //cat4
      situ_no: { type: Number }, //cat2
    },
  ],
  recipe_thumbnail: { type: String, required: true },
  recipe_ingredient: [{ type: String }],
});

module.exports = mongoose.model("Recipe", RecipeSchema);
