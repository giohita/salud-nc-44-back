# Documentación del Panel Administrativo

## Índice
1. [Introducción](#introducción)
2. [Autenticación](#autenticación)
3. [Endpoints](#endpoints)
   - [Crear Usuario](#crear-usuario)
   - [Listar Usuarios](#listar-usuarios)
   - [Obtener Usuario por ID](#obtener-usuario-por-id)
   - [Actualizar Usuario](#actualizar-usuario)
   - [Eliminar Usuario](#eliminar-usuario)
   - [Exportar Estadísticas](#exportar-estadísticas)
4. [Instrucciones para Pruebas Manuales](#instrucciones-para-pruebas-manuales)

## Introducción

El panel administrativo proporciona una API RESTful para la gestión de usuarios (administradores, médicos y pacientes) y la generación de estadísticas. Todos los endpoints están protegidos por el `AdminRoleGuard` que verifica que el usuario tenga el rol de administrador.

## Autenticación

Todos los endpoints requieren un token JWT válido con el rol de administrador. El token debe enviarse en el encabezado `Authorization` con el formato `Bearer {token}`.

## Endpoints

### Crear Usuario

Crea un nuevo usuario en el sistema (administrador, médico o paciente).

- **URL**: `/admin/users`
- **Método**: `POST`
- **Autenticación**: Requerida (AdminRoleGuard)
- **Parámetros de entrada**:

```json
{
  "email": "usuario@ejemplo.com",
  "password": "Contraseña123!",
  "name": "Nombre Completo",
  "dni": "12345678A",
  "userType": "ADMIN | MEDIC | PATIENT",
  "specialization": "Cardiología",  // Solo para médicos
  "bloodType": "A+",               // Solo para pacientes
  "allergies": "Ninguna"           // Solo para pacientes
}
```

- **Respuesta exitosa**:
  - **Código**: 201 Created
  - **Contenido**:

```json
{
  "id": "uuid-generado",
  "email": "usuario@ejemplo.com",
  "name": "Nombre Completo",
  "dni": "12345678A",
  "userType": "ADMIN | MEDIC | PATIENT",
  "specialization": "Cardiología",  // Solo para médicos
  "bloodType": "A+",               // Solo para pacientes
  "allergies": "Ninguna",          // Solo para pacientes
  "createdAt": "2023-06-01T12:00:00Z",
  "updatedAt": "2023-06-01T12:00:00Z"
}
```

- **Respuestas de error**:
  - **Código**: 400 Bad Request - Datos de entrada inválidos
  - **Código**: 409 Conflict - Email o DNI ya existen
  - **Código**: 401 Unauthorized - No autenticado
  - **Código**: 403 Forbidden - No autorizado (no es administrador)

- **Ejemplo de uso con curl**:

```bash
curl -X POST http://localhost:3000/admin/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "email": "doctor@ejemplo.com",
    "password": "Contraseña123!",
    "name": "Dr. Juan Pérez",
    "dni": "12345678A",
    "userType": "MEDIC",
    "specialization": "Cardiología"
  }'
```

### Listar Usuarios

Obtiene una lista paginada de usuarios, con opción de filtrar por tipo.

- **URL**: `/admin/users`
- **Método**: `GET`
- **Autenticación**: Requerida (AdminRoleGuard)
- **Parámetros de consulta**:
  - `page` (opcional): Número de página (por defecto: 1)
  - `limit` (opcional): Número de elementos por página (por defecto: 10)
  - `userType` (opcional): Tipo de usuario a filtrar (ADMIN, MEDIC, PATIENT)

- **Respuesta exitosa**:
  - **Código**: 200 OK
  - **Contenido**:

```json
{
  "users": [
    {
      "id": "uuid-1",
      "email": "admin@ejemplo.com",
      "name": "Admin Principal",
      "dni": "12345678A",
      "userType": "ADMIN",
      "createdAt": "2023-06-01T12:00:00Z",
      "updatedAt": "2023-06-01T12:00:00Z"
    },
    {
      "id": "uuid-2",
      "email": "doctor@ejemplo.com",
      "name": "Dr. Juan Pérez",
      "dni": "87654321B",
      "userType": "MEDIC",
      "specialization": "Cardiología",
      "createdAt": "2023-06-01T12:00:00Z",
      "updatedAt": "2023-06-01T12:00:00Z"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 10,
  "totalPages": 5
}
```

- **Respuestas de error**:
  - **Código**: 400 Bad Request - Parámetros de consulta inválidos
  - **Código**: 401 Unauthorized - No autenticado
  - **Código**: 403 Forbidden - No autorizado (no es administrador)

- **Ejemplo de uso con curl**:

```bash
curl -X GET "http://localhost:3000/admin/users?page=1&limit=10&userType=MEDIC" \
  -H "Authorization: Bearer {token}"
```

### Obtener Usuario por ID

Obtiene los detalles de un usuario específico por su ID.

- **URL**: `/admin/users/:id`
- **Método**: `GET`
- **Autenticación**: Requerida (AdminRoleGuard)
- **Parámetros de ruta**:
  - `id`: ID del usuario a obtener

- **Respuesta exitosa**:
  - **Código**: 200 OK
  - **Contenido**:

```json
{
  "id": "uuid-generado",
  "email": "usuario@ejemplo.com",
  "name": "Nombre Completo",
  "dni": "12345678A",
  "userType": "ADMIN | MEDIC | PATIENT",
  "specialization": "Cardiología",  // Solo para médicos
  "bloodType": "A+",               // Solo para pacientes
  "allergies": "Ninguna",          // Solo para pacientes
  "createdAt": "2023-06-01T12:00:00Z",
  "updatedAt": "2023-06-01T12:00:00Z"
}
```

- **Respuestas de error**:
  - **Código**: 404 Not Found - Usuario no encontrado
  - **Código**: 401 Unauthorized - No autenticado
  - **Código**: 403 Forbidden - No autorizado (no es administrador)

- **Ejemplo de uso con curl**:

```bash
curl -X GET http://localhost:3000/admin/users/uuid-generado \
  -H "Authorization: Bearer {token}"
```

### Actualizar Usuario

Actualiza los datos de un usuario existente.

- **URL**: `/admin/users/:id`
- **Método**: `PATCH`
- **Autenticación**: Requerida (AdminRoleGuard)
- **Parámetros de ruta**:
  - `id`: ID del usuario a actualizar
- **Parámetros de entrada**:

```json
{
  "email": "nuevo-email@ejemplo.com",
  "password": "NuevaContraseña123!",
  "name": "Nuevo Nombre",
  "specialization": "Nueva Especialidad",  // Solo para médicos
  "bloodType": "B+",                      // Solo para pacientes
  "allergies": "Actualizado"              // Solo para pacientes
}
```

- **Respuesta exitosa**:
  - **Código**: 200 OK
  - **Contenido**:

```json
{
  "id": "uuid-generado",
  "email": "nuevo-email@ejemplo.com",
  "name": "Nuevo Nombre",
  "dni": "12345678A",
  "userType": "ADMIN | MEDIC | PATIENT",
  "specialization": "Nueva Especialidad",  // Solo para médicos
  "bloodType": "B+",                      // Solo para pacientes
  "allergies": "Actualizado",             // Solo para pacientes
  "createdAt": "2023-06-01T12:00:00Z",
  "updatedAt": "2023-06-02T12:00:00Z"
}
```

- **Respuestas de error**:
  - **Código**: 400 Bad Request - Datos de entrada inválidos
  - **Código**: 404 Not Found - Usuario no encontrado
  - **Código**: 409 Conflict - Email ya existe
  - **Código**: 401 Unauthorized - No autenticado
  - **Código**: 403 Forbidden - No autorizado (no es administrador)

- **Ejemplo de uso con curl**:

```bash
curl -X PATCH http://localhost:3000/admin/users/uuid-generado \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "name": "Dr. Juan Pérez Actualizado",
    "specialization": "Neurología"
  }'
```

### Eliminar Usuario

Elimina un usuario del sistema.

- **URL**: `/admin/users/:id`
- **Método**: `DELETE`
- **Autenticación**: Requerida (AdminRoleGuard)
- **Parámetros de ruta**:
  - `id`: ID del usuario a eliminar

- **Respuesta exitosa**:
  - **Código**: 200 OK
  - **Contenido**:

```json
{
  "id": "uuid-eliminado",
  "email": "usuario@ejemplo.com",
  "name": "Nombre Completo",
  "message": "Usuario eliminado correctamente"
}
```

- **Respuestas de error**:
  - **Código**: 404 Not Found - Usuario no encontrado
  - **Código**: 400 Bad Request - No se puede eliminar el último administrador
  - **Código**: 400 Bad Request - No se puede eliminar un médico con citas pendientes
  - **Código**: 400 Bad Request - No se puede eliminar un paciente con citas pendientes
  - **Código**: 401 Unauthorized - No autenticado
  - **Código**: 403 Forbidden - No autorizado (no es administrador)

- **Ejemplo de uso con curl**:

```bash
curl -X DELETE http://localhost:3000/admin/users/uuid-generado \
  -H "Authorization: Bearer {token}"
```

### Exportar Estadísticas

Genera y exporta estadísticas en diferentes formatos.

- **URL**: `/admin/stats/export`
- **Método**: `GET`
- **Autenticación**: Requerida (AdminRoleGuard)
- **Parámetros de consulta**:
  - `format` (obligatorio): Formato de exportación (csv, excel, json)
  - `startDate` (obligatorio): Fecha de inicio (YYYY-MM-DD)
  - `endDate` (obligatorio): Fecha de fin (YYYY-MM-DD)
  - `type` (opcional): Tipo de estadísticas (appointments, users, clinical) (por defecto: appointments)

- **Respuesta exitosa**:
  - **Código**: 200 OK
  - **Contenido**: Archivo en el formato solicitado con las estadísticas
  - **Headers**:
    - `Content-Type`: Según el formato (text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/json)
    - `Content-Disposition`: attachment; filename=stats-YYYY-MM-DD.{ext}

- **Respuestas de error**:
  - **Código**: 400 Bad Request - Parámetros de consulta inválidos
  - **Código**: 401 Unauthorized - No autenticado
  - **Código**: 403 Forbidden - No autorizado (no es administrador)

- **Ejemplo de uso con curl**:

```bash
curl -X GET "http://localhost:3000/admin/stats/export?format=csv&startDate=2023-01-01&endDate=2023-06-30&type=appointments" \
  -H "Authorization: Bearer {token}" \
  --output estadisticas.csv
```

## Instrucciones para Pruebas Manuales

### Requisitos Previos

1. Asegúrate de tener el servidor backend en ejecución:
   ```bash
   npm run start:dev
   ```

2. Obtén un token JWT válido con rol de administrador:
   - Inicia sesión con un usuario administrador usando el endpoint de autenticación
   - Guarda el token JWT devuelto

### Prueba 1: Crear un Nuevo Médico

1. Ejecuta el siguiente comando curl (reemplaza `{token}` con tu token JWT):
   ```bash
   curl -X POST http://localhost:3000/admin/users \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer {token}" \
     -d '{
       "email": "doctor.prueba@ejemplo.com",
       "password": "Contraseña123!",
       "name": "Dr. Prueba",
       "dni": "12345678Z",
       "userType": "MEDIC",
       "specialization": "Pediatría"
     }'
   ```

2. Verifica que la respuesta tenga un código 201 y contenga los datos del médico creado.

### Prueba 2: Listar Usuarios Filtrados por Tipo

1. Ejecuta el siguiente comando curl para listar solo médicos:
   ```bash
   curl -X GET "http://localhost:3000/admin/users?userType=MEDIC" \
     -H "Authorization: Bearer {token}"
   ```

2. Verifica que la respuesta tenga un código 200 y muestre una lista de médicos.

### Prueba 3: Obtener un Usuario por ID

1. Usa el ID obtenido en la Prueba 1 o de la lista de usuarios:
   ```bash
   curl -X GET http://localhost:3000/admin/users/{id-obtenido} \
     -H "Authorization: Bearer {token}"
   ```

2. Verifica que la respuesta tenga un código 200 y muestre los detalles del usuario.

### Prueba 4: Actualizar un Usuario

1. Usa el ID obtenido en la Prueba 1 o de la lista de usuarios:
   ```bash
   curl -X PATCH http://localhost:3000/admin/users/{id-obtenido} \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer {token}" \
     -d '{
       "name": "Dr. Prueba Actualizado",
       "specialization": "Cirugía"
     }'
   ```

2. Verifica que la respuesta tenga un código 200 y muestre los datos actualizados.

### Prueba 5: Exportar Estadísticas

1. Ejecuta el siguiente comando curl para exportar estadísticas de citas en formato CSV:
   ```bash
   curl -X GET "http://localhost:3000/admin/stats/export?format=csv&startDate=2023-01-01&endDate=2023-12-31&type=appointments" \
     -H "Authorization: Bearer {token}" \
     --output estadisticas-citas.csv
   ```

2. Verifica que se descargue el archivo CSV y que contenga datos de estadísticas.

### Prueba 6: Eliminar un Usuario

1. Usa el ID obtenido en la Prueba 1 o de la lista de usuarios:
   ```bash
   curl -X DELETE http://localhost:3000/admin/users/{id-obtenido} \
     -H "Authorization: Bearer {token}"
   ```

2. Verifica que la respuesta tenga un código 200 y confirme la eliminación.

3. Intenta obtener el usuario eliminado para confirmar que ya no existe:
   ```bash
   curl -X GET http://localhost:3000/admin/users/{id-eliminado} \
     -H "Authorization: Bearer {token}"
   ```

4. Verifica que la respuesta tenga un código 404 (Not Found).

### Notas Adicionales para Pruebas

- Para probar los casos de error, intenta:
  - Crear un usuario con un email o DNI que ya existe
  - Actualizar un usuario con un email que ya existe
  - Eliminar el último administrador del sistema
  - Proporcionar fechas inválidas al exportar estadísticas
  - Acceder a los endpoints sin un token JWT válido o con un usuario que no sea administrador