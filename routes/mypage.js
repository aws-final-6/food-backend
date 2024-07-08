const express = require("express");
const router = express.Router();

const { readPool, writePool } = require("../scripts/connector");
const { errLog } = require("../utils/logUtils");

router.use(express.json());

// BaseUrl : /mypage

// MYPAGE_01 : 마이페이지 불러오기
router.post("/getProfile", async (req, res) => {
  // 0. user_id 를 받아옴
  const { user_id, access_token } = req.body;

  try {
    // 1. User 테이블에서 user_id를 키값으로 유저 검색 - user_email
    const [getUserProfile] = await readPool.query(
      "SELECT user_email FROM User WHERE user_id = ?",
      [user_id]
    );

    // 2. MyPage 테이블에서 user_id를 키값으로 유저 검색 - user_nickname, user_subscription, cate_no, situ_no
    const [getMyPageProfile] = await readPool.query(
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
  const { user_id, user_nickname, user_subscription, user_prefer, user_email } =
    req.body;

  let pre_subscription = null;
  const readConnection = await readPool.getConnection();
  const writeConnection = await writePool.getConnection();

  try {
    // 0. Subscription 체크를 위해 이전 값 불러오기 (readPool 사용)
    const [rows] = await readConnection.query(
      "SELECT user_subscription FROM MyPage WHERE user_id = ?",
      [user_id]
    );
    pre_subscription = rows.length
      ? Boolean(rows[0].user_subscription)
      : null;
    
    readConnection.release(); // 읽기 작업 후 연결 해제

    // 트랜잭션 시작 (writePool 사용)
    await writeConnection.beginTransaction();

    // 1. MyPage 테이블 업데이트
    await writeConnection.query(
      "UPDATE MyPage SET user_nickname = ?, user_subscription = ?, cate_no = ?, situ_no = ? WHERE user_id = ?",
      [
        user_nickname,
        user_subscription == "true",
        user_prefer[0].cate_no,
        user_prefer[0].situ_no,
        user_id,
      ]
    );

    // 2. Subscription 테이블 업데이트
    if (pre_subscription === false && user_subscription === true) {
      // 2-1. user_subscription이 false -> true일 때 Subscription 테이블에 데이터 추가
      for (const prefer of user_prefer) {
        const { cate_no, situ_no } = prefer;
        await writeConnection.query(
          "INSERT INTO Subscription (user_id, user_email, user_nickname, cate_no, situ_no) VALUES (?, ?, ?, ?, ?)",
          [user_id, user_email, user_nickname, cate_no, situ_no]
        );
      }
    } else if (pre_subscription === true && user_subscription === false) {
      // 2-2. user_subscription이 true -> false일 때 Subscription 테이블에서 해당 유저 정보 삭제
      await writeConnection.query("DELETE FROM Subscription WHERE user_id = ?", [
        user_id,
      ]);
    }

    await writeConnection.commit();
    res.status(200).json({ message: "마이페이지가 저장되었습니다." });
  } catch (err) {
    await writeConnection.rollback();
    errLog("MYPAGE_02", 500, "Internal Server Error", {
      user_id: user_id,
      error: err.message,
    });
    res
      .status(500)
      .json({ message: "마이페이지 저장에 실패했습니다. 다시 시도해주세요." });
  } finally {
    writeConnection.release(); // 트랜잭션 작업 후 연결 해제
  }
});

module.exports = router;
