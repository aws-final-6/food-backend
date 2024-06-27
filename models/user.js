const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  user_email: { type: String, required: true, unique: true },
  user_nickname: { type: String, required: true },
  user_provider: { type: String, required: true },
  user_subscription: { type: Boolean, default: false },
  user_prefer: [
    {
      cate_no: { type: Number },
      situ_no: { type: Number },
    },
  ],
  user_bookmark: [{ type: Number }],
  user_searchfilter: [{ type: String }],
});

module.exports = mongoose.model("User", UserSchema);
