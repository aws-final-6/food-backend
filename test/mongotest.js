const mongoose = require('mongoose');
const { performance } = require('perf_hooks');
const Recipe = require('../models/recipemeta');
const Seasonal = require('../models/seasonal');

async function runMongoTests() {
  await mongoose.connect('mongodb://mongodb:27017/mlrDB', { useNewUrlParser: true, useUnifiedTopology: true });

  // Test 1: 레시피 조회 테스트
  const startRead = performance.now();
  const recipe = await Recipe.findOne({ recipe_no: 7025116 });
  const endRead = performance.now();
  if (recipe) {
    console.log(`MongoDB 단순 조회 시간: ${endRead - startRead} ms, 레시피 조회 결과: ${JSON.stringify(recipe)}`);
  } else {
    console.log(`MongoDB 단순 조회 시간: ${endRead - startRead} ms, 레시피를 찾을 수 없습니다.`);
  }

  // Test 2: 제철 농산물 조회 테스트
  const currentMonth = new Date().getMonth() + 1;
  const startSeasonal = performance.now();
  const seasonalFoods = await Seasonal.find({ seasonal_month: currentMonth }, 'seasonal_name seasonal_image_url -_id').lean();
  const endSeasonal = performance.now();
  if (seasonalFoods.length > 0) {
    console.log(`MongoDB 제철 농산물 조회 시간: ${endSeasonal - startSeasonal} ms, 조회 결과: ${JSON.stringify(seasonalFoods)}`);
  } else {
    console.log(`MongoDB 제철 농산물 조회 시간: ${endSeasonal - startSeasonal} ms, 제철 농산물을 찾을 수 없습니다.`);
  }

  await mongoose.disconnect();
}

runMongoTests().catch(console.error);
