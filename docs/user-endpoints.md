# Documentación de Endpoints de Usuarios

Esta documentación detalla todos los endpoints relacionados con la gestión de usuarios en el sistema de Portal Web de Coordinación de Citas y Teleasistencia.

## Índice
1. [Autenticación](#autenticación)
2. [Administración de Usuarios](#administración-de-usuarios)

---

## Autenticación

### Login
Permite a los usuarios iniciar sesión en el sistema.

- **URL**: `/auth/login`
- **Método**: `POST`
- **Autenticación requerida**: No
- **Permisos requeridos**: Ninguno

**Cuerpo de la solicitud**:
```json
{
  "dni": "12345678",
  "password": "contraseña"
}
```

**Respuesta exitosa**:
- **Código**: 200 OK
- **Contenido**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
- **Cookies**: Se establece una cookie HTTP-only con el refresh token

**Respuestas de error**:
- **Código**: 401 Unauthorized
- **Contenido**:
```json
{
  "statusCode": 401,
  "message": "Credenciales inválidas",
  "error": "Unauthorized"
}
```

### Refresh Token
Permite renovar el token de acceso utilizando el refresh token.

- **URL**: `/auth/refresh`
- **Método**: `POST`
- **Autenticación requerida**: Sí (refresh token en cookie)
- **Permisos requeridos**: Ninguno

**Respuesta exitosa**:
- **Código**: 200 OK
- **Contenido**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
- **Cookies**: Se actualiza la cookie HTTP-only con el nuevo refresh token

**Respuestas de error**:
- **Código**: 401 Unauthorized
- **Contenido**:
```json
{
  "statusCode": 401,
  "message": "Refresh token inválido o expirado",
  "error": "Unauthorized"
}
```

### Logout
Permite a los usuarios cerrar sesión en el sistema.

- **URL**: `/auth/logout`
- **Método**: `POST`
- **Autenticación requerida**: Sí (access token)
- **Permisos requeridos**: Ninguno

**Respuesta exitosa**:
- **Código**: 200 OK
- **Contenido**:
```json
{
  "message": "Sesión cerrada correctamente"
}
```
- **Cookies**: Se elimina la cookie de refresh token

---

## Administración de Usuarios

### Crear Usuario
Permite a los administradores crear nuevos usuarios (administradores, médicos o pacientes).

- **URL**: `/admin/users`
- **Método**: `POST`
- **Autenticación requerida**: Sí (access token)
- **Permisos requeridos**: ADMIN

**Cuerpo de la solicitud**:
```json
{
  "DNI": "87654321",
  "Email": "usuario@example.com",
  "password": "Contraseña123!",
  "Name": "Nombre",
  "Lastname": "Apellido",
  "Phone_number": "987654321",
  "userType": "MEDIC", // Puede ser: ADMIN, MEDIC, PATIENT
  "gender": "MALE" // Requerido para MEDIC y PATIENT. Puede ser: MALE, FEMALE, OTHER
}
```

**Respuesta exitosa**:
- **Código**: 201 Created
- **Contenido**:
```json
{
  "id": 2,
  "name": "Nombre",
  "lastname": "Apellido",
  "email": "usuario@example.com",
  "dni": "87654321",
  "phone_number": "987654321",
  "userType": "MEDIC",
  "createdAt": "2025-10-17T21:52:55.528Z",
  "updatedAt": "2025-10-17T21:52:55.528Z"
}
```

**Respuestas de error**:
- **Código**: 400 Bad Request (datos inválidos)
- **Código**: 401 Unauthorized (no autenticado)
- **Código**: 403 Forbidden (no tiene permisos)
- **Código**: 409 Conflict (DNI o Email ya existen)

### Listar Usuarios
Permite a los administradores obtener una lista paginada de usuarios.

- **URL**: `/admin/users`
- **Método**: `GET`
- **Autenticación requerida**: Sí (access token)
- **Permisos requeridos**: ADMIN

**Parámetros de consulta**:
- `page` (opcional): Número de página (por defecto: 1)
- `limit` (opcional): Número de elementos por página (por defecto: 10)
- `userType` (opcional): Filtrar por tipo de usuario (ADMIN, MEDIC, PATIENT)

**Respuesta exitosa**:
- **Código**: 200 OK
- **Contenido**:
```json
{
  "data": [
    {
      "id": 1,
      "name": "Admin",
      "lastname": "Sistema",
      "email": "admin@example.com",
      "dni": "12345678",
      "phone_number": "123456789",
      "userType": "ADMIN",
      "createdAt": "2025-10-17T00:00:00.000Z",
      "updatedAt": "2025-10-17T00:00:00.000Z"
    },
    // Más usuarios...
  ],
  "meta": {
    "total": 25,
    "page": 1,
    "limit": 10
  }
}
```

### Obtener Usuario
Permite a los administradores obtener los detalles de un usuario específico.

- **URL**: `/admin/users/:id`
- **Método**: `GET`
- **Autenticación requerida**: Sí (access token)
- **Permisos requeridos**: ADMIN

**Parámetros de ruta**:
- `id`: ID del usuario

**Respuesta exitosa**:
- **Código**: 200 OK
- **Contenido**:
```json
{
  "id": 2,
  "name": "Doctor",
  "lastname": "Ejemplo",
  "email": "medico@example.com",
  "dni": "87654321",
  "phone_number": "987654321",
  "userType": "MEDIC",
  "createdAt": "2025-10-17T21:52:55.528Z",
  "updatedAt": "2025-10-17T21:52:55.528Z"
}
```

**Respuestas de error**:
- **Código**: 401 Unauthorized (no autenticado)
- **Código**: 403 Forbidden (no tiene permisos)
- **Código**: 404 Not Found (usuario no encontrado)

### Actualizar Usuario
Permite a los administradores actualizar los datos de un usuario existente.

- **URL**: `/admin/users/:id`
- **Método**: `PATCH`
- **Autenticación requerida**: Sí (access token)
- **Permisos requeridos**: ADMIN

**Parámetros de ruta**:
- `id`: ID del usuario

**Cuerpo de la solicitud** (todos los campos son opcionales):
```json
{
  "Name": "Nuevo Nombre",
  "Lastname": "Nuevo Apellido",
  "Email": "nuevo@example.com",
  "Phone_number": "999999999",
  "password": "NuevaContraseña123!"
}
```

**Respuesta exitosa**:
- **Código**: 200 OK
- **Contenido**:
```json
{
  "id": 2,
  "name": "Nuevo Nombre",
  "lastname": "Nuevo Apellido",
  "email": "nuevo@example.com",
  "dni": "87654321",
  "phone_number": "999999999",
  "userType": "MEDIC",
  "createdAt": "2025-10-17T21:52:55.528Z",
  "updatedAt": "2025-10-17T22:00:00.000Z"
}
```

**Respuestas de error**:
- **Código**: 400 Bad Request (datos inválidos)
- **Código**: 401 Unauthorized (no autenticado)
- **Código**: 403 Forbidden (no tiene permisos)
- **Código**: 404 Not Found (usuario no encontrado)
- **Código**: 409 Conflict (Email ya existe)

### Eliminar Usuario
Permite a los administradores eliminar un usuario del sistema.

- **URL**: `/admin/users/:id`
- **Método**: `DELETE`
- **Autenticación requerida**: Sí (access token)
- **Permisos requeridos**: ADMIN

**Parámetros de ruta**:
- `id`: ID del usuario

**Respuesta exitosa**:
- **Código**: 200 OK
- **Contenido**:
```json
{
  "message": "Usuario eliminado correctamente"
}
```

**Respuestas de error**:
- **Código**: 401 Unauthorized (no autenticado)
- **Código**: 403 Forbidden (no tiene permisos)
- **Código**: 404 Not Found (usuario no encontrado)

## Consideraciones de Seguridad

1. **Autenticación**: Todos los endpoints de administración requieren un token JWT válido.
2. **Autorización**: Solo los usuarios con rol ADMIN pueden acceder a los endpoints de administración.
3. **Validación de datos**: Todos los datos de entrada son validados antes de procesarse.
4. **Protección de contraseñas**: Las contraseñas se almacenan hasheadas utilizando bcrypt.
5. **Refresh Tokens**: Se utilizan refresh tokens para mantener la sesión del usuario de forma segura.

## Códigos de Estado HTTP

- **200 OK**: La solicitud se ha completado correctamente.
- **201 Created**: El recurso se ha creado correctamente.
- **400 Bad Request**: La solicitud contiene datos inválidos o falta información requerida.
- **401 Unauthorized**: No se ha proporcionado autenticación o es inválida.
- **403 Forbidden**: El usuario no tiene permisos para acceder al recurso.
- **404 Not Found**: El recurso solicitado no existe.
- **409 Conflict**: La solicitud no puede completarse debido a un conflicto con el estado actual del recurso.
- **500 Internal Server Error**: Error interno del servidor.