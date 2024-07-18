const express = require("express");
const router = express.Router();
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const moment = require("moment-timezone");

const pool = require("../scripts/connector");
const { errLog, infoLog, successLog } = require("../utils/logUtils");
require("dotenv").config();

router.use(express.json());

// BaseUrl : /recipe

// .env bodydata
const bodydata = {
  uri: process.env.BODYDATA_URI,
  filename: process.env.BODYDATA_FILENAME,
};

// RECIPE_01 : 최신순 20개 가져오기
router.get("/getRecentList", async (req, res) => {
  infoLog("RECIPE_01", req.body);
  try {
    // 1. recipe_id 기준 20개 SELECT
    const [recentRecipes] = await pool.query(
      "SELECT recipe_id, recipe_title, recipe_thumbnail FROM Recipe ORDER BY recipe_id DESC LIMIT 20"
    );

    // 2. 클라이언트 전달
    successLog("RECIPE_01");
    res.status(200).json({ recipes: recentRecipes });
  } catch (err) {
    errLog("RECIPE_01", 500, "Internal Server Error", {
      error: err.message,
    });
    res.status(500).json({
      message:
        "최신 레시피 목록을 불러오는데에 실패했습니다. 다시 시도해주세요.",
    });
  }
});

// RECIPE_02 : 현재 월 기준 제철농산물 레시피 가져오기
router.get("/getSeasonalList", async (req, res) => {
  infoLog("RECIPE_02", req.body);
  try {
    // 1. 현재 날짜 기준 월 1~12로 가져오기, timezone 고려
    const currentMonth = moment().tz("Asia/Seoul").month() + 1;

    // 2. 현재 월에 해당하는 제철 농산물 이름 배열로 받아오기
    const [findSeasonalFoodName] = await pool.query(
      "SELECT seasonal_name, seasonal_image FROM Seasonal WHERE seasonal_month = ? ORDER BY RAND()",
      [currentMonth]
    );

    // 3. 결과를 클라이언트에게 응답으로 보내기
    successLog("RECIPE_02");
    res.status(200).json({ seasonal_list: findSeasonalFoodName });
  } catch (err) {
    errLog("RECIPE_02", 500, "Internal Server Error", {
      error: err.message,
    });
    res.status(500).json({
      message:
        "제철 농산물 레시피 목록을 불러오는데에 실패했습니다. 다시 시도해주세요.",
    });
  }
});

// RECIPE_03 : 선호도 태그 둘 다 만족하는 레시피 가져오기
router.post("/getPreferList", async (req, res) => {
  infoLog("RECIPE_03", req.body);
  const { user_id } = req.body;

  try {
    // 1. User 테이블에서 user_id로 cate_no와 situ_no 값 가져오기
    const [getUserPrefer] = await pool.query(
      "SELECT cate_no, situ_no FROM MyPage WHERE user_id = ? ",
      [user_id]
    );

    // 1-1. 선호도 정보 없거나 못가져온 경우
    if (
      getUserPrefer.length === 0 ||
      getUserPrefer[0].cate_no === null ||
      getUserPrefer[0].situ_no === null
    ) {
      errLog("RECIPE_03", 204, "No Content", {
        user_id: user_id,
        message: "선호도 정보가 없습니다.",
      });
      return res.status(204).json({ message: "선호도 정보가 없습니다." });
    }

    // 2. 두 선호도 모두 만족하는 레시피 목록 SELECT
    const [queryRes] = await pool.query(
      "SELECT recipe_id, recipe_title, recipe_thumbnail FROM Recipe WHERE cate_no = ? AND situ_no = ? ORDER BY RAND() LIMIT 20",
      [getUserPrefer[0].cate_no, getUserPrefer[0].situ_no]
    );

    // 3. 결과를 클라이언트로 전달
    const result = {
      prefer_list: queryRes.map((recipe) => ({
        recipe_id: recipe.recipe_id,
        recipe_title: recipe.recipe_title,
        recipe_thumbnail: recipe.recipe_thumbnail,
      })),
    };
    successLog("RECIPE_03");
    res.status(200).json(result);
  } catch (err) {
    errLog("RECIPE_03", 500, "Internal Server Error", {
      error: err.message,
    });
    return res.status(500).json({
      message:
        "추천 레시피 목록을 불러오는데에 실패했습니다. 다시 시도해주세요.",
    });
  }
});

