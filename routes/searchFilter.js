const express = require("express");
const router = express.Router();

const { pool } = require("../scripts/connectMySQL");
const { validateSession } = require("../utils/sessionUtils"); // 유틸리티 함수 임포트

router.use(express.json());

// BaseUrl : /searchfilter

// FILTER_01 : 마이페이지 불러오기
router.post("/getFilterList", async (req, res) => {
  const { user_id, access_token } = req.body;

  // 0. Session 테이블에서 user_id와 access_token이 올바르게 짝지어져 있는지 확인
  const isValidSession = await validateSession(user_id, access_token);
  if (!isValidSession) {
    console.log("Backend FILTER_01: Unauthorized, ", user_id);
    return res
      .status(401)
      .json({ message: "user_id와 access_token이 일치하지 않습니다." });
  }

  try {
    // 1. 검색 필터 목록 가져오기
    const [rows] = await pool.query(
      "SELECT ingredient_id FROM SearchFilter WHERE user_id = ?",
      [user_id]
    );

    // 2. 검색 필터 목록 반환
    const filter_list = rows.map((row) => row.ingredient_id);

    return res.status(200).json({ filter_list });
  } catch (err) {
    console.error("Backend FILTER_01: ", err);
    res.status(500).json({
      message: "검색 필터 목록을 불러오기에 실패했습니다. 다시 시도해주세요.",
    });
  }
});

// FILTER_02 : 제외필터 저장하기
router.post("/updateFilterList", async (req, res) => {
  const { user_id, access_token, filter_list } = req.body;

  // 0. Session 테이블에서 user_id와 access_token이 올바르게 짝지어져 있는지 확인
  const isValidSession = await validateSession(user_id, access_token);
  if (!isValidSession) {
    console.log("Backend FILTER_02: Unauthorized, ", user_id);
    return res
      .status(401)
      .json({ message: "user_id와 access_token이 일치하지 않습니다." });
  }

  // 1. 입력 데이터 체크
  if (!user_id || !Array.isArray(filter_list) || filter_list.length === 0) {
    console.log("Backend FILTER_02: Bad Request, ", user_id);
    return res.status(400).json({ message: "잘못된 입력 데이터입니다." });
  }

  try {
    // 2. 재료명으로 재료 ID를 검색
    const placeholders = filter_list.map(() => "?").join(", ");
    const [ingredients] = await pool.query(
      `SELECT ingredient_id, ingredient_name FROM Ingredient WHERE ingredient_name IN (${placeholders})`,
      filter_list
    );

    const foundIngredientNames = ingredients.map(
      (ingredient) => ingredient.ingredient_name
    );
    const notFoundIngredients = filter_list.filter(
      (name) => !foundIngredientNames.includes(name)
    );

    // 3. 입력된 재료 중 저장되어 있지 않은 재료가 있는 경우 예외 처리
    if (notFoundIngredients.length > 0) {
      console.log("Backend FILTER_02: Not Found, ", notFoundIngredients);
      return res.status(404).json({
        message: `이 재료는 재료 테이블에 저장되어있지 않습니다: ${notFoundIngredients.join(
          ", "
        )}`,
      });
    }

    // 4. 존재하는 재료의 ID 리스트 추출
    const ingredientIds = ingredients.map(
      (ingredient) => ingredient.ingredient_id
    );

    // 5. 제외 필터 저장 (중복 필터를 무시하고 저장)
    const values = ingredientIds
      .map((ingredient_id) => `(${pool.escape(user_id)}, ${ingredient_id})`)
      .join(", ");
    await pool.query(
      `INSERT IGNORE INTO SearchFilter (user_id, ingredient_id) VALUES ${values}`
    );

    return res
      .status(200)
      .json({ message: "제외 필터가 성공적으로 저장되었습니다." });
  } catch (err) {
    console.error("Backend FILTER_02: ", err);
    res.status(500).json({
      message: "제외 필터 저장에 실패했습니다. 다시 시도해주세요.",
    });
  }
});

// FILTER_03 : 제외 필터 설정을 위해 재료 테이블에서 재료 검색
router.post("/searchIngredient", async (req, res) => {
  const { filter_list } = req.body;

  // 1. 입력 데이터 체크
  if (!Array.isArray(filter_list) || filter_list.length === 0) {
    console.log("Backend FILTER_03: Bad Request, ", filter_list);
    return res.status(400).json({ message: "잘못된 입력 데이터입니다." });
  }

  try {
    // 2. 재료명으로 재료 ID를 검색
    const placeholders = filter_list.map(() => "?").join(", ");
    const [ingredients] = await pool.query(
      `SELECT ingredient_id, ingredient_name FROM Ingredient WHERE ingredient_name IN (${placeholders})`,
      filter_list
    );

    const foundIngredientNames = ingredients.map(
      (ingredient) => ingredient.ingredient_name
    );
    const notFoundIngredients = filter_list.filter(
      (name) => !foundIngredientNames.includes(name)
    );

    // 3. 입력된 재료 중 저장되어 있지 않은 재료가 있는 경우 예외 처리
    if (notFoundIngredients.length > 0) {
      console.log("Backend FILTER_03: Not Found, ", notFoundIngredients);
      return res.status(404).json({
        message: `이 재료는 재료 테이블에 저장되어있지 않습니다: ${notFoundIngredients.join(
          ", "
        )}`,
      });
    }

    // 4. 모든 재료가 재료 테이블에 저장되어 있는 경우 성공 메시지 반환
    return res.status(200).json({
      message: "모든 재료가 재료 테이블에 저장되어 있습니다.",
      ingredients,
    });
  } catch (err) {
    console.error("Backend FILTER_03: ", err);
    res.status(500).json({
      message: "재료 검색에 실패했습니다. 다시 시도해주세요.",
    });
  }
});

module.exports = router;
