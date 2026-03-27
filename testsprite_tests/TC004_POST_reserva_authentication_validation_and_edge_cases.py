import requests
import uuid

BASE_URL = "http://localhost:3000"
LOGIN_URL = f"{BASE_URL}/api/auth/login"
TOURS_URL = f"{BASE_URL}/api/tours"
RESERVATIONS_URL = f"{BASE_URL}/api/reservations"

USERNAME = "fabricioarg97@gmail.com"
PASSWORD = "Frjg1975"

def get_token():
    try:
        resp = requests.post(
            LOGIN_URL,
            json={"email": USERNAME, "password": PASSWORD},
            timeout=30
        )
        resp.raise_for_status()
        data = resp.json()
        token = (
            data.get('data', {}).get('session', {}).get('access_token') or
            data.get('session', {}).get('access_token') or
            data.get('access_token')
        )
        return token
    except Exception:
        return None

def get_valid_tour_id(token):
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    try:
        resp = requests.get(TOURS_URL, headers=headers, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        data_field = data.get('data', [])
        tours_list = data_field if isinstance(data_field, list) else data_field.get('items', [])
        if not tours_list:
            return None
        first = tours_list[0]
        tour_id = first.get('id_tour') or first.get('id')
        return tour_id
    except Exception:
        return None

def test_post_reserva_auth_validation_and_edge_cases():
    # Test POST /reserva without token -> expect 401
    payload_minimal = {
        "tour_id": 1,
        "people": 1,
        "date": "2026-04-20T00:00:00.000Z",
        "time": "10:00",
        "hotel_reservation": 0,
        "note": ""
    }
    # Without token
    resp = requests.post(f"{BASE_URL}/api/reservations", json=payload_minimal, timeout=30)
    assert resp.status_code == 401, f"Expected 401 without token, got {resp.status_code}"

    # With invalid/expired token
    invalid_token = "Bearer invalidtokenexpired123"
    headers_invalid = {"Authorization": invalid_token}
    resp = requests.post(f"{BASE_URL}/api/reservations", json=payload_minimal, headers=headers_invalid, timeout=30)
    assert resp.status_code == 401, f"Expected 401 with invalid token, got {resp.status_code}"

    # Get valid token and valid tour_id for further tests
    token = get_token()
    assert token is not None, "Failed to get valid token"
    headers = {"Authorization": f"Bearer {token}"}

    valid_tour_id = get_valid_tour_id(token)
    assert valid_tour_id is not None, "Failed to get valid tour_id"

    # Test missing required fields or invalid data types -> expect 400 validation error
    # Missing tour_id
    payload_missing_tour_id = {
        "people": 1,
        "date": "2026-04-20T00:00:00.000Z",
        "time": "10:00",
        "hotel_reservation": 0,
        "note": ""
    }
    resp = requests.post(f"{BASE_URL}/api/reservations", json=payload_missing_tour_id, headers=headers, timeout=30)
    assert resp.status_code == 400, f"Expected 400 missing tour_id, got {resp.status_code}"

    # Missing date
    payload_missing_date = {
        "tour_id": valid_tour_id,
        "people": 1,
        "time": "10:00",
        "hotel_reservation": 0,
        "note": ""
    }
    resp = requests.post(f"{BASE_URL}/api/reservations", json=payload_missing_date, headers=headers, timeout=30)
    assert resp.status_code == 400, f"Expected 400 missing date, got {resp.status_code}"

    # Missing time
    payload_missing_time = {
        "tour_id": valid_tour_id,
        "people": 1,
        "date": "2026-04-20T00:00:00.000Z",
        "hotel_reservation": 0,
        "note": ""
    }
    resp = requests.post(f"{BASE_URL}/api/reservations", json=payload_missing_time, headers=headers, timeout=30)
    assert resp.status_code == 400, f"Expected 400 missing time, got {resp.status_code}"

    # Invalid data types: tour_id string instead of number
    payload_invalid_tour_id_type = {
        "tour_id": "invalid_string",
        "people": 1,
        "date": "2026-04-20T00:00:00.000Z",
        "time": "10:00",
        "hotel_reservation": 0,
        "note": ""
    }
    resp = requests.post(f"{BASE_URL}/api/reservations", json=payload_invalid_tour_id_type, headers=headers, timeout=30)
    assert resp.status_code == 400, f"Expected 400 invalid tour_id datatype, got {resp.status_code}"

    # Invalid data types: date as integer
    payload_invalid_date_type = {
        "tour_id": valid_tour_id,
        "people": 1,
        "date": 20260420,
        "time": "10:00",
        "hotel_reservation": 0,
        "note": ""
    }
    resp = requests.post(f"{BASE_URL}/api/reservations", json=payload_invalid_date_type, headers=headers, timeout=30)
    assert resp.status_code == 400, f"Expected 400 invalid date datatype, got {resp.status_code}"

    # Invalid data types: time as integer
    payload_invalid_time_type = {
        "tour_id": valid_tour_id,
        "people": 1,
        "date": "2026-04-20T00:00:00.000Z",
        "time": 1000,
        "hotel_reservation": 0,
        "note": ""
    }
    resp = requests.post(f"{BASE_URL}/api/reservations", json=payload_invalid_time_type, headers=headers, timeout=30)
    assert resp.status_code == 400, f"Expected 400 invalid time datatype, got {resp.status_code}"

    # Test with nonexistent tour_id -> expect 404 or 400
    nonexistent_tour_id = 999999999999
    payload_nonexistent_tour = {
        "tour_id": nonexistent_tour_id,
        "people": 1,
        "date": "2026-04-20T00:00:00.000Z",
        "time": "10:00",
        "hotel_reservation": 0,
        "note": ""
    }
    resp = requests.post(f"{BASE_URL}/api/reservations", json=payload_nonexistent_tour, headers=headers, timeout=30)
    assert resp.status_code in (400, 404), f"Expected 400 or 404 for nonexistent tour_id, got {resp.status_code}"


test_post_reserva_auth_validation_and_edge_cases()