const express = require("express");
const router = express.Router();

const { pool } = require("../scripts/connectMySQL");
const { validateSession } = require("../utils/sessionUtils");
const { errLog } = require("../utils/logUtils");

router.use(express.json());

// BaseUrl : /bookmark

// BOOKMK_01 : 북마크 가져오기 - 레시피 목록에서 쓰일 북마크 목록
router.post("/getBookmark", async (req, res) => {
  const { user_id, access_token } = req.body;

  // 0. Session 테이블에서 user_id와 access_token이 올바르게 짝지어져 있는지 확인
  const isValidSession = await validateSession(user_id, access_token);
  if (!isValidSession) {
    errLog("BOOKMK_01", 401, "Unauthorized", { user_id: user_id });
    return res
      .status(401)
      .json({ message: "user_id와 access_token이 일치하지 않습니다." });
  }

  // 1. 입력 데이터 체크
  if (!user_id) {
    errLog("BOOKMK_01", 400, "Bad Request", { user_id: user_id });
    return res.status(400).json({ message: "잘못된 유저 정보입니다." });
  }

  try {
    // 2. 북마크 목록 가져오기
    const [rows] = await pool.query(
      "SELECT recipe_id FROM Bookmark WHERE user_id = ?",
      [user_id]
    );

    // 3. 북마크 목록 반환
    const user_bookmark = rows.map((row) => row.recipe_id);

    return res.status(200).json({ user_bookmark });
  } catch (err) {
    errLog("BOOKMK_01", 500, "Internal Server Error", {
      user_id: user_id,
      error: err.message,
    });
    res.status(500).json({
      message: "즐겨찾기 가져오기에 실패했습니다. 다시 시도해주세요.",
    });
  }
});

// BOOKMK_02 : 북마크 가져오기 - 마이페이지에서 쓰일 북마크 목록
router.post("/getBookmarkList", async (req, res) => {
  const { user_id, access_token } = req.body;

  // 0. Session 테이블에서 user_id와 access_token이 올바르게 짝지어져 있는지 확인
  const isValidSession = await validateSession(user_id, access_token);
  if (!isValidSession) {
    errLog("BOOKMK_02", 401, "Unauthorized", { user_id: user_id });
    return res
      .status(401)
      .json({ message: "user_id와 access_token이 일치하지 않습니다." });
  }

  // 1. 입력 데이터 체크
  if (!user_id) {
    errLog("BOOKMK_02", 400, "Bad Request", { user_id: user_id });
    return res.status(400).json({ message: "잘못된 유저 정보입니다." });
  }

  try {
    // 2. 북마크된 레시피 목록 가져오기
    const [rows] = await pool.query(
      `SELECT b.recipe_id, r.recipe_title FROM Bookmark b JOIN Recipe r ON b.recipe_id = r.recipe_id WHERE b.user_id = ?`,
      [user_id]
    );

    // 3. 북마크 목록 반환
    const user_bookmark = rows.map((row) => ({
      recipe_id: row.recipe_id.toString(),
      recipe_title: row.recipe_title,
    }));

    return res.status(200).json({ user_bookmark });
  } catch (err) {
    errLog("BOOKMK_02", 500, "Internal Server Error", {
      user_id: user_id,
      error: err.message,
    });
    res.status(500).json({
      message: "즐겨찾기 가져오기에 실패했습니다. 다시 시도해주세요.",
    });
  }
});

// BOOKMK_03 : 북마크 삭제
router.post("/removeBookmark", async (req, res) => {
  const { user_id, access_token, recipe_id } = req.body;

  // 0. Session 테이블에서 user_id와 access_token이 올바르게 짝지어져 있는지 확인
  const isValidSession = await validateSession(user_id, access_token);
  if (!isValidSession) {
    errLog("BOOKMK_03", 401, "Unauthorized", { user_id: user_id });
    return res
      .status(401)
      .json({ message: "user_id와 access_token이 일치하지 않습니다." });
  }

  // 1. 입력 데이터 체크
  if (!user_id || !recipe_id) {
    errLog("BOOKMK_03", 400, "Bad Request", {
      user_id: user_id,
      recipe_id: recipe_id,
    });
    return res.status(400).json({ message: "잘못된 입력 데이터입니다." });
  }

  try {
    // 2. 북마크 삭제
    const [result] = await pool.query(
      "DELETE FROM Bookmark WHERE user_id = ? AND recipe_id = ?",
      [user_id, recipe_id]
    );

    return res
      .status(200)
      .json({ message: "북마크가 성공적으로 삭제되었습니다." });
  } catch (err) {
    errLog("BOOKMK_03", 500, "Internal Server Error", {
      user_id: user_id,
      recipe_id: recipe_id,
      error: err.message,
    });
    res.status(500).json({
      message: "북마크 삭제에 실패했습니다. 다시 시도해주세요.",
    });
  }
});

// BOOKMK_04 : 북마크 추가
router.post("/updateBookmark", async (req, res) => {
  const { user_id, access_token, recipe_id } = req.body;

  // 0. Session 테이블에서 user_id와 access_token이 올바르게 짝지어져 있는지 확인
  const isValidSession = await validateSession(user_id, access_token);
  if (!isValidSession) {
    errLog("BOOKMK_04", 401, "Unauthorized", { user_id: user_id });
    return res
      .status(401)
      .json({ message: "user_id와 access_token이 일치하지 않습니다." });
  }

  // 1. 입력 데이터 체크
  if (!user_id || !recipe_id) {
    errLog("BOOKMK_04", 400, "Bad Request", {
      user_id: user_id,
      recipe_id: recipe_id,
    });
    return res.status(400).json({ message: "잘못된 입력 데이터입니다." });
  }

  try {
    // 2. 북마크 추가
    await pool.query(
      "INSERT INTO Bookmark (user_id, recipe_id) VALUES (?, ?)",
      [user_id, recipe_id]
    );

    return res
      .status(200)
      .json({ message: "북마크가 성공적으로 추가되었습니다." });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      errLog("BOOKMK_04", 409, "Bad Request", {
        user_id: user_id,
        recipe_id: recipe_id,
      });
      return res
        .status(409)
        .json({ message: "이미 북마크에 추가된 레시피입니다." });
    }

    errLog("BOOKMK_04", 500, "Internal Server Error", {
      user_id: user_id,
      recipe_id: recipe_id,
      error: err.message,
    });
    res.status(500).json({
      message: "북마크 추가에 실패했습니다. 다시 시도해주세요.",
    });
  }
});

module.exports = router;
