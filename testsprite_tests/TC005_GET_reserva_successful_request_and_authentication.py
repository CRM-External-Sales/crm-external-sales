import requests
import json

BASE_URL = "http://localhost:3000"
LOGIN_URL = f"{BASE_URL}/api/auth/login"
RESERVATIONS_URL = f"{BASE_URL}/api/reservations"

AUTH_CREDENTIALS = {
    "email": "fabricioarg97@gmail.com",
    "password": "Frjg1975"
}

def extract_token(response_json):
    # Per instruction (1) for token extraction
    return (
        response_json.get('data', {}).get('session', {}).get('access_token') or
        response_json.get('session', {}).get('access_token') or
        response_json.get('access_token')
    )

def login_get_token(email, password):
    try:
        response = requests.post(LOGIN_URL, json={"email": email, "password": password}, timeout=30)
        response.raise_for_status()
        resp_json = response.json()
        token = extract_token(resp_json)
        if not token:
            raise ValueError("Token not found in login response")
        return token
    except Exception as e:
        raise RuntimeError(f"Login failed: {e}")

def test_get_reservations_success_and_authentication():
    # Login with valid credentials to get token (agent or admin)
    token = login_get_token(AUTH_CREDENTIALS["email"], AUTH_CREDENTIALS["password"])
    headers_valid = {"Authorization": f"Bearer {token}"}

    # 1) Test GET /reserva with valid token
    resp = requests.get(RESERVATIONS_URL, headers=headers_valid, timeout=30)
    assert resp.status_code == 200, f"Expected 200 OK, got {resp.status_code}"
    resp_json = resp.json()
    # Assert that response contains a 'data' field which is a list (reservations array)
    # Admin sees all reservations, agent sees only own - just check list type and presence
    assert "data" in resp_json, "'data' field missing in response"
    assert isinstance(resp_json["data"], list), "'data' field is not a list"

    # 2) Test GET /reserva without token => 401 Unauthorized
    resp_unauth = requests.get(RESERVATIONS_URL, timeout=30)
    assert resp_unauth.status_code == 401, f"Expected 401 Unauthorized without token, got {resp_unauth.status_code}"

    # 3) Test GET /reserva with invalid/expired token => 401 Unauthorized
    headers_invalid = {"Authorization": "Bearer invalid_or_expired_token_xyz"}
    resp_invalid = requests.get(RESERVATIONS_URL, headers=headers_invalid, timeout=30)
    assert resp_invalid.status_code == 401, f"Expected 401 Unauthorized with invalid token, got {resp_invalid.status_code}"

test_get_reservations_success_and_authentication()