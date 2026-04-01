# /api/v2 Compared to OpenAPI

This note compares Frappe's `/api/v2` implementation in [v2.py](/Users/netchampfaris/Projects/frappe-bench/apps/frappe/frappe/api/v2.py) with what an OpenAPI 3.x description would normally provide.

## Summary

`/api/v2` is implementation-first, not spec-first.

- Routes are declared explicitly with Werkzeug `Rule` objects in [v2.py](/Users/netchampfaris/Projects/frappe-bench/apps/frappe/frappe/api/v2.py).
- Dispatch is done at runtime through the API URL map in [__init__.py](/Users/netchampfaris/Projects/frappe-bench/apps/frappe/frappe/api/__init__.py).
- Request and response shapes are often derived from `frappe.form_dict`, DocType metadata, controller code, and permission checks at runtime.
- The repository does not currently contain an OpenAPI generator or checked-in OpenAPI spec for `/api/v2`.

That means `/api/v2` can be described by OpenAPI, but only part of it maps cleanly to a precise, strongly typed spec.

## Where `/api/v2` maps well to OpenAPI

The following parts are structurally compatible with a conventional OpenAPI document:

- Fixed routes with fixed HTTP methods.
- Path parameters such as `doctype` and `name`.
- Common response envelope behavior where handlers return data that is later wrapped as JSON.
- Basic error modeling for validation and permission failures.
- Collection and resource-style endpoints for CRUD operations.

These endpoints are good candidates for a stable OpenAPI spec:

| Route | Methods | Notes |
| --- | --- | --- |
| `/api/v2/document/{doctype}` | `GET` | List/query documents |
| `/api/v2/document/{doctype}` | `POST` | Create document |
| `/api/v2/document/{doctype}/bulk_delete` | `POST` | Bulk delete within one doctype |
| `/api/v2/document/{doctype}/bulk_update` | `POST` | Bulk update within one doctype |
| `/api/v2/document/{doctype}/{name}/` | `GET` | Read one document |
| `/api/v2/document/{doctype}/{name}/copy` | `GET` | Get copy payload |
| `/api/v2/document/{doctype}/{name}/` | `PUT`, `PATCH` | Update document |
| `/api/v2/document/{doctype}/{name}/` | `DELETE` | Delete document |
| `/api/v2/document/{doctype}/{name}/method/{method}/` | `GET`, `POST` | Run document method |
| `/api/v2/doctype/{doctype}/meta` | `GET` | Read DocType metadata |
| `/api/v2/doctype/{doctype}/count` | `GET` | Count documents |

## Where `/api/v2` does not fit OpenAPI cleanly

### 1. Dynamic RPC endpoints

These routes resolve callable methods at runtime:

- `/api/v2/method/{method}`
- `/api/v2/method/{doctype}/{method}`
- `/api/v2/method/run_doc_method`

The actual callable target may come from:

- a whitelisted Python function
- a DocType controller module
- a server script override
- a whitelisted document method

OpenAPI works best when operations are known ahead of time. Here, the callable surface is partly data-driven and permission-driven, so a complete static spec would either:

- be incomplete
- become stale quickly
- require runtime generation after app loading and permission discovery

### 2. Runtime-derived schemas

The document endpoints are generic over `doctype`. That means request and response bodies depend on DocType metadata, not on fixed Python models.

Examples:

- `POST /document/{doctype}` accepts arbitrary fields for the selected DocType.
- `PATCH /document/{doctype}/{name}` accepts partial fields based on the selected DocType.
- `GET /document/{doctype}` returns records whose shape depends on query parameters such as `fields`, `filters`, `group_by`, and `as_dict`.

OpenAPI can describe this only loosely unless Frappe emits per-DocType schemas.

### 3. Permission-sensitive behavior

The same endpoint can vary by:

- user permissions
- field-level read permissions
- controller-level query customization
- whether the target method is whitelisted for the request method

OpenAPI can document auth requirements, but it cannot fully encode runtime permission pruning such as field-level filtering on document reads.

### 4. Response shape is only partly standardized

