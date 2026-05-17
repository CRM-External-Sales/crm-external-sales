"""
Sincroniza el código de los tests locales (TC001-TC013) en tmp/test_results.json
para que TestSprite ejecute el código corregido al hacer reRunTests.
"""
import json
import os

TESTS_DIR = os.path.dirname(os.path.abspath(__file__))
TMP_DIR = os.path.join(TESTS_DIR, "tmp")
RESULTS_PATH = os.path.join(TMP_DIR, "test_results.json")

# Orden de archivos según TC001..TC013 en test_results.json
TC_FILES = [
    "TC001_GET_reportes_successful_request_with_valid_admin_token_and_parameters.py",
    "TC002_GET_reportes_authentication_and_validation_errors.py",
    "TC003_POST_reserva_successful_request_with_valid_data.py",
    "TC004_POST_reserva_authentication_validation_and_edge_cases.py",
    "TC005_GET_reserva_successful_request_and_authentication.py",
    "TC006_PUT_reserva_successful_request_and_edge_cases.py",
    "TC007_PUT_reserva_validation_errors.py",
    "TC008_GET_proveedor_successful_request_and_authentication.py",
    "TC009_POST_proveedor_successful_request_with_valid_data.py",
    "TC010_POST_proveedor_authentication_validation_and_duplicate.py",
    "TC011_PUT_proveedor_successful_request_and_edge_cases.py",
    "TC012_PUT_proveedor_validation_errors.py",
    "TC013_DELETE_proveedor_successful_request_and_edge_cases.py",
]


def main():
    with open(RESULTS_PATH, "r", encoding="utf-8") as f:
        results = json.load(f)

    if len(results) != len(TC_FILES):
        print(f"Warning: test_results has {len(results)} tests, expected {len(TC_FILES)}")

    for i, filename in enumerate(TC_FILES):
        if i >= len(results):
            break
        filepath = os.path.join(TESTS_DIR, filename)
        if not os.path.isfile(filepath):
            print(f"Skip (not found): {filename}")
            continue
        with open(filepath, "r", encoding="utf-8") as f:
            code = f.read()
        results[i]["code"] = code
        print(f"Updated: {results[i]['title'][:50]}...")

    with open(RESULTS_PATH, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"Done. Written to {RESULTS_PATH}")


if __name__ == "__main__":
    main()
