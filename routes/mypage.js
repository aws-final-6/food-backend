const express = require("express");
const router = express.Router();
const axios = require("axios");
const qs = require("qs");
const mongoose = require("mongoose");
const User = require("../models/user");
const Recipe = require("../models/recipemeta");

router.use(express.json());

// BaseUrl : /mypage

// MYPAGE_01
router.post("/getProfile", async (req, res) => {
  // 0. user_id 를 받아옴
  const { user_id } = req.body;

  try {
    // 1. User Collection에서 user_id 를 키값으로 해 유저 검색
    const getUserProfile = await User.findOne({ user_id });

    if (!getUserProfile) {
      return res.status(400).json({ message: "잘못된 유저 정보입니다." });
    }

    // 2. 결과값 클라이언트로 보내기 위해 가져오기
    const user_email = getUserProfile.user_email;
    const user_nickname = getUserProfile.user_nickname;
    const user_subscription = getUserProfile.user_subscription;
    const user_prefer = getUserProfile.user_prefer;

    // 2-1. 제외필터 없으면 빈 배열로 처리
    let user_searchfilter = getUserProfile.user_searchfilter;
    if (!user_searchfilter || user_searchfilter.length === 0) {
      user_searchfilter = [];
    }

    // 3. 클라이언트로 res json형태로 전달
    return res.status(200).json({
      user_id,
      user_email,
      user_nickname,
      user_subscription,
      user_prefer,
      user_searchfilter,
    });
  } catch (err) {
    return res.status(500).json({
      message: "마이페이지 불러오기에 실패했습니다. 다시 시도해주세요.",
    });
  }
});

// MYPAGE_02
router.post("/updateProfile", async (req, res) => {
  const {
    user_id,
    user_email,
    user_nickname,
    user_subscription,
    user_prefer,
    user_searchfilter,
  } = req.body;

  // 3. 최종적인 회원 정보 업데이트 던지기
  try {
    const updateUser = await User.findOneAndUpdate(
      { user_id },
      {
        user_id,
        user_email,
        user_nickname,
        user_subscription,
        user_prefer,
        user_searchfilter,
      }
    );

    if (!updateUser) {
      return res.status(404).json({ message: "잘못된 유저 정보입니다." });
    }

    res.status(200).json({ message: "마이페이지가 저장되었습니다." });
  } catch (err) {
    console.error("Error registering user: ", err);
    res
      .status(500)
      .json({ message: "마이페이지 저장에 실패했습니다. 다시 시도해주세요." });
  }
});

module.exports = router;
