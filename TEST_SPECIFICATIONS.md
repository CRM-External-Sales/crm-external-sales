# Test Specifications: Backend API Tests for Specific Endpoints

## 📋 Project Context

**Project:** ProyectoCRM - CRM External Sales  
**Backend Framework:** Next.js 15 with API Routes  
**Authentication:** Supabase Auth (JWT tokens)  
**Database:** PostgreSQL with Prisma ORM  
**Base URL:** `http://localhost:3000/api`

---

## 🎯 Scope: Endpoints to Test

**IMPORTANT:** Generate automated backend API tests **ONLY** for the following specific endpoints. Do NOT generate tests for any other modules or endpoints.

### 1. AuthSupabase Reportes (Reports)
- **Endpoint:** `GET /api/reports`
- **Real Route:** `src/app/api/reports/route.ts`
- **Authentication Required:** Yes (Admin only)
- **Method:** GET

### 2. AuthSupabase Reserva (Reservations)
- **Endpoint:** `POST /api/reservations`
- **Real Route:** `src/app/api/reservations/route.ts`
- **Authentication Required:** Yes (Agent or Admin)
- **Method:** POST

- **Endpoint:** `GET /api/reservations`
- **Real Route:** `src/app/api/reservations/route.ts`
- **Authentication Required:** Yes (Agent or Admin)
- **Method:** GET

- **Endpoint:** `PUT /api/reservations/:id`
- **Real Route:** `src/app/api/reservations/[id]/route.ts`
- **Authentication Required:** Yes (Admin only)
- **Method:** PUT

### 3. AuthSupabase Proveedor (Suppliers)
- **Endpoint:** `GET /api/suppliers`
- **Real Route:** `src/app/api/suppliers/route.ts`
- **Authentication Required:** Yes (Agent or Admin)
- **Method:** GET

- **Endpoint:** `POST /api/suppliers`
- **Real Route:** `src/app/api/suppliers/route.ts`
- **Authentication Required:** Yes (Admin only)
- **Method:** POST

- **Endpoint:** `PUT /api/suppliers/:corporate`
- **Real Route:** `src/app/api/suppliers/[corporate]/route.ts`
- **Authentication Required:** Yes (Admin only)
- **Method:** PUT

- **Endpoint:** `DELETE /api/suppliers/:corporate`
- **Real Route:** `src/app/api/suppliers/[corporate]/route.ts`
- **Authentication Required:** Yes (Admin only)
- **Method:** DELETE

---

## ✅ Testing Requirements

For **EACH** endpoint listed above, generate tests that validate the following scenarios:

### 1. Successful Request Tests

#### For GET Endpoints:
- ✅ **Test:** Valid request with proper authentication
  - Expected HTTP status: `200`
  - Expected response structure matches schema
  - Expected data fields are present
  - Pagination works correctly (if applicable)
  - Filters work correctly (if applicable)

#### For POST Endpoints:
- ✅ **Test:** Valid request with proper authentication and valid data
  - Expected HTTP status: `201` (created) or `200`
  - Expected response structure matches schema
  - Created resource has correct data
  - Resource is actually created in database

#### For PUT Endpoints:
- ✅ **Test:** Valid request with proper authentication and valid data
  - Expected HTTP status: `200`
  - Expected response structure matches schema
  - Updated resource has correct modified data
  - Resource is actually updated in database

#### For DELETE Endpoints:
- ✅ **Test:** Valid request with proper authentication
  - Expected HTTP status: `200` or `204`
  - Expected response structure (if any)
  - Resource is actually deleted from database (or soft-deleted)

---

### 2. Authentication Tests

For **ALL** endpoints, test authentication scenarios:

#### Test: Request without Supabase token
- ✅ **Test:** Request without `Authorization` header
  - Expected HTTP status: `401 Unauthorized`
  - Expected error message indicates missing authentication

#### Test: Invalid token
- ✅ **Test:** Request with invalid/malformed token
  - Expected HTTP status: `401 Unauthorized`
  - Expected error message indicates invalid token
  - Token format: `Bearer <invalid_token>`

