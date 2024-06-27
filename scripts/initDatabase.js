const mongoose = require("mongoose");
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const Seasonal = require("../models/seasonal");
const Recipe = require("../models/recipemeta");

async function connectMongoDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // maxPoolSize: 50, // 최대 연결 풀 크기
      // minPoolSize: 10,  // 최소 연결 풀 크기
      // serverSelectionTimeoutMS: 30000, // 서버 선택 타임아웃 시간 (30초)
      // socketTimeoutMS: 45000, // 소켓 타임아웃 시간 (45초)
      // connectTimeoutMS: 30000 // 연결 타임아웃 시간 (30초)
    });
    console.log("MongoDB에 연결되었습니다.");
  } catch (error) {
    console.error("MongoDB 연결 실패:", error);
    throw error;
  }
}

async function seasonalInit() {
  const dataInsertPromises = [];

  fs.createReadStream("data/seasonal.csv")
    .pipe(csv())
    .on("data", (data) => {
      const processedData = {
        seasonal_name: data["품목명"],
        seasonal_month: parseInt(data["월별"], 10),
        seasonal_cate: data["품목분류"],
        seasonal_area: data["주요 산지"],
        seasonal_prod_time: data["생산시기"],
        seasonal_kind: data["주요 품종"],
        seasonal_efficacy: data["효능"],
        seasonal_buytip: data["구입요령"],
        seasonal_cooktip: data["조리법"],
        seasonal_preptip: data["손질요령"],
        seasonal_detail_url: data["상세페이지 URL"],
        seasonal_image_url: data["이미지 URL"],
      };

      dataInsertPromises.push(
        Seasonal.findOne({ seasonal_name: data["품목명"] })
          .then((existingData) => {
            if (!existingData) {
              const seasonal = new Seasonal(processedData);
              return seasonal.save().then(() => {
                console.log(`데이터 삽입 성공: ${data["품목명"]}`);
              });
            } else {
              console.log(`중복된 데이터 존재: ${data["품목명"]}`);
            }
          })
          .catch((error) => {
            console.error(`데이터 처리 실패: ${data["품목명"]}`, error);
          })
      );
    })
    .on("end", async () => {
      try {
        await Promise.all(dataInsertPromises);
        console.log("CSV 파일의 모든 데이터가 MongoDB에 삽입되었습니다.");
      } catch (error) {
        console.error("데이터 삽입 중 오류 발생:", error);
      }
    });
}

async function recipesInit() {
  const jsonFilePath = path.join(__dirname, "../data/recipes_metadata.json");

  fs.readFile(jsonFilePath, "utf8", (err, data) => {
    if (err) {
      console.error("JSON 파일을 읽는 중 오류 발생:", err);
      return;
    }

    const recipes = JSON.parse(data);
    const dataInsertPromises = recipes.map((recipe) => {
      return Recipe.findOne({ recipe_no: recipe.recipe_no })
        .then((existingData) => {
          if (!existingData) {
            const newRecipe = new Recipe(recipe);
            return newRecipe.save().then(() => {
              console.log(`레시피 삽입 성공: ${recipe.recipe_title}`);
            });
          } else {
            console.log(`중복된 레시피 존재: ${recipe.recipe_title}`);
          }
        })
        .catch((error) => {
          console.error(`레시피 처리 실패: ${recipe.recipe_title}`, error);
        });
    });

    Promise.all(dataInsertPromises)
      .then(() => {
        console.log("JSON 파일의 모든 레시피가 MongoDB에 삽입되었습니다.");
      })
      .catch((error) => {
        console.error("레시피 삽입 중 오류 발생:", error);
      });
  });
}

async function initDatabase() {
  try {
    await connectMongoDB(); 
    await seasonalInit();
    await recipesInit();
  } catch (error) {
    console.error("초기화 중 오류 발생:", error);
  }
}

module.exports = { connectMongoDB, initDatabase };