const express = require("express");
const router = express.Router();
const axios = require("axios");
const qs = require("qs");
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const mongoose = require("mongoose");
const User = require("../models/user");
const Recipe = require("../models/recipemeta");
const Seasonal = require("../models/seasonal");
require("dotenv").config();

router.use(express.json());

// BaseUrl : /recipe

// .env naver OAuth
const naverReq = {
  client_id: process.env.NAVER_CLIENT_ID,
  client_secret: process.env.NAVER_CLIENT_SECRET,
  redirect_uri: process.env.NAVER_REDIRECT_URI,
  state: process.env.NAVER_STATE,
};

// RECIPE_01
router.post("/updateBookmark", async (req, res) => {
  const { user_id, recipe_no } = req.body;

  try {
    // 1. User Collection에서 user_id를 키값으로 해 유저 검색
    const getUserProfile = await User.findOne({ user_id });

    if (!getUserProfile) {
      return res.status(400).json({ message: "잘못된 유저 정보입니다." });
    }

    // 1-1. 찾은 유저의 bookmark 값 반환 "user_bookmark": ["recipe_no", "recipe_no", "recipe_no"]
    let { user_bookmark } = getUserProfile;

    // 2. user_bookmark에 recipe_no가 있는지 판단
    if (user_bookmark.includes(recipe_no)) {
      // 2-1. 있을 시 삭제 후 배열 반환
      user_bookmark = user_bookmark.filter((rn) => rn !== recipe_no);
    } else {
      // 2-2. 없을 시 추가 후 배열 반환
      user_bookmark.push(recipe_no);
    }

    // 3. 해당 배열 user정보에 저장
    const updateBookmark = await User.findOneAndUpdate(
      { user_id },
      {
        user_bookmark,
      }
    );

    if (!updateBookmark) {
      return res.status(404).json({ message: "잘못된 유저 정보입니다." });
    }

    return res.status(200).json({ message: "즐겨찾기 목록에 추가되었습니다." });
  } catch (err) {
    console.error("Error updateing bookmark: ", err);
    res
      .status(500)
      .json({ message: "즐겨찾기 추가에 실패했습니다. 다시 시도해주세요." });
  }
});

// RECIPE_02
router.get("/getSeasonalList", async (req, res) => {
  try {
    // 1. 현재 날짜 기준 월 1~12로 가져오기
    const currentMonth = new Date().getMonth() + 1;

    // 1-1. 현재 월에 해당하는 제철 농산물 이름 배열로 받아오기
    const findSeasonalFoodName = await Seasonal.find(
      { seasonal_month: currentMonth },
      "seasonal_name seasonal_image_url -_id" // _id 필드를 제외하고 필요한 필드만 선택
    ).lean();

    // 결과를 클라이언트에게 응답으로 보내기
    res.json({ seasonal_list: findSeasonalFoodName });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message:
        "제철 농산물 레시피 목록을 불러오는데에 실패했습니다. 다시 시도해주세요.",
    });
  }
});

// RECIPE_03
router.post("/getPreferList", async (req, res) => {
  const { user_id } = req.body;
  try {
    // 1. User Collection에서 user_id로 user_prefer 값 가져오기
    const getUserPrefer = await User.findOne({ user_id }, "user_prefer");

    if (
      !getUserPrefer ||
      !getUserPrefer.user_prefer ||
      getUserPrefer.user_prefer.length === 0
    ) {
      return res.status(204).json({ message: "선호도 정보가 없습니다." });
    }

    // user_prefer이 항상 한 쌍의 값을 가정
    const userPrefer = getUserPrefer.user_prefer[0];

    // 2-2. 둘 다 만족할 때
    const query = {
      "recipe_class.cate_no": userPrefer.cate_no,
      "recipe_class.situ_no": userPrefer.situ_no,
    };

    const projection = {
      recipe_no: 1,
      recipe_title: 1,
      recipe_thumbnail: 1,
    };

    const queryRes = await Recipe.find(query, projection).exec();

    // 3.
    const result = {
      prefer_list: queryRes.map((recipe) => ({
        recipe_no: recipe.recipe_no,
        recipe_title: recipe.recipe_title,
        recipe_thumbnail: recipe.recipe_thumbnail,
      })),
    };

    res.json(result);
  } catch (error) {
    return res.status(500).json({
      message:
        "추천 레시피 목록을 불러오는데에 실패했습니다. 다시 시도해주세요.",
    });
  }
});

// RECIPE_04
router.get("/getRecipe/:id", async (req, res) => {
  const convertToJSONArray = (str) => {
    return str.replace(/\(/g, "[").replace(/\)/g, "]").replace(/'/g, '"');
  };
  const transformIngredients = (ingredients) => {
    return ingredients.map(([ingredient, amount]) => ({ ingredient, amount }));
  };
  const transformRecipe = (recipes) => {
    return recipes.map(([step, image]) => ({ step, image }));
  };
  try {
    // 1. 파라미터로 받은 id값 정수형태로 변환
    const recipe_no = parseInt(req.params.id, 10);
    console.log("Parsed recipe ID:", recipe_no);

    // 2. CSV 파일 스트림을 생성하고 파싱
    const stream = fs
      // 2-1. 파일 경로 지정
      .createReadStream(path.join(__dirname, "../data", "recipe_samples.csv"))
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

    stream.on("data", (data) => {
      if (parseInt(data.recipe_id, 10) === recipe_no) {
        found = true;

        // 데이터 변환
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

        res.json(transformedData);

        stream.destroy();
      }
    });

    // 3-1. 만약 모든 데이터를 찾았는데 없으면 404 반환
    stream.on("end", () => {
      if (!found) {
        console.log("Recipe not found for ID:", recipe_no);
        res.status(404).json({
          message: "잘못된 레시피 정보입니다.",
        });
      }
    });

    stream.on("error", (err) => {
      console.error("Stream error:", err);
      res.status(500).json({
        message: "레시피를 불러오는데에 실패했습니다. 다시 시도해주세요.",
      });
    });
  } catch (err) {
    console.error("Catch error:", err);
    res.status(500).json({
      message: "레시피를 불러오는데에 실패했습니다. 다시 시도해주세요.",
    });
  }
});

// RECIPE_05
router.post("/getShop", async (req, res) => {
  // 0. 검색할 재료 이름 받아오기
  console.log("RECIPE_05");
  const { ing_name } = req.body;
  const shopUrl = `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(
    ing_name
  )}&sort=sim`;

  // 1. 요청
  try {
    const response = await axios.get(shopUrl, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Naver-Client-Id": naverReq.client_id,
        "X-Naver-Client-Secret": naverReq.client_secret,
      },
    });

    res.status(200).json(response.data);
  } catch (err) {
    console.log("@@@@@@@@@@@@@@@@@@", err);
    res.status(500).json({
      message: "네이버 쇼핑 검색에 실패했습니다. 다시 시도해주세요.",
    });
  }
});

module.exports = router;
