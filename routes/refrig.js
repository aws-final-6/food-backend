const express = require("express");
const router = express.Router();

const pool = require("../scripts/connector");
const { getRefrigeratorData } = require("../utils/refrigUtils"); // 냉장고 정보 가져오기 util
const { errLog } = require("../utils/logUtils");

router.use(express.json());

// BaseUrl : /refrig

// REFRIG_01 : 냉장고 정보 가져오기
router.post("/getRefrig", async (req, res) => {
  const { user_id } = req.body;
  // 1. user_id 체크
  if (!user_id) {
    errLog("REFRIG_01", 400, "Bad Request", {
      user_id: user_id,
      message: "잘못된 유저 정보입니다."
    });
    return res.status(400).json({ message: "잘못된 유저 정보입니다." });
  }

  try {
    // 2. user_id로 냉장고 및 재료 정보 가져오기
    const result = await getRefrigeratorData(user_id);

    // 3. 결과가 없는 경우 처리
    if (result.length === 0) {
      errLog("REFRIG_01", 404, "Not Found", {
        user_id: user_id,
        message: "냉장고 정보를 찾을 수 없습니다."
      });
      return res
        .status(404)
        .json({ message: "냉장고 정보를 찾을 수 없습니다." });
    }

    errLog("REFRIG_01", 200, "OK");
    return res.status(200).json(result);

  } catch (err) {
    errLog("REFRIG_01", 500, "Internal Server Error", {
      user_id: user_id,
      error: err.message,
    });
    return res.status(500).json({
      message: "냉장고 데이터를 불러오지 못했습니다. 다시 시도해주세요.",
    });
  }
});

// REFRIG_02 : 재료 수기로 입력받기
router.post("/addIngredient", async (req, res) => {
  const { user_id, refrigerators } = req.body;

  // 1. 입력 데이터 체크
  if (!user_id || !Array.isArray(refrigerators) || refrigerators.length === 0) {
    errLog("REFRIG_02", 400, "Bad Request", {
      user_id: user_id,
      refrigerators: refrigerators,
      message: "잘못된 입력 데이터입니다."
    });
    return res.status(400).json({ message: "잘못된 입력 데이터입니다." });
  }

  let connection;

  try {
    // 2. 트랜잭션 시작
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 3. 데이터 저장
    for (const ingredient of refrigerators) {
      const { refrigerator_ing_name, expired_date, enter_date, color, refrigerator_id } = ingredient;

      if (!refrigerator_id || !refrigerator_ing_name || !expired_date || !enter_date || !color) {
        errLog("REFRIG_02", 400, "Bad Request", {
          user_id: user_id,
          ingredient: ingredient,
          message: "잘못된 재료 정보입니다."
        });
        return res
          .status(400)
          .json({ message: "잘못된 재료 정보입니다." });
      }

      await connection.execute(
        "INSERT INTO RefrigeratorIngredients (refrigerator_id, refrigerator_ing_name, expired_date, enter_date, color) VALUES (?, ?, ?, ?, ?)",
        [
          refrigerator_id,
          refrigerator_ing_name,
          expired_date,
          enter_date,
          color,
        ]
      );
    }

    // 4. 트랜잭션 커밋
    await connection.commit();

    // 5. 유저의 모든 냉장고 정보 다시 가져오기
    const result = await getRefrigeratorData(user_id);

    // 6. 결과가 없는 경우 처리
    if (result.length === 0) {
      errLog("REFRIG_02", 404, "Not Found", {
        user_id: user_id,
        message: "냉장고 정보를 찾을 수 없습니다."
      });
      return res
        .status(404)
        .json({ message: "냉장고 정보를 찾을 수 없습니다." });
    }

    errLog("REFRIG_02", 200, "OK");
    return res.status(200).json(result);
  } catch (err) {
    console.error(err);

    // 7. 트랜잭션 롤백
    if (connection) await connection.rollback();

    errLog("REFRIG_02", 500, "Internal Server Error", {
      user_id: user_id,
      error: err.message,
    });
    res
      .status(500)
      .json({ message: "재료 저장에 실패했습니다. 다시 시도해주세요." });
  } finally {
    if (connection) connection.release();
  }
});

