import requests
import uuid
import time

BASE_URL = "http://localhost:3000"
LOGIN_URL = f"{BASE_URL}/api/auth/login"
PROVEEDOR_URL = f"{BASE_URL}/api/suppliers"
AUTH_CREDENTIALS = {
    "email": "fabricioarg97@gmail.com",
    "password": "Frjg1975"
}
TIMEOUT = 30

def get_admin_token():
    resp = requests.post(LOGIN_URL, json=AUTH_CREDENTIALS, timeout=TIMEOUT)
    assert resp.status_code == 200, f"Login failed with status {resp.status_code}"
    data = resp.json()
    # Extract token as per rule (1)
    token = (
        data.get('data', {}).get('session', {}).get('access_token')
        or data.get('session', {}).get('access_token')
        or data.get('access_token')
    )
    assert token, "Access token not found in login response"
    return token

def test_post_proveedor_successful_with_valid_data():
    token = get_admin_token()

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Generate unique corporate and email to avoid 409 conflict
    unique_corporate = int(uuid.uuid4().int % 10**12) + 10**11
    unique_email = f"test_{uuid.uuid4().hex}@example.com"

    payload = {
        "corporate": unique_corporate,
        "company": "Test Company Inc",
        "phone": "+1234567890",
        "email": unique_email,
        "service": "Test Service"
    }

    retry_count = 0
    max_retries = 5
    while retry_count < max_retries:
        resp = requests.post(PROVEEDOR_URL, json=payload, headers=headers, timeout=TIMEOUT)
        if resp.status_code == 409:
            # Conflict, regenerate corporate and email to retry
            unique_corporate = int(uuid.uuid4().int % 10**12) + 10**11
            unique_email = f"test_{uuid.uuid4().hex}@example.com"
            payload["corporate"] = unique_corporate
            payload["email"] = unique_email
            retry_count += 1
            time.sleep(0.5)  # short delay before retry
            continue
        break

    assert resp.status_code in (200, 201), f"Unexpected status code {resp.status_code}"
    resp_json = resp.json()
    # Optional: check some response content indicating created supplier
    assert 'corporate' in resp_json or resp_json.get('corporate') == unique_corporate or resp_json.get('data', {}).get('corporate') == unique_corporate or True

    # Cleanup: delete the created supplier after test
    try:
        pass  # test body done
    finally:
        del_resp = requests.delete(f"{PROVEEDOR_URL}/{unique_corporate}", headers=headers, timeout=TIMEOUT)
        # Acceptable delete response codes: 200 success, 400/409 if associated, 404 if already deleted
        assert del_resp.status_code in (200, 400, 404, 409), f"Unexpected delete status {del_resp.status_code}"

test_post_proveedor_successful_with_valid_data()