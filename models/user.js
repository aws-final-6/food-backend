module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    user_id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    user_email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    user_provider: {
      type: DataTypes.ENUM('kakao', 'naver', 'google'),
      allowNull: false,
    },
  }, {
    tableName: 'User',
    timestamps: false,
  });

  User.associate = (models) => {
    User.hasOne(models.Session, { foreignKey: 'user_id' });
    User.hasMany(models.MyPage, { foreignKey: 'user_id' });
    User.hasMany(models.Bookmark, { foreignKey: 'user_id' });
    User.hasMany(models.SearchFilter, { foreignKey: 'user_id' });
    User.hasMany(models.Refrigerator, { foreignKey: 'user_id' });
    User.hasOne(models.Subscription, { foreignKey: 'user_id' });
  };

  return User;
};
