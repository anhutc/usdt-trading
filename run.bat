@echo off
set SCRIPT_DIR=%~dp0
cd /d %SCRIPT_DIR%

rem Ensure pip is up to date
echo Updating pip...
python -m pip install --upgrade pip

rem Install/update Streamlit
echo Installing/updating Streamlit...
pip install streamlit

rem Install/update dependencies from requirements.txt
echo Installing/updating dependencies from requirements.txt...
pip install -r requirements.txt

echo Starting Streamlit app...
streamlit run app.py

pause
