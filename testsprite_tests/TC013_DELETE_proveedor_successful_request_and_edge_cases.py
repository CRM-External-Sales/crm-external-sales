import requests
import uuid
import time

BASE_URL = "http://localhost:3000"
LOGIN_URL = f"{BASE_URL}/api/auth/login"
SUPPLIERS_URL = f"{BASE_URL}/api/suppliers"
TRANSFERS_URL = f"{BASE_URL}/api/transfers"

AUTH_CREDENTIALS = {
    "email": "fabricioarg97@gmail.com",
    "password": "Frjg1975"
}
REQUEST_TIMEOUT = 30


def extract_token(login_response_json):
    # Token extraction per critical rules
    return (
        login_response_json.get('data', {})
        .get('session', {})
        .get('access_token')
        or login_response_json.get('session', {}).get('access_token')
        or login_response_json.get('access_token')
    )


def login():
    resp = requests.post(
        LOGIN_URL,
        json={"email": AUTH_CREDENTIALS["email"], "password": AUTH_CREDENTIALS["password"]},
        timeout=REQUEST_TIMEOUT,
    )
    resp.raise_for_status()
    token = extract_token(resp.json())
    assert token, "Login did not return access_token"
    return token


def create_supplier(token):
    headers = {"Authorization": f"Bearer {token}"}
    max_retries = 5
    for _ in range(max_retries):
        corporate = int(uuid.uuid4().int % 10 ** 12) + 10 ** 11
        email = f"email_{uuid.uuid4().hex[:8]}@test.com"
        payload = {
            "corporate": corporate,
            "company": "Test Company Inc",
            "phone": "1234567890",
            "email": email,
            "service": "Test Service",
        }
        resp = requests.post(SUPPLIERS_URL, json=payload, headers=headers, timeout=REQUEST_TIMEOUT)
        if resp.status_code in (200, 201):
            return corporate
        if resp.status_code == 409:
            # Conflict, retry with new corporate
            time.sleep(0.1)
            continue
        resp.raise_for_status()
    raise RuntimeError("Could not create supplier after multiple retries due to conflicts")


def create_transfer(token, supplier_corporate):
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "license_plate": 123456,
        "availability": "available",
        "make": "Toyota",
        "model": "Corolla",
        "category": "Sedan",
        "capacity": 4,
        "type": "Standard",
        "base_price": 100,
        "sale_price": 120,
        "supplier_corporate": supplier_corporate,
    }
    resp = requests.post(TRANSFERS_URL, json=payload, headers=headers, timeout=REQUEST_TIMEOUT)
    resp.raise_for_status()
    return resp.json()


def delete_supplier(token, corporate):
    headers = {"Authorization": f"Bearer {token}"}
    url = f"{SUPPLIERS_URL}/{corporate}"
    return requests.delete(url, headers=headers, timeout=REQUEST_TIMEOUT)


def test_delete_proveedor_success_and_edge_cases():
    token = login()

    headers_auth = {"Authorization": f"Bearer {token}"}

    # Create a supplier to test normal delete flow
    corporate = create_supplier(token)

    try:
        # 1) DELETE 200 for existing supplier
        resp_delete_1 = delete_supplier(token, corporate)
        # Accept 200 on success
        assert resp_delete_1.status_code == 200, f"Expected 200 on delete, got {resp_delete_1.status_code}"

        # 2) Second DELETE on same supplier -> 404 Not Found
        resp_delete_2 = delete_supplier(token, corporate)
        assert resp_delete_2.status_code == 404, f"Expected 404 on second delete, got {resp_delete_2.status_code}"

        # 3) DELETE without token -> 401 Unauthorized
        url = f"{SUPPLIERS_URL}/{corporate}"
        resp_delete_no_token = requests.delete(url, timeout=REQUEST_TIMEOUT)
        assert resp_delete_no_token.status_code == 401, f"Expected 401 without token, got {resp_delete_no_token.status_code}"

    finally:
        # Cleanup if supplier still exists (in case delete failed)
        try:
            delete_supplier(token, corporate)
        except Exception:
            pass

    # 4) Test DELETE supplier with associated transfer -> expect 400 or 409
    corporate_transfer = create_supplier(token)
    try:
        transfer_resp = create_transfer(token, corporate_transfer)
        # Create attempt succeeded

        resp_delete_with_assoc = delete_supplier(token, corporate_transfer)
        assert resp_delete_with_assoc.status_code in (400, 409), (
            f"Expected 400 or 409 when deleting supplier with associated transfer, got {resp_delete_with_assoc.status_code}"
        )
    finally:
        # Cleanup: delete transfer first then supplier to avoid foreign key constraint/blocking
        try:
            # Get transfer ID from created transfer resp for deletion
            transfer_id = None
            if isinstance(transfer_resp, dict):
                if 'data' in transfer_resp and isinstance(transfer_resp['data'], dict):
                    # If API follows typical pattern, else fallback
                    transfer_id = transfer_resp['data'].get('id') or transfer_resp['data'].get('id_transfer') or transfer_resp.get('id') or transfer_resp.get('id_transfer')
                else:
                    transfer_id = transfer_resp.get('id') or transfer_resp.get('id_transfer')
            if transfer_id:
                url = f"{TRANSFERS_URL}/{transfer_id}"
                requests.delete(url, headers=headers_auth, timeout=REQUEST_TIMEOUT)
        except Exception:
            pass
        try:
            delete_supplier(token, corporate_transfer)
        except Exception:
            pass


test_delete_proveedor_success_and_edge_cases()