const jsonServer = require('json-server');
const bodyParser = require('body-parser');
const server = jsonServer.create();
const router = jsonServer.router('db.json');
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const middlewares = jsonServer.defaults();

server.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
server.use(bodyParser.json({ limit: '50mb' }));
server.use(middlewares);
const app = express();

server.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
})

// Middleware để thêm trường createdAt và updatedAt
server.use((req, res, next) => {
    const currentDate = new Date();
    const options = {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
    };
    const formattedDate = currentDate.toLocaleString('en-US', options);

    if (req.method === 'POST') {
        req.body.createdAt = formattedDate;
        req.body.updatedAt = formattedDate;
    } else if (req.method === 'PUT') {
        req.body.updatedAt = formattedDate;
    }
    // Tiếp tục xử lý các middleware khác hoặc router
    next();
});

// Endpoint để xử lý yêu cầu đăng nhập
server.post('/login', (req, res) => {
    const { email, password } = req.body;
    const user = getUser(email, password);
    if (!user) {
        return res.status(201).json({ message: 'Email hoặc mật khẩu không đúng!' });
    }
    if (user) {
        res.status(200).json({ id: user.id, avatar: user.avatar, fullName: user.fullName, email: user.email, phone: user.phone, role: user.role });
    }
});

function getUser(email, password) {
    // Đọc dữ liệu người dùng từ db.json
    const users = require('./db.json').users;
    return users.find(user => user.email === email && user.password === password);
}

// Kiểm tra tính duy nhất của email trước khi thêm
function isEmailUnique(email) {
    const users = router.db.get('users').value();
    return !users.some(user => user.email === email);
}

// Kiểm tra tính hợp lệ của email
function isValidEmail(email) {
    // Sử dụng biểu thức chính quy để kiểm tra định dạng email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Middleware để thêm trường id tự động
server.use((req, res, next) => {
    if (req.method === 'POST' && req.path === '/register' || req.path === '/books') {
        req.body.id = uuidv4();
    }
    // Tiếp tục chạy các middleware và route tiếp theo
    next();
});

// Endpoint tạo tài khoản
server.post('/register', (req, res) => {
    const { fullName, email, phone, password } = req.body;
    const role = 'USER'
    const avatar = ''
    if (!isValidEmail(email)) {
        return res.status(200).json({ error: 'Email không hợp lệ' });
    }

    if (!isEmailUnique(email)) {
        return res.status(200).json({ error: 'Email đã tồn tại' });
    }

    // Thêm tài khoản vào cơ sở dữ liệu
    router.db.get('users')
        .push({ id: req.body.id, avatar, fullName, email, phone, password, role })
        .write();

    return res.status(201).json({ message: 'Đăng ký tài khoản thành công!' });
});

server.put('/update-password/:id', (req, res) => {
    const userId = req.params.id;;
    const { oldPassword, newPassword } = req.body;

    const user = router.db.get('users').find({ id: userId }).value();

    if (!user) {
        return res.status(404).send('User not found');
    }

    // Kiểm tra mật khẩu cũ
    if (user.password !== oldPassword) {
        return res.status(201).send('Old password is incorrect');
    }

    // Update mật khẩu mới
    user.password = newPassword;
    router.db.get('users').find({ id: userId }).assign(user).write();

    res.status(200).send('Password updated successfully');
});

// API endpoint để tải lên ảnh
server.post('/imgBooks', (req, res) => {
    const { base64 } = req.body;
    // Lưu chuỗi base64 vào cơ sở dữ liệu
    // Trong trường hợp này, mình lưu trực tiếp vào một mảng images
    router.db.get('imgBooks').push({ base64 }).write();
    res.status(201).send(base64);
});

// API endpoint để tải lên ảnh
server.post('/avatar', (req, res) => {
    const { base64 } = req.body;
    // Lưu chuỗi base64 vào cơ sở dữ liệu
    // Trong trường hợp này, mình lưu trực tiếp vào một mảng images
    router.db.get('avatar').push({ base64 }).write();
    res.status(201).send(base64);
});

// Endpoint thêm sách
server.post('/books', (req, res) => {
    const { name, category, author, price, quantity, sold, thumbnail, slider } = req.body;

    // Thêm sách vào cơ sở dữ liệu
    router.db.get('books')
        .push({ id: req.body.id, name, category, author, price, quantity, sold, thumbnail, slider })
        .write();

    return res.status(201).json({ message: 'Thêm sách thành công!' });
});


// Sử dụng router mặc định của JSON Server
server.use(router);

server.use(app);

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`JSON Server is running on port ${PORT}`);
});