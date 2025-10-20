# Documentación de Endpoints de Usuarios

Este documento describe los endpoints de autenticación y administración de usuarios del backend.

## Autenticación

### 1) Login
- URL: POST /auth/login
- Autenticación: No
- Body (JSON):
  - dni: string
  - password: string
- Respuesta 200:
  - { "access_token": string }
- Cookie:
  - refresh_token (httpOnly) se establece en la ruta /auth/refresh.
- Errores:
  - 401: DNI o contraseña inválidos
  - 500: Error interno

### 2) Refresh Token
- URL: POST /auth/refresh
- Autenticación: Cookie httpOnly "refresh_token" (ruta /auth/refresh)
- Body: No (se toma de la cookie)
- Respuesta 200:
  - { "access_token": string }
- Comportamiento:
  - Rotación de refresh token: se actualiza la cookie con un nuevo refresh_token.
- Errores:
  - 401: No refresh token / inválido / expirado

### 3) Logout
- URL: POST /auth/logout
- Autenticación: Cookie httpOnly "refresh_token" (si existe)
- Body: No
- Respuesta 200:
  - { "ok": true }
- Efecto:
  - Borra los refresh tokens del usuario en BD y limpia la cookie.

### 4) Recuperación de contraseña (Forgot)
- URL: POST /auth/forgot
- Autenticación: No
- Body (JSON):
  - dni: string (longitud entre 7 y 12)
- Respuesta 200 (solo en desarrollo):
  - { "reset_token": string }
- Notas:
  - En producción, el token debe enviarse por email/SMS; no se devuelve en la respuesta.
  - Variables de entorno usadas:
    - JWT_RESET_SECRET (fallback a JWT_SECRET)
    - JWT_RESET_EXPIRES_IN (por defecto: 15m)

### 5) Restablecer contraseña (Reset)
- URL: POST /auth/reset
- Autenticación: No
- Body (JSON):
  - token: string (token de recuperación emitido por /auth/forgot)
  - newPassword: string (mínimo 8 caracteres)
- Respuesta 200:
  - { "message": "Contraseña actualizada correctamente" }
- Errores:
  - 401: Token inválido o expirado / usuario no encontrado

## Administración de usuarios (Admin)

### Crear usuario
- URL: POST /admin/users
- Autenticación: Requiere JWT de Admin en el header Authorization: Bearer <token>
- Body (JSON):
  - Campos admitidos según tipo: ADMIN, MEDIC, PATIENT
  - Ejemplos: DNI, Email/email, password, Name, Lastname, Phone_number/phone_number, gender, etc.
- Respuesta 201:
  - { id: number, ...datos }

### Listar usuarios
- URL: GET /admin/users
- Autenticación: JWT de Admin
- Respuesta 200:
  - { admins: Admin[], medics: Medic[], patients: Patient[] }

### Obtener usuario
- URL: GET /admin/users/:type/:id
- Autenticación: JWT de Admin
- Params:
  - type: ADMIN | MEDIC | PATIENT
  - id: number
- Respuesta 200:
  - Objeto del usuario

### Actualizar usuario
- URL: PUT /admin/users/:type/:id
- Autenticación: JWT de Admin
- Body: Campos actualizables según tipo
- Respuesta 200:
  - Objeto actualizado

### Eliminar usuario
- URL: DELETE /admin/users/:type/:id
- Autenticación: JWT de Admin
- Respuesta 200:
  - { ok: true }

## Ejemplos cURL

Login:
```
curl -X POST http://localhost:4000/auth/login \
 -H "Content-Type: application/json" \
 -d '{"dni":"12345678","password":"TuPass"}'
```

Forgot:
```
curl -X POST http://localhost:4000/auth/forgot \
 -H "Content-Type: application/json" \
 -d '{"dni":"12345678"}'
```

Reset:
```
curl -X POST http://localhost:4000/auth/reset \
 -H "Content-Type: application/json" \
 -d '{"token":"<reset_token>","newPassword":"NuevaPass123"}'
```

## Consideraciones de seguridad
- Usar httpOnly cookies para refresh tokens y SameSite=strict en producción.
- No retornar el reset_token en producción; enviar por email/SMS.
- Limitar los intentos de recuperación y aplicar rate limiting.
- Configurar JWT_* correctamente: JWT_SECRET, JWT_REFRESH_SECRET, JWT_ACCESS_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN.