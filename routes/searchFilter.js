const express = require("express");
const router = express.Router();

const pool = require("../scripts/connector");
const { validateSession } = require("../utils/sessionUtils"); // 유틸리티 함수 임포트
const { errLog } = require("../utils/logUtils");

router.use(express.json());

// BaseUrl : /searchfilter

// FILTER_01 : 제외필터 불러오기
router.post("/getFilterList", async (req, res) => {
  const { user_id, access_token } = req.body;

  // 0. Session 테이블에서 user_id와 access_token이 올바르게 짝지어져 있는지 확인
  const isValidSession = await validateSession(user_id, access_token);
  if (!isValidSession) {
    errLog("FILTER_01", 401, "Unauthorized", {
      user_id: user_id,
      message: "user_id와 access_token이 일치하지 않습니다."
    });
    return res
      .status(401)
      .json({ message: "user_id와 access_token이 일치하지 않습니다." });
  }

  try {
    // 1. SearchFilter에서 user_id로 SELECT
    const [rows] = await pool.query(
      "SELECT ingredient_id FROM SearchFilter WHERE user_id = ?",
      [user_id]
    );

    // 2. 클라이언트로 반환
    const filter_list = rows.map((row) => row.ingredient_id);

    errLog("FILTER_01", 200, "OK");
    return res.status(200).json({ filter_list });

  } catch (err) {
    errLog("FILTER_01", 500, "Internal Server Error", {
      user_id: user_id,
      error: err.message,
    });
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
    errLog("FILTER_02", 401, "Unauthorized", {
      user_id: user_id,
      message: "user_id와 access_token이 일치하지 않습니다."
    });
    return res
      .status(401)
      .json({ message: "user_id와 access_token이 일치하지 않습니다." });
  }

  // 1. 입력 데이터 체크
  if (!user_id || !Array.isArray(filter_list) || filter_list.length === 0) {
    errLog("FILTER_02", 400, "Bad Request", {
      user_id: user_id,
      message: "잘못된 입력 데이터입니다."
    });
    return res.status(400).json({ message: "잘못된 입력 데이터입니다." });
  }

  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 2. 현재 저장된 필터 가져오기
      const [currentFilters] = await connection.query(
        `SELECT ingredient_id FROM SearchFilter WHERE user_id = ?`,
        [user_id]
      );
      const currentFilterIds = currentFilters.map(f => f.ingredient_id);

      // 3. 재료명으로 재료 ID를 검색
      const placeholders = filter_list.map(() => "?").join(", ");
      const [ingredients] = await connection.query(
        `SELECT ingredient_id, ingredient_name FROM Ingredient WHERE ingredient_name IN (${placeholders})`,
        filter_list
      );

      const foundIngredientNames = ingredients.map(
        ingredient => ingredient.ingredient_name
      );
      const notFoundIngredients = filter_list.filter(
        name => !foundIngredientNames.includes(name)
      );

      // 4. 입력된 재료 중 저장되어 있지 않은 재료가 있는 경우 예외 처리
      if (notFoundIngredients.length > 0) {
        errLog("FILTER_02", 404, "Not Found", {
          notFoundIngredients: notFoundIngredients,
          message: `이 재료는 재료 테이블에 저장되어있지 않습니다: ${notFoundIngredients.join(
            ", "
          )}`,
        });
        return res.status(404).json({
          message: `이 재료는 재료 테이블에 저장되어있지 않습니다: ${notFoundIngredients.join(
            ", "
          )}`,
        });
      }

      // 5. 존재하는 재료의 ID 리스트 추출
      const ingredientIds = ingredients.map(ingredient => ingredient.ingredient_id);

      // 6. 추가할 필터와 삭제할 필터 구분
      const filtersToAdd = ingredientIds.filter(id => !currentFilterIds.includes(id));
      const filtersToRemove = currentFilterIds.filter(id => !ingredientIds.includes(id));

      // 7. 필터 추가
      if (filtersToAdd.length > 0) {
        const addValues = filtersToAdd
          .map(id => `(${pool.escape(user_id)}, ${id})`)
          .join(", ");
        await connection.query(
          `INSERT INTO SearchFilter (user_id, ingredient_id) VALUES ${addValues}`
        );
      }

      // 8. 필터 삭제
      if (filtersToRemove.length > 0) {
        const removePlaceholders = filtersToRemove.map(() => "?").join(", ");
        await connection.query(
          `DELETE FROM SearchFilter WHERE user_id = ? AND ingredient_id IN (${removePlaceholders})`,
          [user_id, ...filtersToRemove]
        );
      }

      // 9. 트랜잭션 커밋
      await connection.commit();
      errLog("FILTER_02", 200, "OK");
      return res
        .status(200)
        .json({ message: "제외 필터가 성공적으로 저장되었습니다." });
    } catch (err) {
      // 트랜잭션 롤백
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    errLog("FILTER_02", 500, "Internal Server Error", {
      user_id: user_id,
      error: err.message,
    });
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
    errLog("FILTER_03", 400, "Bad Request", {
      filter_list: filter_list,
      message: "잘못된 입력 데이터입니다."
    });
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
      errLog("FILTER_03", 404, "Not Found", {
        notFoundIngredients: notFoundIngredients,
        message: `이 재료는 재료 테이블에 저장되어있지 않습니다: ${notFoundIngredients.join(
          ", "
        )}`
      });
      return res.status(404).json({
        message: `이 재료는 재료 테이블에 저장되어있지 않습니다: ${notFoundIngredients.join(
          ", "
        )}`,
      });
    }

    // 4. 모든 재료가 재료 테이블에 저장되어 있는 경우 성공 메시지 반환
    errLog("FILTER_03", 200, "OK");
    return res.status(200).json({
      message: "모든 재료가 재료 테이블에 저장되어 있습니다.",
      ingredients,
    });
  } catch (err) {
    errLog("FILTER_03", 500, "Internal Server Error", {
      filter_list: filter_list,
      error: err.message,
    });
    res.status(500).json({
      message: "재료 검색에 실패했습니다. 다시 시도해주세요.",
    });
  }
});

module.exports = router;
