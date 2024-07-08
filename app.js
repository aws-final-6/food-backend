const express = require("express");
const app = express();
require("dotenv").config();
const { connectMySQL } = require("./scripts/connectMySQL");
const mysql = require('./models/sequelize');

const port = process.env.PORT || 3000;

// MySQL 연결 설정
connectMySQL().catch((err) => {
  console.error("MySQL 연결 중 오류 발생:", err);
  process.exit(1);
});

// Sequelize 데이터베이스 동기화
mysql.sequelize.sync().then(() => { 
  console.log("데이터베이스와 동기화 완료");
}).catch((err) => {
  console.error("데이터베이스 동기화 중 오류 발생:", err);
  process.exit(1);
});

// swagger
const { swaggerUi, specs } = require("./swagger/swagger");

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

//
const indexRouter = require("./routes/index");
// const testRouter = require("./routes/test"); 
const authRouter = require("./routes/auth");
const mypageRouter = require("./routes/mypage");
const recipeRouter = require("./routes/recipe");
const searchRouter = require("./routes/search");
const refrigRouter = require("./routes/refrig");
const bookmarkRouter = require("./routes/bookmark");
const searchFilterRouter = require("./routes/searchFilter");

app.use(express.json());
app.use("/", indexRouter);
// app.use("/test", testRouter);
app.use("/auth", authRouter);
app.use("/mypage", mypageRouter);
app.use("/recipe", recipeRouter);
app.use("/search", searchRouter);
app.use("/refrig", refrigRouter);
app.use("/bookmark", bookmarkRouter);
app.use("/searchfilter", searchFilterRouter);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
