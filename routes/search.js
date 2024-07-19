const express = require("express");
const router = express.Router();
const pool = require("../scripts/connector");
const { errLog, infoLog, successLog } = require("../utils/logUtils");
router.use(express.json());

// BaseUrl : /search

// SEARCH_01 : 제목 검색 결과 리스트 가져오기
router.post("/getTitleSearchList", async (req, res) => {
  infoLog("SEARCH_01", req.body);
  const { keyword, type } = req.body;

  // 0-1. keyword 없을 때
  if (!keyword) {
    errLog("SEARCH_01", 400, "Bad Request", {
      keyword: keyword,
      message: "검색어를 입력해주세요.",
    });
    return res.status(400).json({ message: "검색어를 입력해주세요." });
  }

  // 0-2. type 없거나 page / navbar가 아닐 때
  if (!type || !["page", "navbar"].includes(type)) {
    errLog("SEARCH_01", 400, "Bad Request", {
      type: type,
      message: "유효한 타입을 입력해주세요.",
    });
    return res.status(400).json({ message: "유효한 타입을 입력해주세요." });
  }

  try {
    // 1. 제목으로 검색 (대소문자 구분 없이 포함하는 결과)
    let query = `
      SELECT recipe_id, recipe_title, recipe_thumbnail 
      FROM Recipe 
      WHERE recipe_title LIKE ?
    `;

    const params = [`%${keyword}%`];

    if (type === "navbar") {
      query += `LIMIT ?`;
      params.push(10);
    }

    const [recipes] = await pool.query(query, params);

    // 2-1. 검색 결과가 없을 때 예외 처리
    if (recipes.length === 0) {
      errLog("SEARCH_01", 404, "Not Found", {
        keyword: keyword,
        message: "제목이 일치하는 레시피가 없습니다.",
      });
      return res
        .status(404)
        .json({ message: "제목이 일치하는 레시피가 없습니다." });
    }

    // 3. 최종 결과 형식으로 변환
    const search_list = recipes.map((r) => ({
      recipe_id: r.recipe_id,
      recipe_title: r.recipe_title,
      recipe_thumbnail: r.recipe_thumbnail,
    }));
    successLog("SEARCH_01");
    res.status(200).json({ search_list });
  } catch (err) {
    errLog("SEARCH_01", 500, "Internal Server Error", {
      error: err.message,
    });
    res
      .status(500)
      .json({ message: "레시피 제목 검색에 실패했습니다. 다시 시도해주세요." });
  }
});

// SEARCH_02 : 재료 검색 결과 리스트 가져오기
router.post("/getIngredientSearchList", async (req, res) => {
  infoLog("SEARCH_02", req.body);
  const { keyword, type } = req.body;

  // 0-1. keyword 없을 때 예외 처리
  if (!keyword) {
    errLog("SEARCH_02", 400, "Bad Request", {
      keyword: keyword,
      message: "검색어를 입력해주세요.",
    });
    return res.status(400).json({ message: "검색어를 입력해주세요." });
  }

  /// 0-2. type 없거나 page / navbar가 아닐 때
  if (!type || !["page", "navbar"].includes(type)) {
    errLog("SEARCH_02", 400, "Bad Request", {
      type: type,
      message: "유효한 타입을 입력해주세요.",
    });
    return res.status(400).json({ message: "유효한 타입을 입력해주세요." });
  }

  try {
    // 1. 재료명으로 재료 ID를 검색
    let query = `
      SELECT i.recipe_id, r.recipe_title, r.recipe_thumbnail 
      FROM IngredientSearch i 
      JOIN Recipe r ON i.recipe_id = r.recipe_id 
      WHERE i.ingredient_id IN (SELECT ingredient_id FROM Ingredient WHERE ingredient_name LIKE ?)
    `;

    const params = [`%${keyword}%`];

    if (type === "navbar") {
      query += `LIMIT ?`;
      params.push(10);
    }

    const [recipes] = await pool.query(query, params);

    // 4. 최종 레시피 리스트 반환
    if (recipes.length === 0) {
      errLog("SEARCH_02", 404, "Not Found", {
        keyword: keyword,
        message: "재료가 일치하는 레시피가 없습니다.",
      });
      return res
        .status(404)
        .json({ message: "재료가 일치하는 레시피가 없습니다." });
    }

    // 5. 최종 결과 형식으로 변환
    const search_list = recipes.map((r) => ({
      recipe_id: r.recipe_id,
      recipe_title: r.recipe_title,
      recipe_thumbnail: r.recipe_thumbnail,
    }));

    successLog("SEARCH_02");
    res.status(200).json({ search_list });
  } catch (err) {
    errLog("SEARCH_02", 500, "Internal Server Error", {
      error: err.message,
    });
    res
      .status(500)
      .json({ message: "레시피 검색에 실패했습니다. 다시 시도해주세요." });
  }
});

