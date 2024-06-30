module.exports = (sequelize, DataTypes) => {
  const Refrigerator = sequelize.define('Refrigerator', {
    refrigerator_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    refrigerator_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    refrigerator_type: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    user_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, {
    tableName: 'Refrigerator',
    timestamps: false,
  });

  Refrigerator.associate = (models) => {
    Refrigerator.belongsTo(models.User, { foreignKey: 'user_id' });
    Refrigerator.hasMany(models.RefrigeratorIngredients, { foreignKey: 'refrigerator_id' });
  };

  return Refrigerator;
};
