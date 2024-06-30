module.exports = (sequelize, DataTypes) => {
  const Bookmark = sequelize.define('Bookmark', {
    user_id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    recipe_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
  }, {
    tableName: 'Bookmark',
    timestamps: false,
  });

  Bookmark.associate = (models) => {
    Bookmark.belongsTo(models.User, { foreignKey: 'user_id' });
    Bookmark.belongsTo(models.Recipe, { foreignKey: 'recipe_id' });
  };

  return Bookmark;
};