// RECIPE_04 : 선호 cate만 만족하는 레시피 리스트 가져오기
router.post("/getCateList", async (req, res) => {
  infoLog("RECIPE_04", req.body);
  const { cate_no } = req.body;

  // 0. 입력 데이터 체크
  if (!cate_no || typeof cate_no !== "number") {
    errLog("RECIPE_04", 400, "Bad Request", {
      cate_no: cate_no,
      message: "잘못된 입력 데이터입니다.",
    });
    return res.status(400).json({ message: "잘못된 입력 데이터입니다." });
  }

  try {
    // 1. 만족하는 레시피 찾기 (무작위로 최대 20개)
    const [queryRes] = await pool.query(
      "SELECT recipe_id, recipe_title, recipe_thumbnail FROM Recipe WHERE cate_no = ? ORDER BY RAND() LIMIT 20",
      [cate_no]
    );

    // 2. 결과가 없는 경우 예외 처리
    if (queryRes.length === 0) {
      errLog("RECIPE_04", 204, "No Content", {
        cate_no: cate_no,
        message: "해당 카테고리에 대한 레시피가 없습니다.",
      });
      return res
        .status(204)
        .json({ message: "해당 카테고리에 대한 레시피가 없습니다." });
    }

    // 3. 결과를 클라이언트로 전달
    const result = {
      cate_list: queryRes.map((recipe) => ({
        recipe_id: recipe.recipe_id,
        recipe_title: recipe.recipe_title,
        recipe_thumbnail: recipe.recipe_thumbnail,
      })),
    };

    successLog("RECIPE_04");
    res.status(200).json(result);
  } catch (err) {
    errLog("RECIPE_04", 500, "Internal Server Error", {
      error: err.message,
    });
    return res.status(500).json({
      message:
        "추천 레시피 목록을 불러오는데에 실패했습니다. 다시 시도해주세요.",
    });
  }
});

// RECIPE_05 : 선호 situ만 만족하는 레시피 리스트 가져오기
router.post("/getSituList", async (req, res) => {
  infoLog("RECIPE_05", req.body);
  const { situ_no } = req.body;

  // 0. 입력 데이터 체크
  if (!situ_no || typeof situ_no !== "number") {
    errLog("RECIPE_05", 400, "Bad Request", {
      situ_no: situ_no,
      message: "잘못된 입력 데이터입니다.",
    });
    return res.status(400).json({ message: "잘못된 입력 데이터입니다." });
  }

  try {
    // 1. 만족하는 레시피 찾기
    const [queryRes] = await pool.query(
      "SELECT recipe_id, recipe_title, recipe_thumbnail FROM Recipe WHERE situ_no = ? ORDER BY RAND() LIMIT 20",
      [situ_no]
    );

    // 2. 결과가 없는 경우 예외 처리
    if (queryRes.length === 0) {
      errLog("RECIPE_05", 204, "No Content", {
        situ_no: situ_no,
        message: "해당 카테고리에 대한 레시피가 없습니다.",
      });
      return res
        .status(204)
        .json({ message: "해당 카테고리에 대한 레시피가 없습니다." });
    }

    // 3. 결과를 클라이언트로 전달
    const result = {
      situ_list: queryRes.map((recipe) => ({
        recipe_id: recipe.recipe_id,
        recipe_title: recipe.recipe_title,
        recipe_thumbnail: recipe.recipe_thumbnail,
      })),
    };

    successLog("RECIPE_05");
    res.status(200).json(result);
  } catch (err) {
    errLog("RECIPE_05", 500, "Internal Server Error", {
      error: err.message,
    });
    return res.status(500).json({
      message:
        "추천 레시피 목록을 불러오는데에 실패했습니다. 다시 시도해주세요.",
    });
  }
});

