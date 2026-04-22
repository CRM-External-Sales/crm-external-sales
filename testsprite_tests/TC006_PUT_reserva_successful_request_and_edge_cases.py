import requests
import uuid

BASE_URL = "http://localhost:3000"
LOGIN_URL = f"{BASE_URL}/api/auth/login"
TOURS_URL = f"{BASE_URL}/api/tours"
RESERVATIONS_URL = f"{BASE_URL}/api/reservations"

AUTH_CREDENTIALS = {
    "email": "fabricioarg97@gmail.com",
    "password": "Frjg1975"
}

TIMEOUT = 30

def extract_token(resp_json):
    if not isinstance(resp_json, dict):
        return None
    # Per instructions: token = data.get('data',{}).get('session',{}).get('access_token') 
    # or data.get('session',{}).get('access_token') or data.get('access_token')
    data = resp_json.get('data', {})
    token = data.get('session', {}).get('access_token')
    if not token:
        token = data.get('data', {}).get('session', {}).get('access_token')
    if not token:
        token = resp_json.get('session', {}).get('access_token')
    if not token:
        token = resp_json.get('access_token')
    return token

def test_put_reserva_success_and_edge_cases():
    # 1. Login as admin and get token
    login_payload = {
        "email": AUTH_CREDENTIALS["email"],
        "password": AUTH_CREDENTIALS["password"]
    }
    login_resp = requests.post(LOGIN_URL, json=login_payload, timeout=TIMEOUT)
    assert login_resp.status_code == 200, f"Login failed with {login_resp.status_code}"
    login_json = login_resp.json()
    token = extract_token(login_json)
    assert token, "Failed to extract access_token from login response"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # 2. Get tours to obtain tour_id
    tours_resp = requests.get(TOURS_URL, headers=headers, timeout=TIMEOUT)
    assert tours_resp.status_code == 200, f"GET tours failed with {tours_resp.status_code}"
    tours_json = tours_resp.json()
    data_field = tours_json.get('data', [])
    tours_list = data_field if isinstance(data_field, list) else data_field.get('items', [])
    assert isinstance(tours_list, list) and len(tours_list) > 0, "Tours list is empty"
    first_tour = tours_list[0]
    tour_id = first_tour.get('id_tour') or first_tour.get('id')
    assert tour_id is not None, "Could not extract tour_id from tours list"

    # 3. Create a reservation first (POST /api/reservations)
    create_payload = {
        "tour_id": tour_id,
        "people": 2,
        "date": "2026-12-01T00:00:00.000Z",  # ISO 8601 datetime
        "time": "10:00",
        "hotel_reservation": 1,
        "note": "Initial reservation"
    }
    create_resp = requests.post(RESERVATIONS_URL, headers=headers, json=create_payload, timeout=TIMEOUT)
    assert create_resp.status_code in (200, 201), f"Reservation create failed with {create_resp.status_code}"
    create_json = create_resp.json()
    reservation_id = create_json.get('data', {}).get('reservation_id') or create_json.get('reservation_id')
    assert reservation_id is not None, "Reservation ID not returned after creation"

    try:
        # 4. PUT update reservation with valid token and expect 200
        update_payload = {
            "people": 4,
            "note": "Updated reservation note"
        }
        put_url = f"{RESERVATIONS_URL}/{reservation_id}"
        put_resp = requests.put(put_url, headers=headers, json=update_payload, timeout=TIMEOUT)
        assert put_resp.status_code == 200, f"PUT update failed with status {put_resp.status_code}"

        # 5. PUT update reservation without token - expect 401 Unauthorized
        put_resp_no_token = requests.put(put_url, json=update_payload, timeout=TIMEOUT)
        assert put_resp_no_token.status_code == 401, f"PUT without token expected 401 but got {put_resp_no_token.status_code}"

        # 6. PUT update with nonexistent reservation id - expect 404
        invalid_id = 999999999999
        put_url_invalid = f"{RESERVATIONS_URL}/{invalid_id}"
        put_resp_invalid = requests.put(put_url_invalid, headers=headers, json=update_payload, timeout=TIMEOUT)
        assert put_resp_invalid.status_code == 404, f"PUT with nonexistent id expected 404 but got {put_resp_invalid.status_code}"

    finally:
        # Cleanup: delete created reservation, accept 200/204/404/405 per instructions
        del_url = f"{RESERVATIONS_URL}/{reservation_id}"
        try:
            del_resp = requests.delete(del_url, headers=headers, timeout=TIMEOUT)
            assert del_resp.status_code in (200, 204, 404, 405), f"Cleanup DELETE unexpected status {del_resp.status_code}"
        except Exception:
            pass

test_put_reserva_success_and_edge_cases()