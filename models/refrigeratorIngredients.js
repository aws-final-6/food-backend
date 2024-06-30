module.exports = (sequelize, DataTypes) => {
  const RefrigeratorIngredients = sequelize.define('RefrigeratorIngredients', {
    refrigerator_ing_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    refrigerator_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    refrigerator_ing_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    expired_date: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    enter_date: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    color: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  }, {
    tableName: 'RefrigeratorIngredients',
    timestamps: false,
  });

  RefrigeratorIngredients.associate = (models) => {
    RefrigeratorIngredients.belongsTo(models.Refrigerator, { foreignKey: 'refrigerator_id' });
  };

  return RefrigeratorIngredients;
};
