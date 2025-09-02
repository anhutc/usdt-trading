# Render Deployment Guide (Không cần cài thêm gì)

## Cách 1: Render (Đơn giản nhất)

### Bước 1: Push code lên GitHub
```bash
git add .
git commit -m "Add deployment files"
git push origin main
```

### Bước 2: Triển khai trên Render
1. Truy cập: https://render.com/
2. Đăng ký tài khoản (có thể dùng GitHub)
3. Click "New +" → "Web Service"
4. Kết nối GitHub repo
5. Cấu hình:
   - **Name**: trading-app
   - **Environment**: Python
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `streamlit run app.py --server.port $PORT --server.address 0.0.0.0`
6. Click "Create Web Service"

### Kết quả:
- URL: https://your-app-name.onrender.com
- Tất cả sàn hoạt động tốt
- Không cần cài thêm gì

## Cách 2: Railway (Sau khi cài Node.js)

### Bước 1: Cài Node.js
- Tải từ: https://nodejs.org/ (LTS version)
- Cài đặt và thêm vào PATH

### Bước 2: Cài Railway CLI
```powershell
npm install -g @railway/cli
```

### Bước 3: Triển khai
```powershell
railway login
railway init
railway up
railway domain
```
