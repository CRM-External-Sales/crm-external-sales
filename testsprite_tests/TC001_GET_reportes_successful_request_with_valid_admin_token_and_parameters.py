import requests

BASE_URL = "http://localhost:3000"
LOGIN_ENDPOINT = "/api/auth/login"
REPORTS_ENDPOINT = "/api/reports"

ADMIN_EMAIL = "fabricioarg97@gmail.com"
ADMIN_PASSWORD = "Frjg1975"
TIMEOUT = 30

def test_get_reportes_success_with_valid_admin_token_and_params():
    # Step 1: Login to get access token
    login_payload = {
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    }
    login_resp = requests.post(
        BASE_URL + LOGIN_ENDPOINT,
        json=login_payload,
        timeout=TIMEOUT
    )
    assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"

    login_data = login_resp.json()
    token = (
        login_data.get('data', {}).get('session', {}).get('access_token') or
        login_data.get('session', {}).get('access_token') or
        login_data.get('access_token')
    )
    assert token and isinstance(token, str), "Token not found in login response"

    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json"
    }

    # Step 2: Prepare query parameters for reports
    params = {
        "tipo_reporte": "trimestral",
        "fecha_inicio": "2026-01-01",
        "fecha_fin": "2026-03-31",
        "granularidad_temporal": "mes"
    }

    # Step 3: Call GET /api/reports with the query params and Authorization header
    resp = requests.get(
        BASE_URL + REPORTS_ENDPOINT,
        headers=headers,
        params=params,
        timeout=TIMEOUT
    )
    assert resp.status_code == 200, f"Expected 200 OK but got {resp.status_code}"

    json_resp = resp.json()
    # The response must have data.kpis, data.grafico, data.reservas
    data = json_resp.get("data")
    assert data is not None, "Response JSON does not have 'data' object"

    assert "kpis" in data, "'kpis' key not found in 'data'"
    assert "grafico" in data, "'grafico' key not found in 'data'"
    assert "reservas" in data, "'reservas' key not found in 'data'"

    # Optional: check that these fields are non-empty or correct type
    assert isinstance(data["kpis"], dict) or isinstance(data["kpis"], list), "'kpis' should be dict or list"
    assert isinstance(data["grafico"], dict) or isinstance(data["grafico"], list), "'grafico' should be dict or list"
    assert isinstance(data["reservas"], list), "'reservas' should be a list"


test_get_reportes_success_with_valid_admin_token_and_params()
