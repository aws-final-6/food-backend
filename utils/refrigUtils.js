const pool = require("../scripts/connector");

// user_id를 이용해 냉장고 정보를 불러오기
async function getRefrigeratorData(user_id) {
  const [rows] = await pool.query(
    `
    SELECT 
      r.refrigerator_id, r.refrigerator_name, r.refrigerator_type,
      ri.refrigerator_ing_id, ri.refrigerator_ing_name, ri.expired_date, ri.enter_date, ri.color
    FROM Refrigerator r
    LEFT JOIN RefrigeratorIngredients ri ON r.refrigerator_id = ri.refrigerator_id
    WHERE r.user_id = ?
    `,
    [user_id]
  );

  const result = {};
  rows.forEach((row) => {
    const {
      refrigerator_id,
      refrigerator_name,
      refrigerator_type,
      refrigerator_ing_id,
      refrigerator_ing_name,
      expired_date,
      enter_date,
      color,
    } = row;
    if (!result[refrigerator_id]) {
      result[refrigerator_id] = {
        refrigerator_id,
        refrigerator_name,
        refrigerator_type,
        ingredients: [],
      };
    }
    if (refrigerator_ing_id) {
      result[refrigerator_id].ingredients.push({
        refrigerator_ing_id,
        refrigerator_ing_name,
        expired_date,
        enter_date,
        color,
      });
    }
  });

  return Object.values(result);
}

module.exports = { getRefrigeratorData };
