const express = require("express");
const router = express.Router();
const qs = require("qs");
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

const {pool} = require("../scripts/connectMySQL");

router.use(express.json());

// BaseUrl : /refrig

// REFRIG_01 : 냉장고 정보 가져오기
router.post("/getRefrigWithIngredients", async (req, res) => {
  const { user_id } = req.body;
  // 1. user_id 체크
  if (!user_id) {
    return res.status(400).json({ message: "잘못된 유저 정보입니다." });
  }

  try {
    // 2. user_id로 냉장고 및 재료 정보 가져오기
    const [rows] = await pool.query(`
      SELECT 
        r.refrigerator_id, r.refrigerator_name, r.refrigerator_type,
        ri.refrigerator_ing_id, ri.refrigerator_ing_name, ri.expired_date, ri.enter_date, ri.color
      FROM Refrigerator r
      LEFT JOIN RefrigeratorIngredients ri ON r.refrigerator_id = ri.refrigerator_id
      WHERE r.user_id = ?
    `, [user_id]);

    // 3. 결과값 클라이언트로 보내기 위해 데이터 구조화
    const result = {};
    rows.forEach(row => {
      const { refrigerator_id, refrigerator_name, refrigerator_type, refrigerator_ing_id, refrigerator_ing_name, expired_date, enter_date, color } = row;
      if (!result[refrigerator_id]) {
        result[refrigerator_id] = {
          refrigerator_id,
          refrigerator_name,
          refrigerator_type,
          ingredients: []
        };
      }
      if (refrigerator_ing_id) {
        result[refrigerator_id].ingredients.push({
          refrigerator_ing_id,
          refrigerator_ing_name,
          expired_date,
          enter_date,
          color
        });
      }
    });

    // 결과가 없는 경우 처리
    if (Object.keys(result).length === 0) {
      return res.status(404).json({ message: "냉장고 정보를 찾을 수 없습니다." });
    }

    return res.status(200).json(Object.values(result));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "냉장고 데이터를 불러오지 못했습니다. 다시 시도해주세요." });
  }
});

// REFRIG_02 : 재료 수기로 입력받기 
router.post("/addIngredient", async (req, res) => {
  // 1. body값 받기
  const { user_id, ref_no, ing_name, ing_exdate, ing_indate, color } = req.body;

  // 1-1. 냉장고 칸 값 체크
  if (!["ref_1", "ref_2", "ref_3", "ref_4"].includes(ref_no)) {
    return res
      .status(400)
      .json({ message: "냉장고 칸 값이 잘못 입력되었습니다." });
  }

  // 1-2. 재료 데이터 생성
  const ingredient = {
    ing_name,
    ing_exdate: ing_exdate,
    ing_indate: ing_indate,
    color: color,
    ref_no: ref_no,
  };

  try {
    // 2. user_id로 냉장고 있는지 확인
    let refrigerator = await Refrigerator.findOne({ user_id });

    if (refrigerator) {
      // 2-1. 값 있으면 업데이트
      refrigerator[ref_no].ingredients.push(ingredient);
    } else {
      // 2-2. 값 없으면 추가 - 완전 초기진입 시
      // 기본 냉장고값을 생성한 후, 여기에 추가할 재료를 넣음
      refrigerator = new Refrigerator({
        user_id,
        ref_1: { ingredients: [], title: "냉장고", refType: 1 },
        ref_2: { ingredients: [], title: "냉동고", refType: 2 },
        ref_3: { ingredients: [], title: "김치냉장고", refType: 1 },
        ref_4: { ingredients: [], title: "선반", refType: 3 },
      });
      refrigerator[ref_no].ingredients.push(ingredient);
    }

    // 3. 저장
    await refrigerator.save();
    res.status(200).json({ message: "냉장고에 재료가 저장되었습니다." });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "재료 저장에 실패했습니다. 다시 시도해주세요." });
  }
});