#### Test: Expired token
- ✅ **Test:** Request with expired JWT token
  - Expected HTTP status: `401 Unauthorized`
  - Expected error message indicates expired token

#### Test: Insufficient permissions (Role-based)
- ✅ **Test:** Request with valid token but insufficient role
  - For admin-only endpoints: Test with Agent or Customer role
  - Expected HTTP status: `403 Forbidden`
  - Expected error message indicates insufficient permissions

---

### 3. Validation Error Tests

For **POST** and **PUT** endpoints, test validation scenarios:

#### Test: Missing required fields
- ✅ **Test:** Request with missing required fields
  - Expected HTTP status: `400 Bad Request`
  - Expected error message lists missing required fields
  - Error structure follows validation schema format

#### Test: Invalid data types
- ✅ **Test:** Request with incorrect data types
  - String instead of number
  - Number instead of string
  - Invalid date format
  - Invalid email format
  - Invalid enum values
  - Expected HTTP status: `400 Bad Request`
  - Expected error message indicates type mismatch

#### Test: Incorrect request format
- ✅ **Test:** Request with malformed JSON
  - Expected HTTP status: `400 Bad Request`
  - Expected error message indicates JSON parsing error

#### Test: Invalid field values
- ✅ **Test:** Request with invalid field values
  - Negative numbers where positive required
  - Empty strings where non-empty required
  - Values outside allowed ranges
  - Expected HTTP status: `400 Bad Request`

---

### 4. Edge Cases Tests

#### Test: Resource not found (404)
- ✅ **For GET/PUT/DELETE with ID parameters:**
  - Test with non-existent ID
  - Expected HTTP status: `404 Not Found`
  - Expected error message indicates resource not found

#### Test: Empty database responses
- ✅ **For GET endpoints:**
  - Test when database has no matching records
  - Expected HTTP status: `200`
  - Expected response: Empty array `[]` or empty object `{}`
  - Pagination metadata should still be present

#### Test: Invalid ID parameters
- ✅ **For endpoints with path parameters:**
  - Test with invalid ID format (non-numeric, negative, zero)
  - Expected HTTP status: `400 Bad Request` or `404 Not Found`
  - Expected error message indicates invalid ID format

#### Test: Duplicate resource creation
- ✅ **For POST endpoints:**
  - Test creating resource with duplicate unique fields
  - Expected HTTP status: `409 Conflict` or `400 Bad Request`
  - Expected error message indicates duplicate resource

#### Test: Resource with active associations
- ✅ **For DELETE endpoints:**
  - Test deleting resource that has associated records (e.g., supplier with tours)
  - Expected HTTP status: `403 Forbidden` or `400 Bad Request`
  - Expected error message indicates active associations

---

## 📝 Endpoint-Specific Test Details

### GET /api/reports

**Query Parameters:**
- `tipo_reporte`: Required (reservas_tiempo, reservas_estado, reservas_empleado, ingresos_tiempo, ingresos_tour)
- `granularidad_temporal`: Required for time-based reports (semana, mes, trimestre, año)
- `fecha_inicio`: Required (ISO format)
- `fecha_fin`: Required (ISO format)
- `tourId`: Optional (BigInt)
- `usuarioId`: Optional (UUID)
- `estado`: Optional (string)
- `tipo_reserva`: Optional (con_transfer, sin_transfer)

**Success Response Structure:**
```json
{
  "success": true,
  "data": {
    "kpis": {
      "total_reservas": number,
      "reservas_canceladas": number,
      "reservas_confirmadas": number,
      "ingresos_totales": number,
      "descuentos_totales": number,
      "iva_total": number
    },
    "grafico": array,
    "reservas": array
  }
}
```

**Test Cases:**
1. ✅ Valid report with all required parameters
2. ✅ Missing `tipo_reporte` parameter
3. ✅ Missing `granularidad_temporal` for time-based reports
4. ✅ Invalid date format
5. ✅ Date range where end < start
6. ✅ Invalid `tipo_reporte` value
7. ✅ Request without authentication (401)
8. ✅ Request with non-admin role (403)
9. ✅ Empty database (no reservations in date range)

