const express = require("express");
const router = express.Router();
const axios = require("axios");
const qs = require("qs");
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const mongoose = require("mongoose");
const User = require("../models/user");
const Recipe = require("../models/recipemeta");
const Seasonal = require("../models/seasonal");

router.use(express.json());

// BaseUrl : /search

// SEARCH_01
router.post("/getTitleSearchList", async (req, res) => {
  const { keyword } = req.body;
  if (!keyword) {
    return res.status(400).json({ message: "검색어를 입력해주세요." });
  }

  try {
    // 1. 제목으로 검색 (대소문자 구분 없이 포함하는 결과)
    const searchTitle = await Recipe.find({
      recipe_title: new RegExp(keyword, "i"),
    }).select("recipe_no recipe_title recipe_thumbnail");

    // 2-1. 검색 결과가 없을 때 예외 처리
    if (searchTitle.length === 0) {
      return res
        .status(404)
        .json({ message: "제목이 일치하는 레시피가 없습니다." });
    }

    // 2-2. 합친 결과 중복 제거
    const uniqueList = [];
    const check = new Set();

    searchTitle.forEach((recipe) => {
      if (!check.has(recipe.recipe_no)) {
        uniqueList.push(recipe);
        check.add(recipe.recipe_no);
      }
    });

    // 3. 최종 결과 형식으로 변환
    const search_list = uniqueList.map((r) => ({
      recipe_no: r.recipe_no,
      recipe_title: r.recipe_title,
      recipe_thumbnail: r.recipe_thumbnail,
    }));

    res.json({
      search_list,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "레시피 제목 검색에 실패했습니다. 다시 시도해주세요." });
  }
});

// SEARCH_02
router.post("/getIngSearchList", async (req, res) => {
  const { keyword, user_id } = req.body;
  // 0. 검색어 없을 때
  if (!keyword) {
    return res.status(400).json({ message: "검색어를 입력해주세요." });
  }

  // 1. 마이페이지 제외필터 찾아오기 위해 유저 검색
  const getUserSearchfilter = await User.findOne({ user_id });
  if (!getUserSearchfilter) {
    return res.status(400).json({ message: "잘못된 유저 정보입니다." });
  }

  // 1-1. 제외필터 없을 시 빈배열처리
  const user_searchfilter = getUserSearchfilter.user_searchfilter;
  if (!user_searchfilter || user_searchfilter.length === 0) {
    user_searchfilter = [];
  }

  try {
    // 2. 재료로 검색 (대소문자 구분 없이 포함하는 결과)
    // 2-1. keyword 대소문자 구분 없이 검색하기 위한 정규 표현식 생성
    const keywordRegex = new RegExp(keyword, "i");

    // 2-2. 제외필터 대소문자 구분 없이 검색하기 위한 정규 표현식 생성, 빈 배열일 경우 빈 배열 처리
    const exclusionRegexes = user_searchfilter.map(
      (filter) => new RegExp(filter, "i")
    );

    // 2-3. Recipe 컬렉션에서 검색
    const searchIngredient = await Recipe.find({
      // 재료 필드에서 검색조건 적용
      recipe_ingredient: {
        // 모든 조건 만족하는 결과를 위한 all
        $all: [
          // keyword 포함하는지 eleMatch
          { $eleMatch: { $regex: keywordRegex } },
          // 제외필터 포함 안하는지 not
          ...exclusionRegexes.map((regex) => ({ $not: { $regex: regex } })),
        ],
      },
    }).select("recipe_no recipe_title recipe_thumbnail");

    // 2-1. 검색 결과가 없을 때 예외 처리
    if (searchIngredient.length === 0) {
      return res
        .status(404)
        .json({ message: "재료가 일치하는 레시피가 없습니다." });
    }

    // 3. 최종 결과 형식으로 변환
    const search_list = searchIngredient.map((r) => ({
      recipe_no: r.recipe_no,
      recipe_title: r.recipe_title,
      recipe_thumbnail: r.recipe_thumbnail,
    }));

    res.json({
      search_list,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "레시피 재료 검색에 실패했습니다. 다시 시도해주세요." });
  }
});

