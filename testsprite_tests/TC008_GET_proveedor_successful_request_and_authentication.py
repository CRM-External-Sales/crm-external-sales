import requests
import uuid

BASE_URL = "http://localhost:3000"
LOGIN_URL = f"{BASE_URL}/api/auth/login"
SUPPLIERS_URL = f"{BASE_URL}/api/suppliers"
TIMEOUT = 30

AUTH_CREDENTIALS_ADMIN = {
    "email": "fabricioarg97@gmail.com",
    "password": "Frjg1975"
}

def get_token(email, password):
    try:
        resp = requests.post(LOGIN_URL, json={"email": email, "password": password}, timeout=TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
        token = data.get('data', {}).get('session', {}).get('access_token') or data.get('session', {}).get('access_token') or data.get('access_token')
        return token
    except Exception:
        return None

def test_get_proveedor_authentication():
    admin_token = get_token(AUTH_CREDENTIALS_ADMIN["email"], AUTH_CREDENTIALS_ADMIN["password"])
    assert admin_token is not None, "Failed to obtain admin token from login"

    headers_valid = {"Authorization": f"Bearer {admin_token}"}
    headers_no_auth = {}
    headers_invalid = {"Authorization": "Bearer invalid_or_expired_token"}

    # Test GET /proveedor with valid token expect 200 and suppliers array
    resp_valid = requests.get(SUPPLIERS_URL, headers=headers_valid, timeout=TIMEOUT)
    assert resp_valid.status_code == 200, f"Expected 200 OK with valid token, got {resp_valid.status_code}"
    resp_json = resp_valid.json()
    data_field = resp_json.get('data', [])
    assert isinstance(data_field, list), "Expected data to be a list with valid token"

    # Test GET /proveedor without token expect 401
    resp_no_auth = requests.get(SUPPLIERS_URL, headers=headers_no_auth, timeout=TIMEOUT)
    assert resp_no_auth.status_code == 401, f"Expected 401 Unauthorized without token, got {resp_no_auth.status_code}"

    # Test GET /proveedor with invalid/expired token expect 401
    resp_invalid_auth = requests.get(SUPPLIERS_URL, headers=headers_invalid, timeout=TIMEOUT)
    assert resp_invalid_auth.status_code == 401, f"Expected 401 Unauthorized with invalid token, got {resp_invalid_auth.status_code}"

test_get_proveedor_authentication()