// REFRIG_03 : 재료 삭제
router.post("/delIngredient", async (req, res) => {
  const { user_id, refrigerator_ing_ids } = req.body;

  // 1. 입력 데이터 체크
  if (
    !user_id ||
    !Array.isArray(refrigerator_ing_ids) ||
    refrigerator_ing_ids.length === 0
  ) {
    errLog("REFRIG_03", 400, "Bad Request", {
      user_id: user_id,
      refrigerator_ing_ids: refrigerator_ing_ids,
      message: "잘못된 입력 데이터입니다."
    });
    return res.status(400).json({ message: "잘못된 입력 데이터입니다." });
  }

  let connection;

  try {
    // 2. 데이터베이스 연결 및 트랜잭션 시작
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 3. 재료 삭제
    const [deleteResult] = await connection.query(
      "DELETE FROM RefrigeratorIngredients WHERE refrigerator_ing_id IN (?)",
      [refrigerator_ing_ids]
    );

    if (deleteResult.affectedRows === 0) {
      await connection.rollback();
      errLog("REFRIG_03", 404, "Not Found", {
        user_id: user_id,
        refrigerator_ing_ids: refrigerator_ing_ids,
        message: "해당 재료를 찾을 수 없습니다."
      });
      return res.status(404).json({ message: "해당 재료를 찾을 수 없습니다." });
    }

    // 4. 트랜잭션 커밋
    await connection.commit();

    // 5. 유저의 모든 냉장고 정보 다시 가져오기
    const result = await getRefrigeratorData(user_id);

    // 6. 결과가 없는 경우 처리
    if (result.length === 0) {
      errLog("REFRIG_03", 404, "Not Found", {
        user_id: user_id,
        message: "냉장고 정보를 찾을 수 없습니다."
      });
      return res
        .status(404)
        .json({ message: "냉장고 정보를 찾을 수 없습니다." });
    }

    connection.release();

    errLog("REFRIG_03", 200, "OK");
    return res.status(200).json(result);
  } catch (err) {
    // 7. 트랜잭션 롤백
    if (connection) await connection.rollback();

    errLog("REFRIG_03", 500, "Internal Server Error", {
      user_id: user_id,
      error: err.message,
    });
    res
      .status(500)
      .json({ message: "재료 삭제에 실패했습니다. 다시 시도해주세요." });
  } finally {
    if (connection) connection.release();
  }
});

// REFRIG_04 : 냉장고 칸 이름, 타입 변경
router.post("/updateRefrig", async (req, res) => {
  const { user_id, refrigerator_id, new_name, new_type } = req.body;

  // 1. 입력 데이터 체크
  if (!user_id || !refrigerator_id || !new_name || !new_type) {
    errLog("REFRIG_04", 400, "Bad Request", {
      user_id: user_id,
      refrigerator_id: refrigerator_id,
      new_name: new_name,
      new_type: new_type,
      message: "잘못된 입력 데이터입니다."
    });
    return res.status(400).json({ message: "잘못된 입력 데이터입니다." });
  }

  try {
    // 2. 냉장고 업데이트
    const [updateResult] = await pool.execute(
      "UPDATE Refrigerator SET refrigerator_name = ?, refrigerator_type = ? WHERE refrigerator_id = ? AND user_id = ?",
      [new_name, new_type, refrigerator_id, user_id]
    );

    if (updateResult.affectedRows === 0) {
      errLog("REFRIG_04", 404, "Not Found", {
        user_id: user_id,
        refrigerator_id: refrigerator_id,
        message: "해당 냉장고를 찾을 수 없습니다."
      });
      return res
        .status(404)
        .json({ message: "해당 냉장고를 찾을 수 없습니다." });
    }

    // 3. 유저의 모든 냉장고 정보 다시 가져오기
    const result = await getRefrigeratorData(user_id);

    // 4. 결과가 없는 경우 처리
    if (result.length === 0) {
      errLog("REFRIG_04", 404, "Not Found", {
        user_id: user_id,
        refrigerator_id: refrigerator_id,
        message: "냉장고 정보를 찾을 수 없습니다."
      });
      return res
        .status(404)
        .json({ message: "냉장고 정보를 찾을 수 없습니다." });
    }
    errLog("REFRIG_04", 200, "OK");
    return res.status(200).json(result);

  } catch (err) {
    errLog("REFRIG_04", 500, "Internal Server Error", {
      user_id: user_id,
      error: err.message,
    });
    res
      .status(500)
      .json({ message: "냉장고 업데이트에 실패했습니다. 다시 시도해주세요." });
  }
});

