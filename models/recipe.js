module.exports = (sequelize, DataTypes) => {
  const Recipe = sequelize.define('Recipe', {
    recipe_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    recipe_title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    recipe_thumbnail: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    situ_no: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    cate_no: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  }, {
    tableName: 'Recipe',
    timestamps: false,
  });

  Recipe.associate = (models) => {
    Recipe.hasMany(models.Bookmark, { foreignKey: 'recipe_id' });
    Recipe.hasMany(models.IngredientSearch, { foreignKey: 'recipe_id' });
  };

  return Recipe;
};
