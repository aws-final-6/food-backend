module.exports = (sequelize, DataTypes) => {
  const Session = sequelize.define(
    "Session",
    {
      session_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      access_token: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      user_agent: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.TIMESTAMP,
        defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
      },
    },
    {
      tableName: "Session",
      timestamps: false,
    }
  );

  Session.associate = (models) => {
    Session.belongsTo(models.User, { foreignKey: "user_id" });
  };

  return Session;
};
