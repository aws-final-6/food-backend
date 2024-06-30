module.exports = (sequelize, DataTypes) => {
  const Subscription = sequelize.define('Subscription', {
    user_id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    user_email: {
      type: DataTypes.STRING,
      allowNull: false,
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
    tableName: 'Subscription',
    timestamps: false,
  });

  Subscription.associate = (models) => {
    Subscription.belongsTo(models.User, { foreignKey: 'user_id' });
  };

  return Subscription;
};
