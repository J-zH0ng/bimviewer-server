const mongoose = require('mongoose');

// 定义 Project 模型
const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  file: { type: String, required: true },
  gltf: { type: String, required: true },
  img: { type: String, required: true }
});

projectSchema.index({name: 'text'});

const Project = mongoose.model('Project', projectSchema);

module.exports = Project;