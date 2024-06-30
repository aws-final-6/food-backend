const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.MYSQL_DATABASE, process.env.MYSQL_USER, process.env.MYSQL_PASSWORD, {
  host: process.env.MYSQL_HOST,
  dialect: 'mysql',
});

const mysql = {};  // db에서 mysql로 변경

mysql.Sequelize = Sequelize;
mysql.sequelize = sequelize;

mysql.User = require('./user')(sequelize, DataTypes);
mysql.Session = require('./session')(sequelize, DataTypes);
mysql.MyPage = require('./mypage')(sequelize, DataTypes);
mysql.Recipe = require('./recipe')(sequelize, DataTypes);
mysql.Bookmark = require('./bookmark')(sequelize, DataTypes);
mysql.Ingredient = require('./ingredient')(sequelize, DataTypes);
mysql.IngredientSearch = require('./ingredientSearch')(sequelize, DataTypes);
mysql.SearchFilter = require('./searchFilter')(sequelize, DataTypes);
mysql.Refrigerator = require('./refrigerator')(sequelize, DataTypes);
mysql.RefrigeratorIngredients = require('./refrigeratorIngredients')(sequelize, DataTypes);
mysql.Seasonal = require('./seasonal')(sequelize, DataTypes);
mysql.Subscription = require('./subscription')(sequelize, DataTypes);

// 모델 간의 관계 설정
Object.keys(mysql).forEach(modelName => {
  if (mysql[modelName].associate) {
    mysql[modelName].associate(mysql);
  }
});

module.exports = mysql;  // db에서 mysql로 변경
