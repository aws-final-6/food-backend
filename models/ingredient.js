module.exports = (sequelize, DataTypes) => {
  const Ingredient = sequelize.define('Ingredient', {
    ingredient_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    ingredient_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, {
    tableName: 'Ingredient',
    timestamps: false,
  });

  Ingredient.associate = (models) => {
    Ingredient.hasMany(models.IngredientSearch, { foreignKey: 'ingredient_id' });
    Ingredient.hasMany(models.SearchFilter, { foreignKey: 'ingredient_id' });
  };

  return Ingredient;
};