// SEARCH_03 : 제외필터 적용 재료검색 리스트 가져오기
router.post("/getFilteredSearchList", async (req, res) => {
  infoLog("SEARCH_03", req.body);
  // 제외필터 추가적용 재료검색
  const { keyword, type, keyword_filter } = req.body;

  // 0-1. keyword 없을 때 예외 처리
  if (!keyword) {
    errLog("SEARCH_03", 400, "Bad Request", {
      keyword: keyword,
      message: "검색어를 입력해주세요.",
    });
    return res.status(400).json({ message: "검색어를 입력해주세요." });
  }

  // 0-2. type 값이 없거나 유효하지 않은 경우 예외 처리
  if (!type || !["page", "navbar"].includes(type)) {
    errLog("SEARCH_03", 400, "Bad Request", {
      type: type,
      message: "유효한 타입을 입력해주세요.",
    });
    return res.status(400).json({ message: "유효한 타입을 입력해주세요." });
  }

  // 0-3. keyword_filter값이 없을 때 예외 처리
  if (!Array.isArray(keyword_filter) || keyword_filter.length === 0) {
    errLog("SEARCH_03", 400, "Bad Request", {
      keyword_filter: keyword_filter,
      message: "제외 필터를 설정해주세요.",
    });
    return res.status(400).json({ message: "제외 필터를 설정해주세요." });
  }

  try {
    // 1. 쿼리 구성
    let query = `
      SELECT DISTINCT r.recipe_id, r.recipe_title, r.recipe_thumbnail 
      FROM IngredientSearch i 
      JOIN Recipe r ON i.recipe_id = r.recipe_id 
      WHERE i.ingredient_id IN (SELECT ingredient_id FROM Ingredient WHERE ingredient_name LIKE ?)
      AND r.recipe_id NOT IN (
        SELECT isub.recipe_id 
        FROM IngredientSearch isub 
        JOIN Ingredient ifil ON isub.ingredient_id = ifil.ingredient_id 
        WHERE ifil.ingredient_name IN (${keyword_filter
          .map(() => "?")
          .join(", ")})
      )
    `;

    const params = [`%${keyword}%`, ...keyword_filter];

    if (type === "navbar") {
      query += ` LIMIT 10`;
    }

    const [recipes] = await pool.execute(query, params);

    // 2. 최종 레시피 리스트 반환
    if (recipes.length === 0) {
      errLog("SEARCH_03", 404, "Not Found", {
        keyword: keyword,
        message: "일치하는 레시피가 없습니다.",
      });
      return res.status(404).json({ message: "일치하는 레시피가 없습니다." });
    }

    // 3. 최종 결과 형식으로 변환
    const search_list = recipes.map((r) => ({
      recipe_id: r.recipe_id,
      recipe_title: r.recipe_title,
      recipe_thumbnail: r.recipe_thumbnail,
    }));
    successLog("SEARCH_03");
    res.status(200).json({ search_list });
  } catch (err) {
    errLog("SEARCH_03", 500, "Internal Server Error", {
      error: err.message,
    });
    res
      .status(500)
      .json({ message: "레시피 검색에 실패했습니다. 다시 시도해주세요." });
  }
});

// SEARCH_04 : 다중 재료 검색 리스트 가져오기 (냉장고)
router.post("/getMultiSearchList", async (req, res) => {
  infoLog("SEARCH_04", req.body);
  const { ing_search } = req.body;

  // 1. 필수 값 체크
  if (!ing_search || !Array.isArray(ing_search) || ing_search.length === 0) {
    errLog("SEARCH_04", 400, "Bad Request", {
      ing_search: ing_search,
      message: "검색할 재료 리스트를 입력해주세요.",
    });
    return res
      .status(400)
      .json({ message: "검색할 재료 리스트를 입력해주세요." });
  }

  try {
    // 2. 재료명으로 재료 ID를 검색
    const placeholders = ing_search.map(() => "?").join(", ");
    const [ingredients] = await pool.execute(
      `SELECT ingredient_id FROM Ingredient WHERE ingredient_name IN (${placeholders})`,
      ing_search
    );

    // 2-1. 해당 재료가 없을 경우 예외 처리
    if (ingredients.length === 0) {
      errLog("SEARCH_04", 404, "Not Found", {
        ing_search: ing_search,
        message: "일치하는 재료가 없습니다.",
      });
      return res.status(404).json({ message: "일치하는 재료가 없습니다." });
    }

    // 2-2. 재료 ID 리스트 추출
    const ingredientIds = ingredients.map(
      (ingredient) => ingredient.ingredient_id
    );

    // 3. 재료 ID 리스트로 레시피 ID 검색
    const recipePlaceholders = ingredientIds.map(() => "?").join(", ");
    const [recipes] = await pool.execute(
      `SELECT r.recipe_id, r.recipe_title, r.recipe_thumbnail 
      FROM Recipe r 
      JOIN (
        SELECT recipe_id 
        FROM IngredientSearch 
        WHERE ingredient_id IN (${recipePlaceholders}) 
        GROUP BY recipe_id 
        HAVING COUNT(DISTINCT ingredient_id) = ?
      ) matched_recipes ON r.recipe_id = matched_recipes.recipe_id`,
      [...ingredientIds, ingredientIds.length]
    );

    // 3-1. 검색 결과가 없을 때 예외 처리
    if (recipes.length === 0) {
      errLog("SEARCH_04", 404, "Not Found", {
        ing_search: ing_search,
        message: "재료가 모두 일치하는 레시피가 없습니다.",
      });
      return res
        .status(404)
        .json({ message: "재료가 모두 일치하는 레시피가 없습니다." });
    }

    // 3-2. 최종 결과 형식으로 변환
    let search_list = recipes.map((r) => ({
      recipe_id: r.recipe_id,
      recipe_title: r.recipe_title,
      recipe_thumbnail: r.recipe_thumbnail,
    }));
    successLog("SEARCH_04");
    res.status(200).json({ search_list });
  } catch (err) {
    errLog("SEARCH_04", 500, "Internal Server Error", {
      error: err.message,
    });
    res
      .status(500)
      .json({ message: "레시피 재료 검색에 실패했습니다. 다시 시도해주세요." });
  }
});

module.exports = router;
