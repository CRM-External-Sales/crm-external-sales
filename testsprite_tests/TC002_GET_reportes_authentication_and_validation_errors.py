import requests
#reportes fechas invalidas y no token
BASE_URL = "http://localhost:3000"
LOGIN_URL = f"{BASE_URL}/api/auth/login"
REPORTS_URL = f"{BASE_URL}/api/reports"

AUTH_CREDENTIALS = {
    "email": "fabricioarg97@gmail.com",
    "password": "Frjg1975"
}

def extract_token(login_response_json):
    data = login_response_json
    token = data.get('data',{}).get('session',{}).get('access_token') or data.get('session',{}).get('access_token') or data.get('access_token')
    return token

def test_get_reportes_auth_and_validation_errors():
    timeout = 30

    # Step 1: Login to get a valid token (for invalid token test and valid token base)
    login_resp = requests.post(LOGIN_URL, json=AUTH_CREDENTIALS, timeout=timeout)
    assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"
    login_json = login_resp.json()
    token = extract_token(login_json)
    assert token, "Token not found in login response"

    headers_valid = {"Authorization": f"Bearer {token}"}
    headers_invalid = {"Authorization": "Bearer invalid_or_expired_token"}

    # Test 1: GET /api/reports without token -> 401 Unauthorized
    resp_no_auth = requests.get(REPORTS_URL, timeout=timeout)
    assert resp_no_auth.status_code == 401, f"Expected 401 Unauthorized with no token, got {resp_no_auth.status_code}"

    # Test 2: GET /api/reports with invalid/expired token -> 401 Unauthorized
    resp_invalid_token = requests.get(REPORTS_URL, headers=headers_invalid, timeout=timeout)
    assert resp_invalid_token.status_code == 401, f"Expected 401 Unauthorized with invalid token, got {resp_invalid_token.status_code}"

    valid_base_params = {
        "tipo_reporte": "reservas_tiempo",
        "fecha_inicio": "2025-01-01",
        "fecha_fin": "2025-12-31"
    }

    # Test 3a: GET /api/reports with missing fecha_inicio -> 400 Validation error
    params_missing_fecha_inicio = {
        "tipo_reporte": "reservas_tiempo",
        "fecha_fin": "2025-12-31"
    }
    resp_missing_fecha_inicio = requests.get(REPORTS_URL, headers=headers_valid, params=params_missing_fecha_inicio, timeout=timeout)
    assert resp_missing_fecha_inicio.status_code == 400, f"Expected 400 Validation error missing fecha_inicio, got {resp_missing_fecha_inicio.status_code}"

    # Test 3b: GET /api/reports with missing fecha_fin -> 400 Validation error
    params_missing_fecha_fin = {
        "tipo_reporte": "reservas_tiempo",
        "fecha_inicio": "2025-01-01"
    }
    resp_missing_fecha_fin = requests.get(REPORTS_URL, headers=headers_valid, params=params_missing_fecha_fin, timeout=timeout)
    assert resp_missing_fecha_fin.status_code == 400, f"Expected 400 Validation error missing fecha_fin, got {resp_missing_fecha_fin.status_code}"

    # Test 3c: GET /api/reports with invalid fecha_inicio format -> 400 Validation error
    params_invalid_fecha_inicio = {
        "tipo_reporte": "reservas_tiempo",
        "fecha_inicio": "invalid-date-format",
        "fecha_fin": "2025-12-31"
    }
    resp_invalid_fecha_inicio = requests.get(REPORTS_URL, headers=headers_valid, params=params_invalid_fecha_inicio, timeout=timeout)
    assert resp_invalid_fecha_inicio.status_code == 400, f"Expected 400 Validation error invalid fecha_inicio, got {resp_invalid_fecha_inicio.status_code}"

    # Test 3d: GET /api/reports with invalid fecha_fin format -> 400 Validation error
    params_invalid_fecha_fin = {
        "tipo_reporte": "reservas_tiempo",
        "fecha_inicio": "2025-01-01",
        "fecha_fin": "2025-13-01"
    }
    resp_invalid_fecha_fin = requests.get(REPORTS_URL, headers=headers_valid, params=params_invalid_fecha_fin, timeout=timeout)
    assert resp_invalid_fecha_fin.status_code == 400, f"Expected 400 Validation error invalid fecha_fin, got {resp_invalid_fecha_fin.status_code}"

test_get_reportes_auth_and_validation_errors()