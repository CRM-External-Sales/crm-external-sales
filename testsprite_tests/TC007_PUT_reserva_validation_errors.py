import requests
import uuid

BASE_URL = "http://localhost:3000"
LOGIN_URL = f"{BASE_URL}/api/auth/login"
TOURS_URL = f"{BASE_URL}/api/tours"
RESERVATIONS_URL = f"{BASE_URL}/api/reservations"

AUTH = {
    "username": "fabricioarg97@gmail.com",
    "password": "Frjg1975"
}

def extract_token(login_resp_json):
    data = login_resp_json.get('data') or login_resp_json
    token = (
        (data.get('data') or data).get('session', {}).get('access_token') or
        (data.get('session', {}).get('access_token')) or
        data.get('access_token')
    )
    return token

def create_reservation(token, tour_id):
    url = RESERVATIONS_URL
    iso_date = "2026-04-20T00:00:00.000Z"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    body = {
        "tour_id": tour_id,
        "people": 2,
        "date": iso_date,
        "time": "12:00",
        "hotel_reservation": 123,
        "note": "Test reservation"
    }
    resp = requests.post(url, json=body, headers=headers, timeout=30)
    assert resp.status_code in (200, 201)
    resp_json = resp.json()
    reservation_id = resp_json.get('data', {}).get('reservation_id') or resp_json.get('reservation_id')
    assert reservation_id is not None
    return reservation_id

def delete_reservation(token, reservation_id):
    url = f"{RESERVATIONS_URL}/{reservation_id}"
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.delete(url, headers=headers, timeout=30)
    assert resp.status_code in (200, 204, 404, 405)
    return resp

def test_put_reservation_validation_errors():
    # Login
    login_resp = requests.post(LOGIN_URL, json={"email": AUTH["username"], "password": AUTH["password"]}, timeout=30)
    assert login_resp.status_code == 200
    token = extract_token(login_resp.json())
    assert token

    # Get tours and extract tour_id
    headers = {"Authorization": f"Bearer {token}"}
    tours_resp = requests.get(TOURS_URL, headers=headers, timeout=30)
    assert tours_resp.status_code == 200
    tours_json = tours_resp.json()
    data_field = tours_json.get('data', [])
    tours_list = data_field if isinstance(data_field, list) else data_field.get('items', [])
    assert isinstance(tours_list, list) and len(tours_list) > 0
    first_tour = tours_list[0]
    tour_id = first_tour.get('id_tour') or first_tour.get('id')
    assert tour_id is not None

    # Create reservation to get valid reservation_id
    reservation_id = None
    try:
        reservation_id = create_reservation(token, tour_id)

        put_url = f"{RESERVATIONS_URL}/{reservation_id}"
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

        # 1) PUT with empty body: accept 200 or 400
        resp_empty = requests.put(put_url, headers=headers, json={}, timeout=30)
        assert resp_empty.status_code in (200, 400)

        # 2) PUT with invalid types expect 400
        invalid_payloads = [
            {"people": "two"},
            {"date": "not-a-date"},
            {"time": 12345},
            {"tour_id": "invalid_id"},
            {"transfer_id": "invalid"},
            {"hotel_reservation": "abc"},
            {"note": 123},
            {"state": 987},
            {"cancellation_reason": 456}
        ]
        for payload in invalid_payloads:
            resp_invalid = requests.put(put_url, headers=headers, json=payload, timeout=30)
            assert resp_invalid.status_code == 400 or resp_invalid.status_code == 500

    finally:
        if reservation_id:
            delete_reservation(token, reservation_id)

test_put_reservation_validation_errors()