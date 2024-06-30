const express = require("express");
const router = express.Router();
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const moment = require("moment-timezone");

const { pool } = require("../scripts/connectMySQL");
require("dotenv").config();

router.use(express.json());

// BaseUrl : /recipe

// RECIPE_01 : 최신순 20개 가져오기
router.get("/getRecentList", async(req, res)=>{
  try {
    const [recentRecipes] = await pool.query(
      'SELECT * FROM Recipe ORDER BY recipe_no DESC LIMIT 20'
    );

    // 결과를 클라이언트에게 응답으로 보내기
    res.json({ recipes: recentRecipes });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "최신 레시피 목록을 불러오는데에 실패했습니다. 다시 시도해주세요.",
    });
  }
})

// RECIPE_02 : 현재 월 기준 제철농산물 레시피 가져오기
router.get("/getSeasonalList", async (req, res) => {
  try {
    // 1. 현재 날짜 기준 월 1~12로 가져오기, timezone 고려
    const currentMonth = moment().tz("Asia/Seoul").month() + 1;

    // 2. 현재 월에 해당하는 제철 농산물 이름 배열로 받아오기
    const [findSeasonalFoodName] = await pool.query(
      'SELECT seasonal_name, seasonal_image FROM Seasonal WHERE seasonal_month = ?',
      [currentMonth]
    );

    // 3. 결과를 클라이언트에게 응답으로 보내기
    res.json({ seasonal_list: findSeasonalFoodName });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message:
        "제철 농산물 레시피 목록을 불러오는데에 실패했습니다. 다시 시도해주세요.",
    });
  }
});

// RECIPE_03 : 선호도 태그 둘 다 만족하는 레시피 가져오기
router.post("/getPreferList", async (req, res) => {
  const { user_id } = req.body;
  try {
    // 1. User 테이블에서 user_id로 cate_no와 situ_no 값 가져오기
    const [getUserPrefer] = await pool.query('SELECT cate_no, situ_no FROM MyPage WHERE user_id = ?', [user_id]);

    if (
      getUserPrefer.length === 0 ||
      getUserPrefer[0].cate_no === null ||
      getUserPrefer[0].situ_no === null
    ) {
      return res.status(204).json({ message: "선호도 정보가 없습니다." });
    }

    // 2. 둘 다 만족할 때
    const [queryRes] = await pool.query(
      'SELECT recipe_no, recipe_title, recipe_thumbnail FROM Recipe WHERE cate_no = ? AND situ_no = ?',
      [getUserPrefer[0].cate_no, getUserPrefer[0].situ_no]
    );

    // 3. 결과를 클라이언트로 전달
    const result = {
      prefer_list: queryRes.map((recipe) => ({
        recipe_no: recipe.recipe_no,
        recipe_title: recipe.recipe_title,
        recipe_thumbnail: recipe.recipe_thumbnail,
      })),
    };

    res.json(result);
  } catch (err) {
    console.log(err)
    return res.status(500).json({
      message:
        "추천 레시피 목록을 불러오는데에 실패했습니다. 다시 시도해주세요."
    });
  }
});

// RECIPE_04 : 선호 cate만 만족하는 레시피 리스트 가져오기
router.post("/getCateList", async (req, res) => {
  const { cate_no } = req.body;

  try {
    // 1. 만족하는 레시피 찾기
    const [queryRes] = await pool.query(
      'SELECT recipe_no, recipe_title, recipe_thumbnail FROM Recipe WHERE cate_no = ?',
      [cate_no]
    );

    // 2. 결과를 클라이언트로 전달
    const result = {
      cate_list: queryRes.map((recipe) => ({
        recipe_no: recipe.recipe_no,
        recipe_title: recipe.recipe_title,
        recipe_thumbnail: recipe.recipe_thumbnail,
      })),
    };

    res.json(result);
  } catch (err) {
    console.log(err)
    return res.status(500).json({
      message:
        "추천 레시피 목록을 불러오는데에 실패했습니다. 다시 시도해주세요."
    });
  }
});

// RECIPE_05 : 선호 situ만 만족하는 레시피 리스트 가져오기
router.post("/getSituList", async (req, res) => {
  const { situ_no } = req.body;
  
  try {
    // 1. 만족하는 레시피 찾기
    const [queryRes] = await pool.query(
      'SELECT recipe_no, recipe_title, recipe_thumbnail FROM Recipe WHERE situ_no = ?',
      [situ_no]
    );

    // 2. 결과를 클라이언트로 전달
    const result = {
      situ_list: queryRes.map((recipe) => ({
        recipe_no: recipe.recipe_no,
        recipe_title: recipe.recipe_title,
        recipe_thumbnail: recipe.recipe_thumbnail,
      })),
    };

    res.json(result);
  } catch (err) {
    console.log(err)
    return res.status(500).json({
      message:
        "추천 레시피 목록을 불러오는데에 실패했습니다. 다시 시도해주세요."
    });
  }
});

// RECIPE_06 : 특정 레시피 body 가져오기
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

// RECIPE_07
router.post("/getShop", async (req, res) => {
  // 0. 검색할 재료 이름 받아오기
  const { ingredient_name } = req.body;
  const shopUrl = `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(
    ingredient_name
  )}&sort=sim`;

  // 1. 요청
  try {
    const response = await axios.get(shopUrl, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Naver-Client-Id": process.env.NAVER_CLIENT_ID,
        "X-Naver-Client-Secret": process.env.NAVER_CLIENT_SECRET,
      },
    });

    res.status(200).json(response.data);
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "네이버 쇼핑 검색에 실패했습니다. 다시 시도해주세요.",
    });
  }
});

module.exports = router;
