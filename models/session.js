module.exports = (sequelize, DataTypes) => {
  const Session = sequelize.define('Session', {
    user_id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    access_token: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, {
    tableName: 'Session',
    timestamps: false,
  });

  Session.associate = (models) => {
    Session.belongsTo(models.User, { foreignKey: 'user_id' });
  };

  return Session;
};