// REFRIG_03
router.post("/delIngredient", async (req, res) => {
  const { user_id, _id } = req.body;

  // 1. 필수 값 체크
  if (!user_id || !_id) {
    return res.status(400).json({ message: "필수값이 입력되지 않았습니다." });
  }

  try {
    // 2. user_id로 냉장고 있는지 확인
    const refrigerator = await Refrigerator.findOne({ user_id });

    if (!refrigerator) {
      return res
        .status(404)
        .json({ message: "저장된 냉장고 데이터가 없습니다." });
    }

    // 3. 각 ref 배열에서 _id를 가진 재료 삭제
    const refs = ["ref_1", "ref_2", "ref_3", "ref_4"];
    let ingredientFound = false;

    for (const ref of refs) {
      const index = refrigerator[ref].findIndex(
        (item) => item._id.toString() === _id
      );

      // 순회하다 해당하는 _id 찾으면 삭제(splice)하고 break
      if (index !== -1) {
        refrigerator[ref].splice(index, 1);
        ingredientFound = true;
        break;
      }
    }

    if (!ingredientFound) {
      return res.status(404).json({ message: "재료를 찾을 수 없습니다." });
    }

    await refrigerator.save();
    res.status(200).json({ message: "재료가 삭제되었습니다." });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "재료 삭제에 실패했습니다. 다시 시도해주세요." });
  }
});

// REFRIG_04
router.post("/searchRecipe", async (req, res) => {
  const { ing_search } = req.body;

  // 1. 필수 값 체크
  if (!ing_search || !Array.isArray(ing_search) || ing_search.length === 0) {
    return res
      .status(400)
      .json({ message: "검색할 재료 리스트를 입력해주세요." });
  }

  try {
    // 2. 재료로 검색
    const searchIngredient = await Recipe.find({
      recipe_ingredient: {
        $all: ing_search.map((ingredient) => new RegExp(ingredient, "i")),
      },
    }).select("recipe_no recipe_title recipe_thumbnail");

    // 3-1. 검색 결과가 없을 때 예외 처리
    if (searchIngredient.length === 0) {
      return res
        .status(404)
        .json({ message: "재료가 모두 일치하는 레시피가 없습니다." });
    }

    // 3-2. 최종 결과 형식으로 변환
    const search_list = searchIngredient.map((r) => ({
      recipe_no: r.recipe_no,
      recipe_title: r.recipe_title,
      recipe_thumbnail: r.recipe_thumbnail,
    }));

    res.json({
      search_list,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "레시피 재료 검색에 실패했습니다. 다시 시도해주세요." });
  }
});

// REFRIG_05
router.post("/changeRefname", async (req, res) => {
  // 1. body값 받기
  const { user_id, ref_no, title } = req.body;

  // 1-1. 냉장고 칸 값 체크
  if (!["ref_1", "ref_2", "ref_3", "ref_4"].includes(ref_no)) {
    return res
      .status(400)
      .json({ message: "냉장고 칸 값이 잘못 입력되었습니다." });
  }

  try {
    // 2. user_id로 냉장고 있는지 확인
    let refrigerator = await Refrigerator.findOne({ user_id });

    if (refrigerator) {
      // 2-1. 값 있으면 업데이트
      refrigerator[ref_no].title = title;
    } else {
      // 2-2. 값 없으면 추가 - 완전 초기진입 시
      // 기본 냉장고값을 생성한 후, 여기서 타이틀을 수정
      refrigerator = new Refrigerator({
        user_id,
        ref_1: { ingredients: [], title: "냉장고", refType: 1 },
        ref_2: { ingredients: [], title: "냉동고", refType: 2 },
        ref_3: { ingredients: [], title: "김치냉장고", refType: 1 },
        ref_4: { ingredients: [], title: "선반", refType: 3 },
      });
      refrigerator[ref_no].title = title;
    }

    // 3. 저장
    await refrigerator.save();
    res.status(200).json({ message: "냉장고 칸 이름이 수정되었습니다." });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "냉장고 칸 이름 수정에 실패했습니다. 다시 시도해주세요.",
    });
  }
});

module.exports = router;
