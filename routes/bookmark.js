const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = require("../models/user");
const Recipe = require("../models/recipemeta");

router.use(express.json());

// BaseUrl : /bookmark

// BOOKMK_01
router.post("/getBookmark", async (req, res) => {
  // Bookmark list - Home
  // recipe_no 배열 반환
  const { user_id } = req.body;

  try {
    // 1. User Collection에서 user_id를 키값으로 해 유저 검색
    const getUserProfile = await User.findOne({ user_id });

    if (!getUserProfile) {
      return res.status(400).json({ message: "잘못된 유저 정보입니다." });
    }

    // 1-1. 찾은 유저의 bookmark 값 반환 "user_bookmark": ["recipe_no", "recipe_no", "recipe_no"]
    let { user_bookmark } = getUserProfile;

    return res.status(200).json({ bookmark: user_bookmark });
  } catch (err) {
    console.error("Error getting bookmark: ", err);
    res.status(500).json({
      message: "즐겨찾기 가져오기에 실패했습니다. 다시 시도해주세요.",
    });
  }
});

// BOOKMK_02
router.post("/getBookmarkList", async (req, res) => {
  // Bookmark list - Mypage
  // recipe_no, recipe_title 배열 반환
  const { user_id } = req.body;
  try {
    // 1. User Collection에서 user_id를 키값으로 해 유저 검색
    const getUserProfile = await User.findOne({ user_id });

    if (!getUserProfile) {
      return res.status(400).json({ message: "잘못된 유저 정보입니다." });
    }

    // 1-1. 찾은 유저의 bookmark 값 반환 "user_bookmark": ["recipe_no", "recipe_no", "recipe_no"]
    const user_bookmark = getUserProfile.user_bookmark;

    // user_bookmark 값이 없거나 배열의 길이가 0인 경우
    if (!user_bookmark || user_bookmark.length === 0) {
      return res.status(200).json({ user_bookmark: [] });
    }

    // 2. Recipe Collection에서 bookmark된 recipe_no로 레시피 검색
    const recipes = await Recipe.find(
      { recipe_no: { $in: user_bookmark } },
      "recipe_no recipe_title"
    );

    // 3. 검색된 레시피를 반환
    return res.status(200).json({ user_bookmark: recipes });
  } catch (err) {
    return res.status(500).json({
      message: "즐겨찾기 목록 불러오기에 실패했습니다. 다시 시도해주세요.",
    });
  }
});

// BOOKMK_03
router.post("/removeBookmark", async (req, res) => {
  const { user_id, recipe_no } = req.body;
  try {
    // 1. User Collection에서 user_id를 키값으로 해 유저 검색
    const getUserProfile = await User.findOne({ user_id });

    if (!getUserProfile) {
      return res.status(400).json({ message: "잘못된 유저 정보입니다." });
    }

    // 1-1. 찾은 유저의 bookmark 값 반환 "user_bookmark": ["recipe_no", "recipe_no", "recipe_no"]
    let { user_bookmark } = getUserProfile;

    // user_bookmark 값이 없거나 배열의 길이가 0인 경우
    if (!user_bookmark || user_bookmark.length === 0) {
      return res.status(200).json({ message: "즐겨찾기한 레시피가 없습니다." });
    }

    // 2. user_bookmark에서 recipe_no 삭제한 배열 반환
    user_bookmark = user_bookmark.filter((rn) => rn !== recipe_no);

    // 3. 해당 배열 user정보에 저장
    const updateBookmark = await User.findOneAndUpdate(
      { user_id },
      {
        user_bookmark,
      }
    );

    if (!updateBookmark) {
      return res.status(404).json({ message: "잘못된 유저 정보입니다." });
    }

    return res.status(200).json({ message: "즐겨찾기 목록이 저장되었습니다" });
  } catch (err) {
    console.error("Error updateing bookmark: ", err);
    res.status(500).json({
      message: "즐겨찾기 목록 저장에 실패했습니다. 다시 시도해주세요.",
    });
  }
});

module.exports = router;
