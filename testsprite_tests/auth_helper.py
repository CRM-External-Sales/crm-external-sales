"""
Shared auth helper for TestSprite backend tests.
Extracts access_token from login API response: data.session.access_token
"""
import requests
import json
import os

BASE_URL = os.environ.get("BASE_URL", "http://localhost:3000/api")
CONFIG_PATH = os.path.join(os.path.dirname(__file__), "tmp", "config.json")

def get_credentials():
    """Load credentials from config.json or use defaults."""
    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            cfg = json.load(f)
            return cfg.get("backendUsername", "fabricioarg97@gmail.com"), cfg.get("backendPassword", "Frjg1975")
    except Exception:
        return "fabricioarg97@gmail.com", "Frjg1975"

def get_access_token(email=None, password=None, base_url=None):
    """
    Login and extract access_token from API response.
    API returns: { success, message, data: { user, session: { access_token, ... } } }
    """
    url = base_url or BASE_URL
    if not url.endswith("/api"):
        url = url.rstrip("/") + "/api" if "/api" not in url else url.rstrip("/")
    login_url = f"{url}/auth/login"
    cred_email, cred_password = get_credentials()
    payload = {"email": email or cred_email, "password": password or cred_password}
    resp = requests.post(login_url, json=payload, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    token = None
    if "data" in data and isinstance(data.get("data"), dict) and "session" in data["data"]:
        token = data["data"]["session"].get("access_token")
    if not token and "session" in data and isinstance(data.get("session"), dict):
        token = data["session"].get("access_token")
    if not token:
        token = data.get("access_token")
    if not token:
        raise ValueError("No access token in login response (expected data.session.access_token)")
    return token
