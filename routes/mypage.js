const express = require("express");
const router = express.Router();
const { validateSession } = require("../utils/sessionUtils");
const pool = require("../scripts/connector");
const { errLog, infoLog, successLog } = require("../utils/logUtils");
router.use(express.json());

// BaseUrl : /mypage

// MYPAGE_01 : 마이페이지 불러오기
router.post("/getProfile", async (req, res) => {
  infoLog("MYPAGE_01", req.body);
  // 0. user_id 를 받아옴
  const { user_id, access_token } = req.body;
  const isValidSession = await validateSession(user_id, access_token);
  if (!isValidSession) {
    errLog("MYPAGE_01", 401, "Unauthorized", { user_id: user_id });
    return res
      .status(401)
      .json({ message: "user_id와 access_token이 일치하지 않습니다." });
  }

  try {
    // 1. User 테이블에서 user_id를 키값으로 유저 검색 - user_email
    const [getUserProfile] = await pool.query(
      "SELECT user_email FROM User WHERE user_id = ?",
      [user_id]
    );

    // 2. MyPage 테이블에서 user_id를 키값으로 유저 검색 - user_nickname, user_subscription, cate_no, situ_no
    const [getMyPageProfile] = await pool.query(
      "SELECT user_nickname, user_subscription, cate_no, situ_no FROM MyPage WHERE user_id = ?",
      [user_id]
    );

    if (!getUserProfile.length || !getMyPageProfile.length) {
      errLog("MYPAGE_01", 400, "Bad Request", { user_id: user_id });
      return res.status(400).json({ message: "잘못된 유저 정보입니다." });
    }

    // 3. 결과값 클라이언트로 보내기 위해 가져오기
    const user_email = getUserProfile[0].user_email;
    const user_nickname = getMyPageProfile[0].user_nickname;
    const user_subscription = getMyPageProfile[0].user_subscription;
    const user_prefer = getMyPageProfile.map((profile) => ({
      cate_no: profile.cate_no,
      situ_no: profile.situ_no,
    }));

    // 4. 클라이언트로 전달
    successLog("MYPAGE_01");
    return res.status(200).json({
      user_id,
      user_email,
      user_nickname,
      user_subscription,
      user_prefer,
    });
  } catch (err) {
    errLog("MYPAGE_01", 500, "Internal Server Error", {
      user_id: user_id,
      error: err.message,
    });
    return res.status(500).json({
      message: "마이페이지 불러오기에 실패했습니다. 다시 시도해주세요.",
    });
  }
});

// MYPAGE_02 : 마이페이지 수정
router.post("/updateProfile", async (req, res) => {
  infoLog("MYPAGE_02", req.body);
  const {
    user_id,
    user_nickname,
    user_subscription,
    user_prefer,
    user_email,
    access_token,
  } = req.body;

  const isValidSession = await validateSession(user_id, access_token);
  if (!isValidSession) {
    errLog("MYPAGE_02", 401, "Unauthorized", { user_id: user_id });
    return res
      .status(401)
      .json({ message: "user_id와 access_token이 일치하지 않습니다." });
  }

  // 최종적인 회원 정보 업데이트 던지기
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. MyPage 테이블 업데이트
    await connection.query(
      "UPDATE MyPage SET user_nickname = ?, user_subscription = ?, cate_no = ?, situ_no = ? WHERE user_id = ?",
      [
        user_nickname,
        user_subscription == "true",
        user_prefer[0].cate_no,
        user_prefer[0].situ_no,
        user_id,
      ]
    );

    // 0. 사용자가 이전에 구독했는지 확인
    const [rows] = await connection.query(
      "SELECT user_id FROM Subscription WHERE user_id = ?",
      [user_id]
    );

    // 1. Subscription 테이블 업데이트

    if (rows.length == 0 && user_subscription == "true") {
      // 2-1. user_subscription이 false -> true일 때 Subscription 테이블에 데이터 추가
      for (const prefer of user_prefer) {
        const { cate_no, situ_no } = prefer;
        await connection.query(
          "INSERT INTO Subscription (user_id, user_email, user_nickname, cate_no, situ_no) VALUES (?, ?, ?, ?, ?)",
          [user_id, user_email, user_nickname, cate_no, situ_no]
        );
      }
    } else if (rows.length > 0 && user_subscription != "true") {
      // 2-2. user_subscription이 true -> false일 때 Subscription 테이블에서 해당 유저 정보 삭제
      await connection.query("DELETE FROM Subscription WHERE user_id = ?", [
        user_id,
      ]);
    } else {
      // user_subscription 값이 변하지 않았을 때
      // 다른 값들만 업데이트
      for (const prefer of user_prefer) {
        const { cate_no, situ_no } = prefer;
        await connection.query(
          "UPDATE Subscription SET user_email = ?, user_nickname = ? WHERE user_id = ? AND cate_no = ? AND situ_no = ?",
          [user_email, user_nickname, user_id, cate_no, situ_no]
        );
      }
    }

    await connection.commit();
    successLog("MYPAGE_02");
    res.status(200).json({ message: "마이페이지가 저장되었습니다." });
  } catch (err) {
    await connection.rollback();
    errLog("MYPAGE_02", 500, "Internal Server Error", {
      user_id: user_id,
      error: err.message,
    });
    res
      .status(500)
      .json({ message: "마이페이지 저장에 실패했습니다. 다시 시도해주세요." });
  } finally {
    connection.release();
  }
});

// MYPAGE_03 : 사용자 선호도 가져오기
router.post("/getBasicProfile", async (req, res) => {
  infoLog("MYPAGE_03", req.body);
  // 0. user_id 를 받아옴
  const { user_id, access_token } = req.body;
  const isValidSession = await validateSession(user_id, access_token);
  if (!isValidSession) {
    errLog("MYPAGE_03", 401, "Unauthorized", { user_id: user_id });
    return res
      .status(401)
      .json({ message: "user_id와 access_token이 일치하지 않습니다." });
  }

  try {
    // 1. MyPage 테이블에서 user_id를 키값으로 유저 검색 - cate_no, situ_no
    const [getUserProfile] = await pool.query(
      "SELECT user_nickname, cate_no, situ_no FROM MyPage WHERE user_id = ?",
      [user_id]
    );

    if (!getUserProfile.length || !getUserProfile.length) {
      errLog("MYPAGE_03", 400, "Bad Request", { user_id: user_id });
      return res.status(400).json({ message: "잘못된 유저 정보입니다." });
    }

    // 3. 결과값 클라이언트로 보내기 위해 가져오기
    const user_nickname = getUserProfile[0].user_nickname;
    const user_prefer = getUserProfile.map((profile) => ({
      cate_no: profile.cate_no,
      situ_no: profile.situ_no,
    }));

    // 4. 클라이언트로 전달
    successLog("MYPAGE_03");
    return res.status(200).json({
      user_nickname,
      user_prefer,
    });
  } catch (err) {
    errLog("MYPAGE_03", 500, "Internal Server Error", {
      user_id: user_id,
      error: err.message,
    });
    return res.status(500).json({
      message: "마이페이지 불러오기에 실패했습니다. 다시 시도해주세요.",
    });
  }
});

module.exports = router;
