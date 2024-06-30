module.exports = (sequelize, DataTypes) => {
  const MyPage = sequelize.define('MyPage', {
    user_id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    user_nickname: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    user_subscription: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    cate_no: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    situ_no: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  }, {
    tableName: 'MyPage',
    timestamps: false,
  });

  MyPage.associate = (models) => {
    MyPage.belongsTo(models.User, { foreignKey: 'user_id' });
  };

  return MyPage;
};
