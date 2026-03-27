import requests
import uuid
import random
import string
import time

BASE_URL = "http://localhost:3000"
LOGIN_URL = f"{BASE_URL}/api/auth/login"
SUPPLIERS_URL = f"{BASE_URL}/api/suppliers"

AUTH_CREDENTIALS = {
    "email": "fabricioarg97@gmail.com",
    "password": "Frjg1975"
}

HEADERS_JSON = {"Content-Type": "application/json"}
REQUEST_TIMEOUT = 30


def login():
    try:
        resp = requests.post(
            LOGIN_URL,
            json={"email": AUTH_CREDENTIALS["email"], "password": AUTH_CREDENTIALS["password"]},
            timeout=REQUEST_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
        token = (
            data.get("data", {})
            .get("session", {})
            .get("access_token") or
            data.get("session", {})
            .get("access_token") or
            data.get("access_token")
        )
        assert token, "Access token not found in login response"
        return token
    except Exception as e:
        raise RuntimeError(f"Login failed: {e}")


def random_corporate():
    return int(uuid.uuid4().int % 10**12) + 10**11


def random_email():
    prefix = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
    domain = "example.com"
    return f"{prefix}@{domain}"


def random_phone():
    return "".join(random.choices(string.digits, k=10))


def create_supplier(token, corporate_val):
    supplier_data = {
        "corporate": corporate_val,
        "company": "Test Company Inc",
        "phone": random_phone(),
        "email": random_email(),
        "service": "Test Service"
    }
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    try:
        resp = requests.post(
            SUPPLIERS_URL,
            json=supplier_data,
            headers=headers,
            timeout=REQUEST_TIMEOUT,
        )
        return resp, supplier_data
    except Exception as e:
        raise RuntimeError(f"Create supplier request failed: {e}")


def delete_supplier(token, corporate_val):
    headers = {
        "Authorization": f"Bearer {token}"
    }
    try:
        resp = requests.delete(
            f"{SUPPLIERS_URL}/{corporate_val}",
            headers=headers,
            timeout=REQUEST_TIMEOUT,
        )
        # Accept 200, 400, 403, 404 per API docs, but mainly 200 on success
        assert resp.status_code in (200, 400, 403, 404)
        return resp
    except Exception as e:
        raise RuntimeError(f"Delete supplier request failed: {e}")


def test_put_proveedor_successful_and_edge_cases():
    token = login()
    headers_auth = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    corporate = None
    supplier_data = None
    cleanup_needed = False

    # Create supplier with retry up to 5 times for 409 conflict on duplicate corporate
    max_retries = 5
    for attempt in range(max_retries):
        corporate_candidate = random_corporate()
        resp_create, supplier_data = create_supplier(token, corporate_candidate)
        if resp_create.status_code == 409:
            # Conflict, retry with new corporate
            continue
        elif resp_create.status_code in (200, 201):
            corporate = corporate_candidate
            cleanup_needed = True
            break
        else:
            # Unexpected error
            resp_create.raise_for_status()
    else:
        raise RuntimeError(f"Failed to create supplier after {max_retries} attempts due to 409 conflicts.")

    try:
        # Valid PUT update on supplier corporate

        update_payload = {
            "company": supplier_data["company"] + " Updated",
            "phone": supplier_data["phone"],
            "email": supplier_data["email"],
            "service": supplier_data["service"] + " Updated",
        }
        resp_put = requests.put(
            f"{SUPPLIERS_URL}/{corporate}",
            headers=headers_auth,
            json=update_payload,
            timeout=REQUEST_TIMEOUT,
        )
        assert resp_put.status_code == 200, f"Expected 200 on valid PUT update but got {resp_put.status_code}"

        # PUT update without token -> 401 Unauthorized
        headers_no_auth = {"Content-Type": "application/json"}
        resp_put_no_auth = requests.put(
            f"{SUPPLIERS_URL}/{corporate}",
            headers=headers_no_auth,
            json=update_payload,
            timeout=REQUEST_TIMEOUT,
        )
        assert resp_put_no_auth.status_code == 401, f"Expected 401 on PUT without token but got {resp_put_no_auth.status_code}"

        # PUT update on nonexistent corporate -> 404 Not Found
        fake_corporate = 999999999999  # Large number unlikely to exist
        # Ensure the fake_corporate is not equal to corporate created
        if fake_corporate == corporate:
            fake_corporate += 1
        resp_put_nonexistent = requests.put(
            f"{SUPPLIERS_URL}/{fake_corporate}",
            headers=headers_auth,
            json=update_payload,
            timeout=REQUEST_TIMEOUT,
        )
        assert resp_put_nonexistent.status_code == 404, f"Expected 404 on PUT nonexistent corporate but got {resp_put_nonexistent.status_code}"

    finally:
        if cleanup_needed and corporate is not None:
            delete_supplier(token, corporate)


test_put_proveedor_successful_and_edge_cases()