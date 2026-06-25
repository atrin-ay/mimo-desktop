# Frontend Integration — Phase 1

This document explains how to connect a frontend to the MIMO backend.

Base URL: `/api`

Create session:

```http
POST /api/session
Content-Type: application/json

{ "id"?: "<uuid>" }
```

Send message:

```http
POST /api/chat
Content-Type: application/json

{
  "sessionId": "<uuid>",
  "message": "Hello"
}
```

Receive response:
- The response body contains the assistant message and metadata.
- The frontend should append the user's message and the assistant message to the local chat UI.

Retrieve session history:

```http
GET /api/session/:id
```

Delete session:

```http
DELETE /api/session/:id
```

CORS:
- The backend reads `CORS_ORIGIN` from the environment. For local development include your frontend origin(s).
