import requests
import uuid

BASE_URL = "http://localhost:3000"
SUPPLIER_ENDPOINT = "/api/suppliers"
AUTH_CREDENTIALS = {
    "username": "fabricioarg97@gmail.com",
    "password": "Frjg1975"
}
TIMEOUT = 30


def get_token():
    url = BASE_URL + "/api/auth/login"
    body = {"email": AUTH_CREDENTIALS["username"], "password": AUTH_CREDENTIALS["password"]}
    resp = requests.post(url, json=body, timeout=TIMEOUT)
    resp.raise_for_status()
    data = resp.json()
    token = (
        data.get("data", {})
        .get("session", {})
        .get("access_token")
        or data.get("session", {}).get("access_token")
        or data.get("access_token")
    )
    return token


def test_post_proveedor_authentication_validation_and_duplicate():
    # 1) Test POST /proveedor without token -> 401
    url = BASE_URL + SUPPLIER_ENDPOINT
    # Generate initial unique values
    unique_corporate_initial = int(uuid.uuid4().int % 10**8) + 10**7  # smaller range for corporate
    unique_email_initial = f"test{uuid.uuid4().hex}@example.com"

    # Prepare supplier_data for initial tests
    supplier_data_initial = {
        "corporate": unique_corporate_initial,
        "company": "Test Company",
        "phone": "1234567890",
        "email": unique_email_initial,
        "service": "Test Service"
    }

    resp = requests.post(url, json=supplier_data_initial, timeout=TIMEOUT)
    assert resp.status_code == 401, f"Expected 401 without token, got {resp.status_code}"

    # 2) Test POST /proveedor with invalid token -> 401
    headers_invalid = {"Authorization": "Bearer invalidtoken123"}
    resp = requests.post(url, json=supplier_data_initial, headers=headers_invalid, timeout=TIMEOUT)
    assert resp.status_code == 401, f"Expected 401 with invalid token, got {resp.status_code}"

    # 3) Test POST /proveedor with valid token but missing required fields -> 400
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Missing corporate
    invalid_data_1 = {
        "company": "Test Company",
        "phone": "1234567890",
        "email": unique_email_initial,
        "service": "Test Service"
    }
    resp = requests.post(url, json=invalid_data_1, headers=headers, timeout=TIMEOUT)
    assert resp.status_code == 400, f"Expected 400 missing corporate, got {resp.status_code}"

    # Missing email
    invalid_data_2 = {
        "corporate": unique_corporate_initial + 1,
        "company": "Test Company",
        "phone": "1234567890",
        "service": "Test Service"
    }
    resp = requests.post(url, json=invalid_data_2, headers=headers, timeout=TIMEOUT)
    assert resp.status_code == 400, f"Expected 400 missing email, got {resp.status_code}"

    # Invalid field type for corporate (string instead of number)
    invalid_data_3 = {
        "corporate": "not_a_number",
        "company": "Test Company",
        "phone": "1234567890",
        "email": f"test{uuid.uuid4().hex}@example.com",
        "service": "Test Service"
    }
    resp = requests.post(url, json=invalid_data_3, headers=headers, timeout=TIMEOUT)
    assert resp.status_code == 400, f"Expected 400 invalid corporate type, got {resp.status_code}"

    # 4) Test successful creation with unique corporate and email
    max_retries = 5
    created_corporate = None
    for attempt in range(max_retries):
        unique_corporate = int(uuid.uuid4().int % 10**8) + 10**7  # smaller range
        unique_email = f"test{uuid.uuid4().hex}@example.com"
        supplier_data = {
            "corporate": unique_corporate,
            "company": "Test Company",
            "phone": "1234567890",
            "email": unique_email,
            "service": "Test Service"
        }
        resp = requests.post(url, json=supplier_data, headers=headers, timeout=TIMEOUT)
        if resp.status_code == 200:
            created_corporate = unique_corporate
            break
        elif resp.status_code == 409:
            continue  # retry on duplicate conflict
        else:
            resp.raise_for_status()
    else:
        assert False, "Failed to create unique supplier after multiple retries"

    # 5) Test duplicate creation with same corporate (should return 400 or 409)
    duplicate_data = supplier_data.copy()
    duplicate_data["email"] = f"dup{uuid.uuid4().hex}@example.com"  # email differs for duplication test
    resp_dup = requests.post(url, json=duplicate_data, headers=headers, timeout=TIMEOUT)
    assert resp_dup.status_code in (400, 409), f"Expected 400 or 409 on duplicate corporate, got {resp_dup.status_code}"

    # Cleanup: Delete created supplier
    if created_corporate is not None:
        try:
            del_url = f"{url}/{created_corporate}"
            del_resp = requests.delete(del_url, headers=headers, timeout=TIMEOUT)
            assert del_resp.status_code == 200, f"Cleanup delete expected 200, got {del_resp.status_code}"
        except Exception as e:
            print(f"Cleanup supplier failed: {e}")


test_post_proveedor_authentication_validation_and_duplicate()