// REFRIG_05 : 냉장고 칸 추가
router.post("/addRefrig", async (req, res) => {
  const { user_id, refrigerator_name, refrigerator_type } = req.body;

  // 1. 입력 데이터 체크
  if (!user_id || !refrigerator_name || !refrigerator_type) {
    errLog("REFRIG_05", 400, "Bad Request", {
      user_id: user_id,
      refrigerator_name: refrigerator_name,
      refrigerator_type: refrigerator_type,
      message: "잘못된 입력 데이터입니다."
    });
    return res.status(400).json({ message: "잘못된 입력 데이터입니다." });
  }

  try {
    // 2. 유저의 냉장고 칸 수 체크
    const [existingFridges] = await pool.query(
      "SELECT COUNT(*) as count FROM Refrigerator WHERE user_id = ?",
      [user_id]
    );

    if (existingFridges[0].count >= 10) {
      errLog("REFRIG_05", 409, "Conflict", {
        user_id: user_id,
        message: "냉장고 칸은 최대 10칸까지 추가할 수 있습니다."
      });
      return res
        .status(409)
        .json({ message: "냉장고 칸은 최대 10칸까지 추가할 수 있습니다." });
    }

    // 3. 냉장고 칸 추가
    const [addResult] = await pool.execute(
      "INSERT INTO Refrigerator (user_id, refrigerator_name, refrigerator_type) VALUES (?, ?, ?)",
      [user_id, refrigerator_name, refrigerator_type]
    );

    if (addResult.affectedRows === 0) {
      errLog("REFRIG_05", 500, "Internal Server Error", {
        user_id: user_id,
        error: err.message,
      });
      return res
        .status(500)
        .json({ message: "냉장고 칸 추가에 실패했습니다. 다시 시도해주세요." });
    }

    // 4. 유저의 모든 냉장고 정보 다시 가져오기
    const result = await getRefrigeratorData(user_id);

    // 5. 결과가 없는 경우 처리
    if (result.length === 0) {
      errLog("REFRIG_05", 404, "Not Found", {
        user_id: user_id,
        message: "냉장고 정보를 찾을 수 없습니다."
      });
      return res
        .status(404)
        .json({ message: "냉장고 정보를 찾을 수 없습니다." });
    }
    errLog("REFRIG_05", 200, "OK");
    return res.status(200).json(result);

  } catch (err) {
    errLog("REFRIG_05", 500, "Internal Server Error", {
      user_id: user_id,
      error: err.message,
    });
    res
      .status(500)
      .json({ message: "냉장고 칸 추가에 실패했습니다. 다시 시도해주세요." });
  }
});

// REFRIG_06 : 냉장고 칸 삭제
router.post("/delRefrig", async (req, res) => {
  const { user_id, refrigerator_id } = req.body;

  // 1. 입력 데이터 체크
  if (!user_id || !refrigerator_id) {
    errLog("REFRIG_06", 400, "Bad Request", {
      user_id: user_id,
      refrigerator_id: refrigerator_id,
      message: "잘못된 입력 데이터입니다."
    });
    return res.status(400).json({ message: "잘못된 입력 데이터입니다." });
  }

  let connection;

  try {
    // 2. 데이터베이스 연결
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 3. 유저의 냉장고 칸 수 체크
    const [existingFridges] = await connection.query(
      "SELECT COUNT(*) as count FROM Refrigerator WHERE user_id = ?",
      [user_id]
    );

    if (existingFridges[0].count <= 2) {
      await connection.rollback();
      errLog("REFRIG_06", 409, "Conflict", {
        user_id: user_id,
        message: "냉장고 칸은 최소 2칸을 유지해야 합니다."
      });
      return res
        .status(409)
        .json({ message: "냉장고 칸은 최소 2칸을 유지해야 합니다." });
    }

    // 4. 해당 냉장고 칸과 그 안의 모든 재료 삭제
    await connection.query(
      "DELETE FROM RefrigeratorIngredients WHERE refrigerator_id = ?",
      [refrigerator_id]
    );

    const [deleteResult] = await connection.query(
      "DELETE FROM Refrigerator WHERE refrigerator_id = ? AND user_id = ?",
      [refrigerator_id, user_id]
    );

    if (deleteResult.affectedRows === 0) {
      await connection.rollback();
      errLog("REFRIG_06", 404, "Not Found", {
        user_id: user_id,
        refrigerator_id: refrigerator_id,
        message: "해당 냉장고 칸을 찾을 수 없습니다."
      });
      return res
        .status(404)
        .json({ message: "해당 냉장고 칸을 찾을 수 없습니다." });
    }

    // 5. 트랜잭션 커밋
    await connection.commit();

    // 6. 유저의 모든 냉장고 정보 다시 가져오기
    const result = await getRefrigeratorData(user_id);

    // 7. 결과가 없는 경우 처리
    if (result.length === 0) {
      errLog("REFRIG_06", 404, "Not Found", {
        user_id: user_id,
        message: "냉장고 정보를 찾을 수 없습니다."
      });
      return res
        .status(404)
        .json({ message: "냉장고 정보를 찾을 수 없습니다." });
    }

    connection.release();

    errLog("REFRIG_06", 200, "OK");
    return res.status(200).json(result);
  } catch (err) {
    console.error(err);

    // 8. 트랜잭션 롤백
    if (connection) await connection.rollback();

    errLog("REFRIG_06", 500, "Internal Server Error", {
      user_id: user_id,
      error: err.message,
    });
    res
      .status(500)
      .json({ message: "냉장고 칸 삭제에 실패했습니다. 다시 시도해주세요." });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;