// RECIPE_06 : 특정 레시피 body 가져오기
router.get("/getRecipe/:id", async (req, res) => {
  infoLog("RECIPE_06", req.body);
  // 0-1. 문자열을 JSON 배열로 변환하는 함수
  const convertToJSONArray = (str) => {
    return str.replace(/\(/g, "[").replace(/\)/g, "]").replace(/'/g, '"');
  };

  // 0-2. 재료 배열을 변환하는 함수
  const transformIngredients = (ingredients) => {
    return ingredients.map(([ingredient, amount]) => ({ ingredient, amount }));
  };

  // 0-3. 레시피 배열을 변환하는 함수
  const transformRecipe = (recipes) => {
    return recipes.map(([step, image]) => ({ step, image }));
  };

  try {
    // 1. 파라미터로 받은 id값 정수형태로 변환
    const recipe_id = parseInt(req.params.id, 10);
    if (isNaN(recipe_id)) {
      errLog("RECIPE_06", 400, "Bad Request", {
        recipe_id: recipe_id,
        message: "잘못된 레시피 ID입니다.",
      });
      return res.status(400).json({ message: "잘못된 레시피 ID입니다." });
    }

    // 2. CSV 파일 스트림을 생성하고 파싱
    const stream = fs
      // 2-1. 파일 경로 지정 *** 경로지정 필요 ***
      .createReadStream(path.join(__dirname, bodydata.uri, bodydata.filename))
      .pipe(
        csv({
          headers: [
            // 2-2. 헤더 명시
            "recipe_id",
            "name",
            "image",
            "author",
            "datePublished",
            "description",
            "recipeIngredient",
            "recipeInstructions",
            "tags",
            "cat4",
            "cat2",
          ],
          skipLines: 1, // 2-3. 첫 번째 행 건너뛰기
        })
      );

    // 3. 일치하는 recipe를 찾으면 found = true, 스트림을 파기하여 더 이상의 읽기를 중단
    let found = false;

    stream.on("data", async (data) => {
      if (parseInt(data.recipe_id, 10) === recipe_id) {
        found = true;

        // 4. 데이터 변환
        const transformedData = {
          recipe_id: data.recipe_id,
          name: data.name,
          image: JSON.parse(data.image.replace(/'/g, '"')),
          author: data.author,
          datePublished: data.datePublished,
          description: data.description,
          recipeIngredient: transformIngredients(
            JSON.parse(convertToJSONArray(data.recipeIngredient))
          ),
          recipeInstructions: transformRecipe(
            JSON.parse(convertToJSONArray(data.recipeInstructions))
          ),
          tags: JSON.parse(data.tags.replace(/'/g, '"')),
          recipe_class: [
            {
              cate_no: data.cat4,
              situ_no: data.cat2,
            },
          ],
        };

        // 6. 쇼핑API를 위해 재료 테이블에서 해당 레시피가 가지고 있는 재료명(정제됨)을 가져오게 함
        const [shoppingIngredientList] = await pool.query(
          "SELECT ingredient_name FROM Ingredient WHERE ingredient_id IN (SELECT ingredient_id FROM IngredientSearch WHERE recipe_id = ?)",
          [recipe_id]
        );

        // 쇼핑 재료 목록을 문자열 배열로 변환하여 추가
        transformedData.shoppingIngredients = shoppingIngredientList.map(
          (item) => item.ingredient_name
        );

        successLog("RECIPE_06");
        res.status(200).json(transformedData);
        stream.destroy();
      }
    });

    // 5-1. 만약 없으면 404 반환
    stream.on("end", () => {
      if (!found) {
        errLog("RECIPE_06", 404, "Not Found", {
          recipe_id: recipe_id,
          message: "잘못된 레시피 정보입니다.",
        });
        res.status(404).json({
          message: "잘못된 레시피 정보입니다.",
        });
      }
    });

    stream.on("error", (err) => {
      errLog("RECIPE_06", 500, "Internal Server Error", {
        recipe_id: recipe_id,
        error: err.message,
      });
      res.status(500).json({
        message: "레시피를 불러오는데에 실패했습니다. 다시 시도해주세요.",
      });
    });
  } catch (err) {
    errLog("RECIPE_06", 500, "Internal Server Error", {
      recipe_id: recipe_id,
      error: err.message,
    });
    res.status(500).json({
      message: "레시피를 불러오는데에 실패했습니다. 다시 시도해주세요.",
    });
  }
});

// RECIPE_07 : 네이버 쇼핑(openAPI)
router.post("/getNaverShop", async (req, res) => {
  infoLog("RECIPE_07", req.body);
  // 0. 검색할 재료 이름 받아오기
  const { ingredient_name } = req.body;
  const shopUrl = `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(
    ingredient_name
  )}&sort=asc&filter=naverpay&display=20`;

  // 1. 요청
  try {
    const response = await axios.get(shopUrl, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Naver-Client-Id": process.env.NAVER_CLIENT_ID,
        "X-Naver-Client-Secret": process.env.NAVER_CLIENT_SECRET,
      },
    });

    successLog("RECIPE_07");
    res.status(200).json(response.data);
  } catch (err) {
    errLog("RECIPE_07", 500, "Internal Server Error", {
      ingredient_name: ingredient_name,
      error: err.message,
    });
    res.status(500).json({
      message: "네이버 쇼핑 검색에 실패했습니다. 다시 시도해주세요.",
    });
  }
});

// RECIPE_08 : 네이버 쇼핑
router.post("/getShop", async (req, res) => {
  infoLog("RECIPE_08", req.body);
  // 0. 검색할 재료 이름 받아오기
  const { ingredient_name } = req.body;
  const shopUrl = `https://shopping.naver.com/v1/search/base-products?_nc_=1720018800000&q=${encodeURIComponent(
    ingredient_name
  )}&verticals[]=MARKET&verticalDistrictNos[]=1260100840117,1250100839984,1310000004044,1340000001122,1280000000233,1440000004936,1330000000918,1350000001056,1240000000571,1360000001182,1450000003025,1230000000141,1470000003604,1430000002226,1210000000000&sort=POPULARITY&start=1&display=20&filterSoldOut=true`;

  // 1. 요청
  try {
    const response = await axios.get(shopUrl, {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0",
      },
    });
    const result = response.data.items;
    const extractedData = result.map((item) => ({
      _id: item._id,
      name: item.name,
      channel_name: item.channel.channelName,
      dispSalePrice: item.dispSalePrice,
      discountedPrice: item.benefitsView.dispDiscountedSalePrice,
      discountedRatio: item.benefitsView.dispDiscountedRatio,
      image_url: item.productImages[0].url,
      reviewCount: item.reviewAmount.totalReviewCount,
      reviewScore: item.reviewAmount.averageReviewScore,
    }));

    successLog("RECIPE_08");
    res.status(200).json(extractedData);
  } catch (err) {
    errLog("RECIPE_08", 500, "Internal Server Error", {
      ingredient_name: ingredient_name,
      error: err.message,
    });
    res.status(500).json({
      message: "네이버 쇼핑 검색에 실패했습니다. 다시 시도해주세요.",
    });
  }
});

module.exports = router;
