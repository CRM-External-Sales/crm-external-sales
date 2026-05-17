#!/usr/bin/env python3
"""Ejecuta todos los tests TC001-TC013 localmente y muestra resultado por test."""
import subprocess
import sys
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))

TESTS = [
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

passed = 0
failed = 0
results = []

print("Ejecutando tests locales (servidor debe estar en http://localhost:3000)\n")

for i, test in enumerate(TESTS, 1):
    tc_name = test.replace(".py", "").split("_", 1)[1] if "_" in test else test
    try:
        r = subprocess.run(
            [sys.executable, test],
            capture_output=True,
            text=True,
            timeout=90,
        )
        if r.returncode == 0:
            passed += 1
            results.append((i, test, "PASS", None))
            print(f"  [{i:2}/13] PASS  {tc_name}")
        else:
            failed += 1
            err = (r.stderr or r.stdout or "").strip()
            last_lines = "\n".join(err.split("\n")[-5:]) if err else "Sin salida"
            results.append((i, test, "FAIL", last_lines))
            print(f"  [{i:2}/13] FAIL  {tc_name}")
            print(f"           {last_lines[:200]}")
    except subprocess.TimeoutExpired:
        failed += 1
        results.append((i, test, "TIMEOUT", "Timeout 90s"))
        print(f"  [{i:2}/13] TIMEOUT {tc_name}")
    except Exception as e:
        failed += 1
        results.append((i, test, "ERROR", str(e)))
        print(f"  [{i:2}/13] ERROR  {tc_name}: {e}")

print(f"\n{'='*60}")
print(f"  Total: {passed}/13 pasaron, {failed}/13 fallaron")
print(f"{'='*60}\n")

if failed > 0:
    print("Detalle de fallos:")
    for i, test, status, err in results:
        if status != "PASS":
            print(f"  TC{i:02d} {test}")
            if err:
                print(f"    -> {err[:300]}")
    sys.exit(1)
sys.exit(0)
