const express = require("express");
const router = express.Router();

// 메인페이지 연결?
router.get("/", function (req, res) {
  res.send("Hello World!");
});

// test
router.get("/test", function (req, res) {
  console.log("테스트를 타고있나요???");
  res.send("Test World!");
});

module.exports = router;
