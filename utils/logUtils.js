function errLog(apiId, statusCode, statusMessage, additionalInfo = {}) {
  const logMessage = {
    type: "ERROR",
    apiId: apiId, // AUTH_01
    statusCode: statusCode, // 404
    statusMessage: statusMessage, // Not Found
    ...additionalInfo, // 추가정보
  };

  console.log("Backend: ", JSON.stringify(logMessage));
}

function infoLog(apiId, reqBody = {}) {
  const logMessage = {
    type: "INFO",
    apiId: apiId,
    reqBody: reqBody,
  };

  console.log("Backend: ", JSON.stringify(logMessage));
}

function successLog(apiId, resStatus, resBody = {}) {
  const logMessage = {
    type: "SUCCESS",
    apiId: apiId,
    resStatus: resStatus,
    resBody: resBody,
  };

  console.log("Backend: ", JSON.stringify(logMessage));
}

module.exports = { errLog, infoLog, successLog };

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
