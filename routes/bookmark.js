const express = require("express");
const router = express.Router();

const { pool } = require("../scripts/connectMySQL");
const { validateSession } = require("../utils/sessionUtils"); // 유틸리티 함수 임포트

router.use(express.json());

// BaseUrl : /bookmark

// BOOKMK_01 : 북마크 가져오기 - 레시피 목록에서 쓰일 북마크 목록
router.post("/getBookmark", async (req, res) => {
  const { user_id, access_token } = req.body;

  // 0. Session 테이블에서 user_id와 access_token이 올바르게 짝지어져 있는지 확인
  const isValidSession = await validateSession(user_id, access_token);
  if (!isValidSession) {
    return res
      .status(401)
      .json({ message: "user_id와 access_token이 일치하지 않습니다." });
  }

  // 1. 입력 데이터 체크
  if (!user_id) {
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
    console.error("Backend BOOKMK_01: ", err);
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
    console.log("Backend BOOKMK_02: Unauthorized, ", user_id);
    return res
      .status(401)
      .json({ message: "user_id와 access_token이 일치하지 않습니다." });
  }

  // 1. 입력 데이터 체크
  if (!user_id) {
    console.log("Backend BOOKMK_02: Bad Request, ", user_id);
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
      recipe_no: row.recipe_id.toString(),
      recipe_title: row.recipe_title,
    }));

    return res.status(200).json({ user_bookmark });
  } catch (err) {
    console.error("Backend BOOKMK_02: ", err);
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
    console.log("Backend BOOKMK_03: Unauthorized, ", user_id);
    return res
      .status(401)
      .json({ message: "user_id와 access_token이 일치하지 않습니다." });
  }

  // 1. 입력 데이터 체크
  if (!user_id || !recipe_id) {
    console.log("Backend BOOKMK_03: Bad Request, ", user_id);
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
    console.error("Backend BOOKMK_03: ", err);
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
    console.log("Backend BOOKMK_03: Unauthorized, ", user_id);
    return res
      .status(401)
      .json({ message: "user_id와 access_token이 일치하지 않습니다." });
  }

  // 1. 입력 데이터 체크
  if (!user_id || !recipe_id) {
    console.log("Backend BOOKMK_03: Bad Request, ", user_id);
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
      console.error("Backend BOOKMK_04: ", err);
      return res
        .status(409)
        .json({ message: "이미 북마크에 추가된 레시피입니다." });
    }

    console.error("Backend BOOKMK_04: ", err);
    res.status(500).json({
      message: "북마크 추가에 실패했습니다. 다시 시도해주세요.",
    });
  }
});

module.exports = router;