---

### POST /api/reservations

**Request Body:**
```json
{
  "tour_id": number (required),
  "people": number (required, > 0),
  "date": string (ISO date, required),
  "time": string (HH:mm format, required),
  "hotel_reservation": number (required),
  "note": string (required),
  "transfer_id": number (optional)
}
```

**Success Response Structure:**
```json
{
  "success": true,
  "data": {
    "reservation_id": number,
    "tour_amount": number,
    "transfer_amount": number,
    "subtotal": number,
    "iva": number,
    "discount": number,
    "total": number,
    ...
  }
}
```

**Test Cases:**
1. ✅ Create reservation with valid data (tour only)
2. ✅ Create reservation with tour and transfer
3. ✅ Missing required field `tour_id`
4. ✅ Missing required field `people`
5. ✅ Invalid `tour_id` (non-existent)
6. ✅ Invalid `transfer_id` (non-existent)
7. ✅ Invalid `people` (zero or negative)
8. ✅ Invalid date format
9. ✅ Invalid time format
10. ✅ Request without authentication (401)
11. ✅ Request with Customer role (403)
12. ✅ Duplicate reservation (if applicable)

---

### GET /api/reservations

**Query Parameters:**
- `date`: Optional (ISO or YYYY-MM-DD)
- `state`: Optional (pending, confirmed, cancelled, completed)
- `page`: Optional (default: 1)
- `limit`: Optional (default: 10)

**Success Response Structure:**
```json
{
  "success": true,
  "data": {
    "reservations": array,
    "pagination": {
      "page": number,
      "limit": number,
      "total": number,
      "totalPages": number
    }
  }
}
```

**Test Cases:**
1. ✅ Get all reservations (admin sees all, agent sees own)
2. ✅ Filter by date
3. ✅ Filter by state
4. ✅ Pagination (page and limit)
5. ✅ Invalid date format
6. ✅ Invalid state value
7. ✅ Invalid pagination parameters (negative, zero)
8. ✅ Request without authentication (401)
9. ✅ Empty database response
10. ✅ Agent can only see own reservations

---

### PUT /api/reservations/:id

**Request Body (all fields optional):**
```json
{
  "people": number,
  "tour_id": number,
  "transfer_id": number,
  "date": string,
  "time": string,
  "hotel_reservation": number,
  "note": string,
  "state": string,
  "cancellation_reason": string (required if state = "cancelled")
}
```

**Success Response Structure:**
```json
{
  "success": true,
  "data": {
    "reservation_id": number,
    "tour_amount": number,
    "transfer_amount": number,
    "subtotal": number,
    "iva": number,
    "total": number,
    ...
  }
}
```

**Test Cases:**
1. ✅ Update reservation with valid data
2. ✅ Update people (recalculates amounts)
3. ✅ Update tour_id (recalculates amounts)
4. ✅ Cancel reservation with cancellation_reason
5. ✅ Cancel reservation without cancellation_reason (should fail)
6. ✅ Update non-existent reservation (404)
7. ✅ Invalid reservation ID format
8. ✅ Invalid data types
9. ✅ Request without authentication (401)
10. ✅ Request with non-admin role (403)
11. ✅ Recalculation of amounts when tour/people change

---

### GET /api/suppliers

**Query Parameters:**
- `company`: Optional (string, min 2 chars)
- `service`: Optional (string, min 2 chars)
- `page`: Optional (default: 1)
- `limit`: Optional (default: 10)

**Success Response Structure:**
```json
{
  "success": true,
  "data": {
    "suppliers": array,
    "pagination": {
      "page": number,
      "limit": number,
      "total": number,
      "totalPages": number
    }
  }
}
```

