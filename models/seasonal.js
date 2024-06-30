module.exports = (sequelize, DataTypes) => {
  const Seasonal = sequelize.define('Seasonal', {
    seasonal_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    seasonal_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    seasonal_month: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    seasonal_image: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  }, {
    tableName: 'Seasonal',
    timestamps: false,
  });

  return Seasonal;
};