// SEARCH_03
router.get("/autocomplete/:keyword", async (req, res) => {
  // 1. keyword 파라미터로 받아오기
  const { keyword } = req.params;

  if (!keyword) {
    return res.status(400).json({ message: "검색어를 입력해주세요." });
  }

  try {
    // 2. 외부 API 호출 (만개의레시피 검색 API)
    const response = await axios.get(
      `https://www.10000recipe.com/recipe/ajax.html?q_mode=autoComplete&term=${encodeURIComponent(
        keyword
      )}`
    );

    // 외부 API 응답을 클라이언트가 원하는 형식으로 변환
    const autocomplete = response.data.map((item) => item.label);

    res.json({
      autocomplete,
    });
  } catch (error) {
    res.status(500).json({
      message: "연관 검색어 불러오기에 실패했습니다. 다시 시도해주세요.",
    });
  }
});

// SEARCH_04
router.post("/getIngSearchListFiltered", async (req, res) => {
  // 제외필터 추가적용 재료검색
  const { keyword, user_id, keyword_filter } = req.body;
  // 0. 검색어 없을 때
  if (!keyword) {
    return res.status(400).json({ message: "검색어를 입력해주세요." });
  }

  // 1. 마이페이지 제외필터 찾아오기 위해 유저 검색
  const getUserSearchfilter = await User.findOne({ user_id });
  if (!getUserSearchfilter) {
    return res.status(400).json({ message: "잘못된 유저 정보입니다." });
  }

  // 1-1. 제외필터 없을 시 빈배열처리
  const user_searchfilter = getUserSearchfilter.user_searchfilter;
  if (!user_searchfilter || user_searchfilter.length === 0) {
    user_searchfilter = [];
  }

  try {
    // 2. 재료로 검색 (대소문자 구분 없이 포함하는 결과)
    // 2-1. keyword 대소문자 구분 없이 검색하기 위한 정규 표현식 생성
    const keywordRegex = new RegExp(keyword, "i");

    // 2-2. 제외필터 대소문자 구분 없이 검색하기 위한 정규 표현식 생성, 빈 배열일 경우 빈 배열 처리
    const exclusionRegexes = user_searchfilter.map(
      (filter) => new RegExp(filter, "i")
    );

    // 2-3. 추가 제외필터 정규표현식 생성
    const addExclusionRegexes = keyword_filter.map(
      (filter) => new RegExp(filter, "i")
    );

    // 2-3. Recipe 컬렉션에서 검색
    const searchIngredient = await Recipe.find({
      // 재료 필드에서 검색조건 적용
      recipe_ingredient: {
        // 모든 조건 만족하는 결과를 위한 all
        $all: [
          // keyword 포함하는지 eleMatch
          { $eleMatch: { $regex: keywordRegex } },
          // 제외필터 포함 안하는지 not
          ...exclusionRegexes.map((regex) => ({ $not: { $regex: regex } })),
          // 추가 제외필터 포함 안하는지 not
          ...addExclusionRegexes.map((regex) => ({ $not: { $regex: regex } })),
        ],
      },
    }).select("recipe_no recipe_title recipe_thumbnail");

    // 2-1. 검색 결과가 없을 때 예외 처리
    if (searchIngredient.length === 0) {
      return res
        .status(404)
        .json({ message: "재료가 일치하는 레시피가 없습니다." });
    }

    // 3. 최종 결과 형식으로 변환
    const search_list = searchIngredient.map((r) => ({
      recipe_no: r.recipe_no,
      recipe_title: r.recipe_title,
      recipe_thumbnail: r.recipe_thumbnail,
    }));

    res.json({
      search_list,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "레시피 재료 검색에 실패했습니다. 다시 시도해주세요." });
  }
});

module.exports = router;
