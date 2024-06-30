module.exports = (sequelize, DataTypes) => {
  const SearchFilter = sequelize.define('SearchFilter', {
    user_id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    ingredient_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
  }, {
    tableName: 'SearchFilter',
    timestamps: false,
  });

  SearchFilter.associate = (models) => {
    SearchFilter.belongsTo(models.User, { foreignKey: 'user_id' });
    SearchFilter.belongsTo(models.Ingredient, { foreignKey: 'ingredient_id' });
  };

  return SearchFilter;
};
