const express = require('express');
const cors = require('cors');
// Không cần require('node-fetch') nữa vì Node.js v18+ đã có fetch tích hợp sẵn.

const app = express();
const PORT = process.env.PORT || 8080; // Use Heroku's PORT environment variable or default to 8080

app.use(cors()); // Kích hoạt CORS cho tất cả các request
app.use(express.static(__dirname)); // Serve static files from the current directory

app.get('/proxy', async (req, res) => {
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(400).send('Missing target URL parameter.');
    }

    try {
        // Đã xóa giải mã URL một lần nữa vì encodeURIComponent đã được xóa ở phía client.
        // const decodedTargetUrl = decodeURIComponent(targetUrl);
        // console.log('[DEBUG] Proxying decoded URL:', decodedTargetUrl);
        console.log('[DEBUG] Proxying URL:', targetUrl); // Đổi lại để log targetUrl trực tiếp
        const response = await fetch(targetUrl); // Sử dụng targetUrl đã được giải mã một lần bởi Express
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error in proxy request:', error);
        res.status(500).send('Proxy error');
    }
});

app.listen(PORT, () => {
    console.log(`CORS Proxy server running on http://localhost:${PORT}`);
    console.log(`Use it by making requests to http://localhost:${PORT}/proxy?url=YOUR_TARGET_URL`);
});
