const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const User = require('./models/user');
const Project = require('./models/project');
const cors = require('cors');
const multer = require('multer')
const generateUniqueFileName = require('./utils/unifilename');
const path = require('path');
const fs = require('fs')

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

app.use('/static', express.static(path.join(__dirname, 'public')));

mongoose.connect('mongodb://127.0.0.1/bimviewer', { useNewUrlParser: true , useUnifiedTopology: true});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log('Database connected');
});


// 注册路由
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;

  User.findOne({ username: username })
  .then(user => {
    if (user) {
      // 用户已存在
      res.status(400).send('Username already exists');
    } else {
      // 创建新用户
      const newUser = new User({ username, password, projects: []});
      newUser.save()
      .then(savedDoc => {
        res.send('Registration successful');
      })
      .catch(err => {
        console.error(err);
        res.status(500).send('Internal server error');
      })
    }
  })
  .catch(err => {
    // 处理错误
    res.status(500).send('Internal server error');
  });
});

// 登录路由
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  // User.findOne({ username }, (err, user) => {
  //   if (err) {
  //     console.error(err);
  //     res.status(500).send('Internal server error');
  //   } else if (!user) {
  //     res.status(400).send('User not found');
  //   } else if (user.password !== password) {
  //     res.status(400).send('Incorrect password');
  //   } else {
  //     res.send('Login successful');
  //   }
  // });
  User.findOne({username})
  .then(user => {
    if (!user) {
      res.status(400).send('User not found');
    } else if ( user.password !== password) {
      res.status(400).send('Incorrect password');
    } else {
      res.send({message: 'Login successful', data: user._id});
    }
  })
  .catch(err => {
    console.error(err)
    res.status(500).send('Internal server error');
  })
});

// 上传项目-项目文件
const projectFileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/projectFiles/')
  },
  filename: function (req, file, cb) {
    cb(null, generateUniqueFileName(file.originalname, 'projectFiles'))
  }
})
const upload1 = multer({ storage: projectFileStorage })
app.post('/api/uploadProjectFile', upload1.single('file'), function (req, res, next) {
  console.log(req.file)
  res.send({message: '项目文件上传成功！', filename: req.file.filename})
})



// 上传项目-gltf文件
const gltfFileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/gltfFiles/')
  },
  filename: function (req, file, cb) {
    cb(null, generateUniqueFileName(file.originalname, 'gltfFiles'))
  }
})
const upload2 = multer({ storage: gltfFileStorage })
app.post('/api/uploadGltfFile', upload2.single('file'), function (req, res, next) {
  console.log(req.file)
  res.send({message: 'gitf文件上传成功！', filename: req.file.filename})
})



// 上传项目-图片文件
const imgFileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/imgFiles/')
  },
  filename: function (req, file, cb) {
    cb(null, generateUniqueFileName(file.originalname, 'imgFiles'))
  }
})
const upload3 = multer({ storage: imgFileStorage })
app.post('/api/uploadImgFile', upload3.single('file'), function (req, res, next) {
  console.log(req.file)
  res.send({message: '图片文件上传成功！', filename: req.file.filename})
})


// 上传项目
app.post('/api/addNewProject', (req, res) => {
  const { userid, name, file, gltf, img } = req.body;
  const newProject = new Project({
    name,
    file,
    gltf,
    img
  });

  newProject.save()
  .then(project => {
    console.log('New project saved');
    User.findById(userid)
    .then(user => {
      user.projects.push({
        _id: project._id,
        name,
        file,
        gltf,
        img
      });
      user.save()
      .then(() => {
        console.log('New project added');
        res.send("项目添加成功！");
      })
      .catch((err) => console.error(err));
    })
  })
  .catch((err) => console.error(err));
})


// 查询projects数据库中的数据并实现分页
app.get('/api/projects', async (req, res) => {
  const page = parseInt(req.query.page) || 1; // 当前页码，默认为第一页
  const pageSize = parseInt(req.query.pageSize) || 16; // 每页显示的记录数，默认为16
  const skip = (page - 1) * pageSize; // 计算需要跳过的记录数

  const projects = await Project.find()
    .skip(skip)
    .limit(pageSize)
    .lean(); // 使用lean()方法以纯JS对象的形式返回查询结果

  const total = await Project.countDocuments();

  res.send({
    projects,
    total
  });
});

// 查询用户projects属性中的数据
app.get('/api/uploaded', async (req, res) => {
  
  const { userid } = req.query;
  
  try {
    const user = await User.findById(userid);
    res.send({
      projects: user.projects,
    });
  } catch (error) {
    console.error(error)
  }
});

// 删除项目
app.delete('/api/delete', async (req, res) => {
  const {projectId, userId} = req.body;

  try {
    // 查询对应的用户
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send('User not found');
    }

    // 删除 users 表中对应用户的 projects 属性中的记录
    user.projects = user.projects.filter(p => p._id !== projectId);
    await user.save();

    // 查询要删除的项目及其文件路径
    const project = await Project.findById(projectId);
    const {file, gltf, img} = project
    // 删除项目及其对应的文件
    await Project.deleteOne({_id: projectId});
    fs.unlink(`public/projectFiles/${file}`, (err) => {
      if (err) {
        console.error(err);
      }
    });
    fs.unlink(`public/gltfFiles/${gltf}`, (err) => {
      if (err) {
        console.error(err);
      }
    });
    fs.unlink(`public/imgFiles/${img}`, (err) => {
      if (err) {
        console.error(err);
      }
    });

    res.status(200).send('Project deleted successfully.');
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

// 查询单个项目信息
app.get("/api/project", async (req, res) => {
  const { id } = req.query;
  try {
    const project = await Project.findById(id);
    const {name, file, gltf, img} = project
    res.send({name, file, gltf, img});
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
})

// 添加收藏
app.post('/api/setFavorite', async (req, res) => {
  const { userId, projectId } = req.body;
  try {
    const project = await Project.findById(projectId);
    const user = await User.findById(userId);
    user.favorites.push(project);
    await user.save();

    res.status(200).send('收藏成功！');
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
})

// 取消收藏
app.delete('/api/removeFavorite', async (req, res) => {
  const {projectId, userId} = req.body;
  try {
    const user = await User.findById(userId);
    user.favorites = user.favorites.filter(p => p._id !== projectId);

    await user.save();

    res.status(200).send('取消收藏成功！');
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
})

// 查询收藏
app.get('/api/favorites', async (req, res) => {
  const { userid } = req.query;
  
  try {
    const user = await User.findById(userid);
    res.send({
      favorites: user.favorites,
    });
  } catch (error) {
    console.error(error)
  }
})

// 搜索
app.get('/api/search', async (req, res) => {
  const searchTerm = req.query.term;

  try {
    const items = await Project.find({ $text: { $search: searchTerm } });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.listen(3000, () => {
  console.log('Server listening on port 3000');
});
