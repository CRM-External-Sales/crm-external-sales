import requests
from requests.exceptions import RequestException
import uuid

BASE_URL = "http://localhost:3000"
LOGIN_URL = f"{BASE_URL}/api/auth/login"
TOURS_URL = f"{BASE_URL}/api/tours"
RESERVATIONS_URL = f"{BASE_URL}/api/reservations"

USERNAME = "fabricioarg97@gmail.com"
PASSWORD = "Frjg1975"
TIMEOUT = 30

def test_post_reserva_successful_request_with_valid_data():
    # Login to get token
    try:
        login_resp = requests.post(
            LOGIN_URL,
            json={"email": USERNAME, "password": PASSWORD},
            timeout=TIMEOUT
        )
        login_resp.raise_for_status()
        login_data = login_resp.json()
    except RequestException as e:
        assert False, f"Login request failed: {e}"

    # Extract token based on instruction (token = data.get('data',{}).get('session',{}).get('access_token')
    token = (
        login_data.get('data', {})
        .get('session', {})
        .get('access_token')
        or login_data.get('session', {})
        .get('access_token')
        or login_data.get('access_token')
    )
    assert token, "Failed to obtain access token from login response"

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Get tours to obtain tour_id
    try:
        tours_resp = requests.get(TOURS_URL, headers=headers, timeout=TIMEOUT)
        tours_resp.raise_for_status()
        tours_json = tours_resp.json()
    except RequestException as e:
        assert False, f"GET /api/tours failed: {e}"

    data_field = tours_json.get('data', [])
    tours_list = data_field if isinstance(data_field, list) else data_field.get('items', [])
    assert isinstance(tours_list, list) and len(tours_list) > 0, "No tours found to obtain tour_id"

    first_tour = tours_list[0]
    tour_id = first_tour.get('id_tour') or first_tour.get('id')
    assert tour_id is not None, "Tour id not found in first tour item"

    # Prepare reservation data
    # Date in ISO 8601 datetime format
    reservation_payload = {
        "tour_id": tour_id,
        "people": 2,
        "date": "2026-04-20T00:00:00.000Z",
        "time": "10:00",
        "hotel_reservation": 12345,
        "note": "Test reservation note"
    }

    reservation_resp = None
    try:
        reservation_resp = requests.post(
            RESERVATIONS_URL,
            headers=headers,
            json=reservation_payload,
            timeout=TIMEOUT
        )
        assert reservation_resp.status_code in (200, 201), f"Unexpected status code: {reservation_resp.status_code}"
        reservation_data = reservation_resp.json()
        assert "reservation_id" in reservation_data or "data" in reservation_data, "No reservation id in response"
    except RequestException as e:
        assert False, f"POST /api/reservations request failed: {e}"
    finally:
        # Cleanup: Delete the created reservation if possible
        if reservation_resp and reservation_resp.ok:
            resp_json = reservation_resp.json()
            # Attempt to get reservation_id from response top-level or data field
            reservation_id = None
            if 'reservation_id' in resp_json:
                reservation_id = resp_json.get('reservation_id')
            elif 'data' in resp_json and isinstance(resp_json['data'], dict):
                reservation_id = resp_json['data'].get('reservation_id') or resp_json['data'].get('id')
            if reservation_id:
                try:
                    del_resp = requests.delete(
                        f"{RESERVATIONS_URL}/{reservation_id}",
                        headers=headers,
                        timeout=TIMEOUT
                    )
                    assert del_resp.status_code in (200, 204, 404, 405), f"Unexpected delete status: {del_resp.status_code}"
                except RequestException:
                    pass  # Ignore cleanup errors

test_post_reserva_successful_request_with_valid_data()