**Test Cases:**
1. ✅ Get all suppliers with pagination
2. ✅ Filter by company name
3. ✅ Filter by service
4. ✅ Combined filters (company + service)
5. ✅ Filter with less than 2 characters (should fail or ignore)
6. ✅ Invalid pagination parameters
7. ✅ Request without authentication (401)
8. ✅ Request with Customer role (403)
9. ✅ Empty database response

---

### POST /api/suppliers

**Request Body:**
```json
{
  "corporate": number (required, unique),
  "company": string (required),
  "phone": string (required, unique),
  "email": string (required, unique, valid email),
  "service": string (required)
}
```

**Success Response Structure:**
```json
{
  "success": true,
  "data": {
    "corporate": number,
    "company": string,
    "phone": string,
    "email": string,
    "service": string,
    "created_at": string
  }
}
```

**Test Cases:**
1. ✅ Create supplier with valid data
2. ✅ Missing required field `corporate`
3. ✅ Missing required field `company`
4. ✅ Missing required field `phone`
5. ✅ Missing required field `email`
6. ✅ Missing required field `service`
7. ✅ Duplicate `corporate` (409 Conflict)
8. ✅ Duplicate `phone` (409 Conflict)
9. ✅ Duplicate `email` (409 Conflict)
10. ✅ Invalid email format
11. ✅ Invalid data types
12. ✅ Request without authentication (401)
13. ✅ Request with non-admin role (403)

---

### PUT /api/suppliers/:corporate

**Request Body (all fields optional):**
```json
{
  "company": string,
  "phone": string,
  "email": string,
  "service": string
}
```

**Success Response Structure:**
```json
{
  "success": true,
  "data": {
    "corporate": number,
    "company": string,
    "phone": string,
    "email": string,
    "service": string,
    "updated_at": string
  }
}
```

**Test Cases:**
1. ✅ Update supplier with valid data
2. ✅ Update single field
3. ✅ Update multiple fields
4. ✅ Update with duplicate phone (409 Conflict)
5. ✅ Update with duplicate email (409 Conflict)
6. ✅ Update non-existent supplier (404)
7. ✅ Invalid corporate ID format
8. ✅ Invalid email format
9. ✅ Invalid data types
10. ✅ Request without authentication (401)
11. ✅ Request with non-admin role (403)

---

### DELETE /api/suppliers/:corporate

**Success Response Structure:**
```json
{
  "success": true,
  "message": "Supplier deleted successfully"
}
```

**Test Cases:**
1. ✅ Delete supplier with no associations
2. ✅ Delete supplier with associated tours (403 Forbidden)
3. ✅ Delete supplier with associated transfers (403 Forbidden)
4. ✅ Delete non-existent supplier (404)
5. ✅ Invalid corporate ID format
6. ✅ Request without authentication (401)
7. ✅ Request with non-admin role (403)

---

## 🚫 Important Constraints

### DO NOT Generate Tests For:
- ❌ Authentication endpoints (`/api/auth/*`)
- ❌ User management endpoints (`/api/users/*`, `/api/user`)
- ❌ Tour endpoints (`/api/tours/*`)
- ❌ Transfer endpoints (`/api/transfers/*`)
- ❌ Upload endpoints (`/api/upload`)
- ❌ Development endpoints (`/api/dev/*`)
- ❌ Any other endpoints not listed in the scope

### Focus Strictly On:
- ✅ Only the endpoints listed in the "Scope" section
- ✅ API endpoint testing (not frontend, not database directly)
- ✅ REST API contract validation
- ✅ Authentication and authorization
- ✅ Request/response validation

### Ignore:
- ⚠️ Unfinished backend code
- ⚠️ Unrelated backend modules
- ⚠️ Frontend components
- ⚠️ Database migrations
- ⚠️ Configuration files

---

## 📦 Test Organization

### Test Suite Structure

Organize tests in the following structure:

```
testsprite_tests/
├── TC_REP001_get_api_reports_*.py
├── TC_RES001_post_api_reservations_*.py
├── TC_RES002_get_api_reservations_*.py
├── TC_RES003_put_api_reservations_*.py
├── TC_SUP001_get_api_suppliers_*.py
├── TC_SUP002_post_api_suppliers_*.py
├── TC_SUP003_put_api_suppliers_*.py
└── TC_SUP004_delete_api_suppliers_*.py
```

