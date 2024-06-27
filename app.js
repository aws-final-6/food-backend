const express = require("express");
const app = express();
require("dotenv").config();
// const { connectMongoDB, initDatabase } = require("./scripts/initDatabase");

const port = process.env.PORT || 3000;

// MongoDB 연결 설정 및 초기화
// connectMongoDB()
//   .then(() => {
//     return initDatabase();
//   })
//   .catch((err) => {
//     console.error("MongoDB 초기화 중 오류 발생:", err);
//     process.exit(1);
//   });

//swagger
const { swaggerUi, specs } = require("./swagger/swagger");

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

//
const indexRouter = require("./routes/index");
const testRouter = require("./routes/index");
const authRouter = require("./routes/auth");
const mypageRouter = require("./routes/mypage");
const recipeRouter = require("./routes/recipe");
const searchRouter = require("./routes/search");
const refrigRouter = require("./routes/refrig");
const bookmarkRouter = require("./routes/bookmark");

app.use(express.json());
app.use("/", indexRouter);
app.use("/test", testRouter);
app.use("/auth", authRouter);
app.use("/mypage", mypageRouter);
app.use("/recipe", recipeRouter);
app.use("/search", searchRouter);
app.use("/refrig", refrigRouter);
app.use("/bookmark", bookmarkRouter);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
