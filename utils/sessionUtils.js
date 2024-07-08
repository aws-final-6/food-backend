// Session테이블에서 user_id, access_token 일치하는지 검증

const { readPool, writePool } = require("../scripts/connector");

async function validateSession(user_id, access_token) {
  const [sessionRows] = await readPool.query(
    "SELECT * FROM Session WHERE user_id = ? AND access_token = ?",
    [user_id, access_token]
  );
  return sessionRows.length > 0;
}

async function deleteSession(user_id) {
  await writePool.query("DELETE FROM Session WHERE user_id = ?", [user_id]);
}

module.exports = {
  validateSession,
  deleteSession,
};