### Test Naming Convention

- Format: `TC_{MODULE}{NUMBER}_{method}_{endpoint}_{scenario}.py`
- Examples:
  - `TC_REP001_get_api_reports_success_with_valid_params.py`
  - `TC_REP002_get_api_reports_unauthorized_without_token.py`
  - `TC_RES001_post_api_reservations_success_with_valid_data.py`
  - `TC_RES002_post_api_reservations_validation_missing_required_fields.py`

### Test Case Names

Use clear, descriptive test case names:
- `test_get_api_reports_success_with_valid_params`
- `test_get_api_reports_unauthorized_without_token`
- `test_get_api_reports_forbidden_with_agent_role`
- `test_post_api_reservations_success_with_tour_only`
- `test_post_api_reservations_validation_missing_tour_id`

---

## 🔧 Test Implementation Requirements

### Base Configuration

```python
BASE_URL = "http://localhost:3000/api"
TIMEOUT = 30

# Test credentials (use from config.json)
VALID_ADMIN_EMAIL = "dianamonterrey04@gmail.com"
VALID_ADMIN_PASSWORD = "Diamolka@-0704"
```

### Authentication Helper

```python
def get_auth_token(email, password):
    """Get Supabase JWT token by logging in"""
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": email, "password": password},
        timeout=TIMEOUT
    )
    if response.status_code == 200:
        return response.json().get("data", {}).get("token")
    return None
```

### Test Structure Template

```python
import requests
import pytest

BASE_URL = "http://localhost:3000/api"
TIMEOUT = 30

def test_{endpoint}_{scenario}():
    """
    Test: {Clear description of what is being tested}
    Expected: {Expected behavior}
    """
    # Arrange
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"  # or omit for auth tests
    }
    
    # Act
    response = requests.{method}(
        BASE_URL + "{endpoint}",
        json={payload},  # if applicable
        headers=headers,
        timeout=TIMEOUT
    )
    
    # Assert
    assert response.status_code == {expected_status}
    assert response.json()["success"] == {expected_success}
    # Additional assertions...
```

---

## 📊 Expected Output

### Test Files Generated

For each endpoint, generate separate test files covering:
1. Success scenarios
2. Authentication scenarios
3. Validation error scenarios
4. Edge cases

### Test Plan JSON

Update or create `testsprite_backend_test_plan.json` with test cases:

```json
[
  {
    "id": "TC_REP001",
    "title": "get api reports success with valid params",
    "description": "Test GET /api/reports with valid tipo_reporte, granularidad_temporal, fecha_inicio, and fecha_fin to receive 200 response with report data"
  },
  {
    "id": "TC_REP002",
    "title": "get api reports unauthorized without token",
    "description": "Test GET /api/reports without Authorization header to receive 401 unauthorized error"
  }
  // ... more test cases
]
```

---

## ✅ Acceptance Criteria

Tests are considered complete when:

1. ✅ All endpoints listed in scope have test coverage
2. ✅ Each endpoint has tests for:
   - Successful requests
   - Authentication (no token, invalid token, expired token, wrong role)
   - Validation errors (missing fields, invalid types, invalid format)
   - Edge cases (404, empty responses, invalid IDs, duplicates)
3. ✅ Tests are organized by endpoint
4. ✅ Test names are clear and descriptive
5. ✅ Tests are ready to run (no syntax errors, proper imports)
6. ✅ Tests follow existing project structure
7. ✅ No tests generated for endpoints outside scope

---

## 📚 References

- **Project Path:** `C:\Users\ACER\Documents\ProyectoCRM`
- **API Base URL:** `http://localhost:3000/api`
- **Authentication:** Supabase JWT tokens
- **Test Framework:** Python with requests library
- **Existing Test Structure:** `testsprite_tests/TC*.py`

---

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Status:** Ready for Test Generation

