mkdir -p ~/.streamlit/
echo "[general]" > ~/.streamlit/credentials.toml
echo "email = \"your-email@example.com\"" >> ~/.streamlit/credentials.toml
echo "[server]" > ~/.streamlit/config.toml
echo "enableCORS = false" >> ~/.streamlit/config.toml
echo "enableXsrfProtection = false" >> ~/.streamlit/config.toml
