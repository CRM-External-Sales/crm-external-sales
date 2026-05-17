import requests
import uuid
import json

BASE_URL = "http://localhost:3000"
LOGIN_URL = f"{BASE_URL}/api/auth/login"
SUPPLIERS_URL = f"{BASE_URL}/api/suppliers"

USERNAME = "fabricioarg97@gmail.com"
PASSWORD = "Frjg1975"
TIMEOUT = 30

def login(username, password):
    resp = requests.post(
        LOGIN_URL,
        json={"email": username, "password": password},
        timeout=TIMEOUT
    )
    resp.raise_for_status()
    data = resp.json()
    # Try to extract token from known possible fields
    token = data.get('access_token') or data.get('token')
    if not token and isinstance(data, dict):
        # Try nested 'session' or 'session' inside data
        token = data.get('session', {}).get('access_token')
    assert token, "Failed to obtain access token from login response"
    return token

def create_supplier(token):
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    for _ in range(5):
        corporate = int(uuid.uuid4().int % 10**12)  # large integer as per spec
        email_unique = f"test{uuid.uuid4().hex[:8]}@example.com"
        body = {
            "corporate": corporate,
            "company": "Test Company",
            "phone": "1234567890",
            "email": email_unique,
            "service": "Test Service"
        }
        resp = requests.post(SUPPLIERS_URL, headers=headers, json=body, timeout=TIMEOUT)
        if resp.status_code == 200:
            return corporate
        if resp.status_code == 409:
            continue
        resp.raise_for_status()
    raise Exception("Could not create unique supplier after 5 attempts")

def delete_supplier(token, corporate):
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.delete(f"{SUPPLIERS_URL}/{corporate}", headers=headers, timeout=TIMEOUT)
    return resp

def test_put_supplier_validation_errors():
    token = login(USERNAME, PASSWORD)
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    corporate = None
    try:
        corporate = create_supplier(token)

        url = f"{SUPPLIERS_URL}/{corporate}"

        # Test empty payload
        resp = requests.put(url, headers=headers, json={}, timeout=TIMEOUT)
        assert resp.status_code == 400, f"Expected 400 on empty payload, got {resp.status_code}"

        # Test invalid payload with wrong field types
        invalid_body = {
            "company": 12345,  # should be string
            "phone": True,     # should be string
            "email": "not-an-email",
            "service": 999     # should be string
        }
        resp = requests.put(url, headers=headers, json=invalid_body, timeout=TIMEOUT)
        assert resp.status_code == 400, f"Expected 400 on invalid payload types, got {resp.status_code}"

        # Test malformed JSON body (send invalid JSON string)
        malformed_headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        malformed_data = '{"company": "Test", "phone": "12345678", "email": "email@example.com", "service": "service"'  # Missing closing brace
        resp = requests.put(url, headers=malformed_headers, data=malformed_data, timeout=TIMEOUT)

        assert resp.status_code in (400, 500), f"Expected 400 or 500 for malformed JSON, got {resp.status_code}"

    finally:
        if corporate is not None:
            delete_supplier(token, corporate)

test_put_supplier_validation_errors()
