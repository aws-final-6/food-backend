const express = require("express");
const router = express.Router();
const { pool } = require("../scripts/connectMySQL");

router.use(express.json());

// BaseUrl : /mypage

// MYPAGE_01 : 마이페이지 불러오기
router.post("/getProfile", async (req, res) => {
  // 0. user_id 를 받아옴
  const { user_id } = req.body;

  try {
    // 1. User 테이블에서 user_id를 키값으로 유저 검색
    const [getUserProfile] = await pool.query(
      "SELECT * FROM User WHERE user_id = ?",
      [user_id]
    );
    const [getMyPageProfile] = await pool.query(
      "SELECT * FROM MyPage WHERE user_id = ?",
      [user_id]
    );

    if (getUserProfile.length === 0 || getMyPageProfile.length === 0) {
      console.log("Backend MYPAGE_01: Bad Request, ", user_id);
      return res.status(400).json({ message: "잘못된 유저 정보입니다." });
    }

    // 2. 결과값 클라이언트로 보내기 위해 가져오기
    const user_email = getUserProfile[0].user_email;
    const user_nickname = getMyPageProfile[0].user_nickname;
    const user_subscription = getMyPageProfile[0].user_subscription;
    const user_prefer = JSON.parse(getMyPageProfile[0].user_prefer || "[]");

    // 3. 클라이언트로 res json형태로 전달
    return res.status(200).json({
      user_id,
      user_email,
      user_nickname,
      user_subscription,
      user_prefer,
    });
  } catch (err) {
    console.error("Backend MYPAGE_01: ", err);
    return res.status(500).json({
      message: "마이페이지 불러오기에 실패했습니다. 다시 시도해주세요.",
    });
  }
});

// MYPAGE_02 : 마이페이지 수정
// @@@@@@@@@@@@@@@@@@@@ 질문 : user테이블로 뺐던 email은 같이 던져줄건지? 일단 빼긴 했는데 ㅎ...
router.post("/updateProfile", async (req, res) => {
  const { user_id, user_nickname, user_subscription, user_prefer } = req.body;

  // 3. 최종적인 회원 정보 업데이트 던지기
  try {
    // MyPage 테이블 업데이트
    await pool.query(
      "UPDATE MyPage SET user_nickname = ?, user_subscription = ?, user_prefer = ?, user_searchfilter = ? WHERE user_id = ?",
      [
        user_nickname,
        user_subscription,
        JSON.stringify(user_prefer),
        JSON.stringify(user_searchfilter),
        user_id,
      ]
    );

    res.status(200).json({ message: "마이페이지가 저장되었습니다." });
  } catch (err) {
    console.error("Backend MYPAGE_02: ", err);
    res
      .status(500)
      .json({ message: "마이페이지 저장에 실패했습니다. 다시 시도해주세요." });
  }
});

module.exports = router;