Handlers usually return a Python value that is later assigned to `frappe.response["data"]` in [__init__.py](/Users/netchampfaris/Projects/frappe-bench/apps/frappe/frappe/api/__init__.py). Some handlers also mutate side channels such as:

- `frappe.response["has_next_page"]`
- `frappe.response.docs`
- `frappe.response.http_status_code`

That makes the effective wire format broader than a simple handler return annotation would suggest.

## Practical OpenAPI interpretation

If the goal is to document `/api/v2`, the cleanest split is:

- Treat document CRUD and doctype metadata endpoints as the stable OpenAPI core.
- Treat dynamic `/method/*` endpoints as partially documented escape hatches.
- Use generic schemas such as `Document`, `DocumentPatch`, `BulkDeleteRequest`, and `BulkUpdateRequest` unless per-DocType schema generation exists.
- Document response envelope conventions explicitly instead of trying to infer them from type hints.

## Approximate OpenAPI sketch

This is not a complete spec. It is the subset that maps cleanly.

```yaml
openapi: 3.1.0
info:
  title: Frappe API v2
  version: draft

paths:
  /api/v2/document/{doctype}:
    get:
      summary: List documents
      parameters:
        - in: path
          name: doctype
          required: true
          schema:
            type: string
        - in: query
          name: fields
          schema:
            type: array
            items:
              type: string
        - in: query
          name: filters
          schema:
            oneOf:
              - type: object
              - type: array
        - in: query
          name: order_by
          schema:
            type: string
        - in: query
          name: start
          schema:
            type: integer
        - in: query
          name: limit
          schema:
            type: integer
        - in: query
          name: group_by
          schema:
            type: string
        - in: query
          name: as_dict
          schema:
            type: boolean
      responses:
        '200':
          description: Document list
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Document'
                  has_next_page:
                    type: boolean

    post:
      summary: Create document
      parameters:
        - in: path
          name: doctype
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/DocumentInput'
      responses:
        '200':
          description: Created document

  /api/v2/document/{doctype}/{name}/:
    get:
      summary: Read document
      parameters:
        - $ref: '#/components/parameters/Doctype'
        - $ref: '#/components/parameters/Name'
      responses:
        '200':
          description: Document

    patch:
      summary: Update document
      parameters:
        - $ref: '#/components/parameters/Doctype'
        - $ref: '#/components/parameters/Name'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/DocumentPatch'
      responses:
        '200':
          description: Updated document

    delete:
      summary: Delete document
      parameters:
        - $ref: '#/components/parameters/Doctype'
        - $ref: '#/components/parameters/Name'
      responses:
        '202':
          description: Accepted

  /api/v2/doctype/{doctype}/meta:
    get:
      summary: Get DocType metadata
      parameters:
        - $ref: '#/components/parameters/Doctype'
      responses:
        '200':
          description: DocType metadata

  /api/v2/doctype/{doctype}/count:
    get:
      summary: Count documents
      parameters:
        - $ref: '#/components/parameters/Doctype'
      responses:
        '200':
          description: Count
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: integer

components:
  parameters:
    Doctype:
      in: path
      name: doctype
      required: true
      schema:
        type: string
    Name:
      in: path
      name: name
      required: true
      schema:
        type: string

  schemas:
    Document:
      type: object
      additionalProperties: true

    DocumentInput:
      type: object
      additionalProperties: true

    DocumentPatch:
      type: object
      additionalProperties: true
```

## What a precise spec would require

To move from an approximate OpenAPI document to a precise one, `/api/v2` would need at least one of these approaches:

1. Generate schemas per DocType from metadata and expose them as OpenAPI components.
2. Enumerate whitelisted method endpoints into a generated path set.
3. Standardize request and response envelopes across all handlers.
4. Add explicit request body and response models for bulk and method endpoints.
5. Decide whether server-script-backed methods should appear in the published contract.

## Bottom line

`/api/v2` already has enough structure to support a useful OpenAPI document for the stable CRUD and metadata subset. It does not currently behave like a typical OpenAPI-first API framework because the most powerful parts of the surface are dynamic, metadata-driven, and permission-sensitive.