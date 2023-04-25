const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: true },
  projects: [{
    _id: String,
    name: { type: String, required: true },
    file: { type: String, required: true },
    gltf: { type: String, required: true },
    img: { type: String, required: true },
  }],
  favorites: [{
    _id: String,
    name: { type: String, required: true },
    file: { type: String, required: true },
    gltf: { type: String, required: true },
    img: { type: String, required: true },
  }],
});

const User = mongoose.model('User', UserSchema);

module.exports = User;