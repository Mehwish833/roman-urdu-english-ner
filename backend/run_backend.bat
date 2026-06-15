@echo off
setlocal
cd /d "%~dp0"

set "PYTHON_CMD="

rem Prefer the Windows Python Launcher when available.
py -3.12 -c "import sys" >nul 2>&1
if not errorlevel 1 set "PYTHON_CMD=py -3.12"

if not defined PYTHON_CMD (
    py -3.11 -c "import sys" >nul 2>&1
    if not errorlevel 1 set "PYTHON_CMD=py -3.11"
)

rem If the launcher is not available, try common Python.org install paths.
if not defined PYTHON_CMD (
    if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" set "PYTHON_CMD=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
)

if not defined PYTHON_CMD (
    if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" set "PYTHON_CMD=%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
)

if not defined PYTHON_CMD (
    if exist "C:\Python312\python.exe" set "PYTHON_CMD=C:\Python312\python.exe"
)

if not defined PYTHON_CMD (
    if exist "C:\Python311\python.exe" set "PYTHON_CMD=C:\Python311\python.exe"
)

rem Finally, allow python from PATH only if it is 3.11 or 3.12.
if not defined PYTHON_CMD (
    python -c "import sys; raise SystemExit(0 if sys.version_info[:2] in [(3, 11), (3, 12)] else 1)" >nul 2>&1
    if not errorlevel 1 set "PYTHON_CMD=python"
)

if not defined PYTHON_CMD (
    echo ERROR: This project needs Python 3.11 or Python 3.12.
    echo Python 3.14 is too new for the tokenizers package used by transformers 4.41.2.
    echo.
    echo Please install Python 3.12 from:
    echo https://www.python.org/downloads/release/python-3128/
    echo.
    echo During installation, tick: Add python.exe to PATH
    echo Then close VS Code, reopen it, and run this file again.
    pause
    exit /b 1
)

echo Using Python command: %PYTHON_CMD%

if exist ".venv\Scripts\python.exe" (
    .venv\Scripts\python.exe -c "import sys; raise SystemExit(0 if sys.version_info[:2] in [(3, 11), (3, 12)] else 1)" >nul 2>&1
    if errorlevel 1 (
        echo Existing virtual environment was created with an unsupported Python version.
        echo Removing old .venv folder...
        rmdir /s /q ".venv"
    )
)

if not exist ".venv" (
    echo Creating Python virtual environment...
    %PYTHON_CMD% -m venv .venv
    if errorlevel 1 (
        echo Failed to create virtual environment.
        pause
        exit /b 1
    )
)

call .venv\Scripts\activate
python -m pip install --upgrade pip
pip install --no-cache-dir -r requirements.txt
if errorlevel 1 (
    echo Dependency installation failed.
    pause
    exit /b 1
)

python app.py
pause
