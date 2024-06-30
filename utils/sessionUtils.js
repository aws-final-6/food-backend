// Session테이블에서 user_id, access_token 일치하는지 검증

const { pool } = require("../scripts/connectMySQL");

async function validateSession(user_id, access_token) {
  const [sessionRows] = await pool.query('SELECT * FROM Session WHERE user_id = ? AND access_token = ?', [user_id, access_token]);
  return sessionRows.length > 0;
}

async function deleteSession(user_id) {
  await pool.query('DELETE FROM Session WHERE user_id = ?', [user_id]);
}

module.exports = {
  validateSession,
  deleteSession
};
