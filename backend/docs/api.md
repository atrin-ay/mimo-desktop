# MIMO Backend — API Documentation (Phase 1)

Base URL: `/api`

Endpoints:

- POST `/api/session`
  - Create a new session.
  - Body: `{ "id"?: "<uuid>" }`
  - Response: `201` `{ "data": { "id": "...", "createdAt": "..." } }`

- GET `/api/session/:id`
  - Get a session and its messages.
  - Response: `200` `{ "data": { "session": { ... }, "messages": [ ... ] } }`

- DELETE `/api/session/:id`
  - Delete a session (and its messages).
  - Response: `204` (no body)

- POST `/api/chat`
  - Send a message in a session and receive an assistant reply.
  - Body: `{ "sessionId": "<uuid>", "message": "..." }`
  - Response: `200` `{ "data": { "sessionId": "...", "message": { "id": "..", "sessionId": "..", "role": "assistant", "content": "...", "createdAt": "..." } } }`

- GET `/health`
  - Simple health check endpoint.
  - Response: `200` `{ "status": "ok" }`

Errors
- Standardized error envelope: `{ "error": { "code": "...", "message": "...", "details"?: ... } }`

Notes
- All request bodies are validated with Zod. Use UUID v4 for session ids.
- Currently the backend uses a `mock` AI provider that echoes the last user message.
