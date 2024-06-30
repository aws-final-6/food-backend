module.exports = (sequelize, DataTypes) => {
  const IngredientSearch = sequelize.define('IngredientSearch', {
    recipe_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    ingredient_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
  }, {
    tableName: 'IngredientSearch',
    timestamps: false,
  });

  IngredientSearch.associate = (models) => {
    IngredientSearch.belongsTo(models.Recipe, { foreignKey: 'recipe_id' });
    IngredientSearch.belongsTo(models.Ingredient, { foreignKey: 'ingredient_id' });
  };

  return IngredientSearch;
};
