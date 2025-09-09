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
        // Decode URL để tránh double encoding
        const decodedTargetUrl = decodeURIComponent(targetUrl);
        console.log('[DEBUG] Original URL:', targetUrl);
        console.log('[DEBUG] Decoded URL:', decodedTargetUrl);
        
        const response = await fetch(decodedTargetUrl);
        
        if (!response.ok) {
            console.error(`[ERROR] API responded with status ${response.status}: ${response.statusText}`);
            return res.status(response.status).json({
                error: `API request failed with status ${response.status}`,
                message: response.statusText,
                url: decodedTargetUrl
            });
        }
        
        const data = await response.json();
        console.log('[SUCCESS] Proxy request completed successfully');
        res.json(data);
    } catch (error) {
        console.error('[ERROR] Proxy request failed:', error.message);
        console.error('[ERROR] Target URL:', targetUrl);
        res.status(500).json({
            error: 'Proxy request failed',
            message: error.message,
            url: targetUrl
        });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 USDT Trading CORS Proxy server running on port ${PORT}`);
    console.log(`📊 Frontend available at: http://localhost:${PORT}`);
    console.log(`🔗 Proxy endpoint: http://localhost:${PORT}/proxy?url=YOUR_TARGET_URL`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});
