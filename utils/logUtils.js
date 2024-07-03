function errLog(apiId, statusCode, statusMessage, additionalInfo = {}) {
  const logMessage = {
    apiId: apiId, // AUTH_01
    statusCode: statusCode, // 404
    statusMessage: statusMessage, // Not Found
    ...additionalInfo, // 추가정보
  };

  console.log(JSON.stringify(logMessage));
}

module.exports = errLog;

// import
// const { errLog } = require("../utils/logUtils");

// 작성예시
// errLog('AUTH_01', 404, 'Not Found', { user_id: 'user123', reason: 'Recipe not found' });

// 결과예시
// {
//   "apiId": "AUTH_01",
//   "statusCode": 404,
//   "statusMessage": "Not Found",
//   "user_id": "user123",
//   "reason": "Recipe not found",
// }
