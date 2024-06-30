const mysql = require('mysql2/promise');
const { performance } = require('perf_hooks');

async function runMySQLTests() {
  const connection = await mysql.createConnection({
    host: 'mysql', // MySQL 컨테이너가 실행 중인 호스트 주소
    user: 'test',
    password: 'test1234',
    database: 'mlr-dev-db-tlb'
  });

  // Test 1: 레시피 조회 테스트
  const startRead = performance.now();
  const [recipeRows] = await connection.execute('SELECT * FROM Recipe WHERE recipe_id = ?', [7025116]);
  const endRead = performance.now();
  console.log(`MySQL 단순 조회 시간: ${endRead - startRead} ms`);
  if (recipeRows.length > 0) {
    console.log('레시피 조회 결과:', recipeRows[0]);
  } else {
    console.log('레시피를 찾을 수 없습니다.');
  }

  // Test 2: 제철 농산물 조회 테스트
  const currentMonth = new Date().getMonth() + 1;
  const startSeasonal = performance.now();
  const [seasonalRows] = await connection.execute('SELECT seasonal_name, seasonal_image FROM Seasonal WHERE seasonal_month = ?', [currentMonth]);
  const endSeasonal = performance.now();
  console.log(`MySQL 제철 농산물 조회 시간: ${endSeasonal - startSeasonal} ms`);
  if (seasonalRows.length > 0) {
    console.log('제철 농산물 조회 결과:', seasonalRows);
  } else {
    console.log('제철 농산물을 찾을 수 없습니다.');
  }

  await connection.end();
}

runMySQLTests().catch(console.error);
