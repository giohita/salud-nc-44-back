# Documentación del Módulo de Usuarios

Este documento describe detalladamente el módulo de usuarios del sistema de salud, incluyendo todos los endpoints, validaciones, respuestas y ejemplos de uso.

## Información General del Módulo

### Descripción
El módulo de usuarios permite la gestión de tres tipos de usuarios en el sistema:
- **ADMIN**: Administradores del sistema
- **MEDIC**: Médicos y profesionales de la salud
- **PATIENT**: Pacientes del sistema

### Arquitectura
- **Controlador**: `UsersController` - Maneja las peticiones HTTP
- **Servicio**: `UsersService` - Contiene la lógica de negocio
- **DTO**: `CreateUserDto` - Validación de datos de entrada
- **Base de datos**: Prisma ORM con PostgreSQL

### Seguridad Implementada
- Autenticación JWT requerida para todos los endpoints
- Hash de contraseñas con bcrypt (salt rounds: 10)
- Validación de datos de entrada con class-validator
- Exclusión de datos sensibles en las respuestas

---

## Endpoints Implementados

### 1. Crear Usuario

**Endpoint**: `POST /admin/users`

**Descripción**: Permite a los administradores crear nuevos usuarios en el sistema.

**Autenticación**: 
- Requerida: JWT Token válido
- Solo administradores pueden acceder

**Headers**:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

#### Request Body

**Estructura base**:
```json
{
  "userType": "ADMIN" | "MEDIC" | "PATIENT",
  "DNI": "string",
  "Name": "string", 
  "Lastname": "string",
  "password": "string",
  "Email": "string (opcional)",
  "Phone_number": "string (opcional)"
}
```

**Campos específicos por tipo de usuario**:

##### Para ADMIN:
```json
{
  "userType": "ADMIN",
  "DNI": "string (7-12 caracteres, único)",
  "Name": "string (requerido)",
  "Lastname": "string (requerido)", 
  "Email": "string (opcional, formato email válido)",
  "password": "string (mínimo 8 caracteres)",
  "Phone_number": "string (opcional)"
}
```

##### Para MEDIC:
```json
{
  "userType": "MEDIC",
  "DNI": "string (7-12 caracteres, único)",
  "Name": "string (requerido)",
  "Lastname": "string (requerido)",
  "email": "string (opcional, formato email válido)",
  "password": "string (mínimo 8 caracteres)",
  "phone_number": "string (opcional)",
  "gender": "MALE" | "FEMALE" | "OTHER" (requerido)",
  "Birthdate": "string (formato ISO, requerido)",
  "specialty": "string (opcional)",
  "schedule": "string (opcional)"
}
```

##### Para PATIENT:
```json
{
  "userType": "PATIENT", 
  "DNI": "string (7-12 caracteres, único)",
  "Name": "string (requerido)",
  "Lastname": "string (requerido)",
  "email": "string (opcional, formato email válido)",
  "password": "string (mínimo 8 caracteres)",
  "phone_number": "string (opcional)",
  "gender": "MALE" | "FEMALE" | "OTHER" (requerido)",
  "Birthdate": "string (formato ISO, requerido)",
  "address": "string (opcional)"
}
```

#### Validaciones

| Campo | Validación | Descripción |
|-------|------------|-------------|
| `userType` | Enum | Debe ser "ADMIN", "MEDIC" o "PATIENT" |
| `DNI` | String, único | 7-12 caracteres, único en todo el sistema |
| `Name` | String, requerido | Nombre del usuario |
| `Lastname` | String, requerido | Apellido del usuario |
| `password` | String, min 8 | Mínimo 8 caracteres, se hashea con bcrypt |
| `Email/email` | Email válido | Formato de email válido si se proporciona |
| `gender` | Enum | Requerido para MEDIC y PATIENT |
| `Birthdate` | ISO Date | Requerido para MEDIC y PATIENT |

#### Respuestas

##### Éxito (201 Created)
```json
{
  "message": "Usuario creado exitosamente",
  "user": {
    "id": 1,
    "dni": "12345678",
    "userType": "ADMIN",
    "email": "admin@hospital.com",
    "name": "Juan",
    "lastname": "Pérez"
  }
}
```

**Nota**: El campo `passwordHash` nunca se incluye en la respuesta por seguridad.

##### Errores

**400 Bad Request - Datos inválidos**:
```json
{
  "statusCode": 400,
  "message": [
    "password must be longer than or equal to 8 characters",
    "Email must be an email"
  ],
  "error": "Bad Request"
}
```

**400 Bad Request - Campos requeridos faltantes**:
```json
{
  "statusCode": 400,
  "message": "Gender y Birthdate son requeridos para médicos",
  "error": "Bad Request"
}
```

**401 Unauthorized - Token inválido**:
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**409 Conflict - DNI duplicado**:
```json
{
  "statusCode": 409,
  "message": "Usuario con este DNI ya existe",
  "error": "Conflict"
}
```

**500 Internal Server Error**:
```json
{
  "statusCode": 500,
  "message": "Internal server error"
}
```

---

## Ejemplos de Uso

### Ejemplo 1: Crear Administrador

**Request**:
```bash
curl -X POST http://localhost:4000/admin/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "userType": "ADMIN",
    "DNI": "11223344",
    "Name": "Ana",
    "Lastname": "Martínez",
    "Email": "ana.martinez@hospital.com",
    "password": "AdminPass123",
    "Phone_number": "+57300123456"
  }'
```

**Response**:
```json
{
  "message": "Usuario creado exitosamente",
  "user": {
    "id": 4,
    "dni": "11223344", 
    "userType": "ADMIN",
    "email": "ana.martinez@hospital.com",
    "name": "Ana",
    "lastname": "Martínez"
  }
}
```

### Ejemplo 2: Crear Médico

**Request**:
```bash
curl -X POST http://localhost:4000/admin/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "userType": "MEDIC",
    "DNI": "55667788",
    "Name": "Dr. Carlos",
    "Lastname": "González",
    "email": "carlos.gonzalez@hospital.com",
    "password": "MedicPass123",
    "phone_number": "+57301234567",
    "gender": "MALE",
    "Birthdate": "1980-05-15T00:00:00.000Z",
    "specialty": "Cardiología",
    "schedule": "Lunes a Viernes 8:00-16:00"
  }'
```

**Response**:
```json
{
  "message": "Usuario creado exitosamente",
  "user": {
    "id": 4,
    "dni": "55667788",
    "userType": "MEDIC", 
    "email": "carlos.gonzalez@hospital.com",
    "name": "Dr. Carlos",
    "lastname": "González"
  }
}
```

### Ejemplo 3: Crear Paciente

**Request**:
```bash
curl -X POST http://localhost:4000/admin/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "userType": "PATIENT",
    "DNI": "99887766",
    "Name": "María",
    "Lastname": "López",
    "email": "maria.lopez@email.com",
    "password": "PatientPass123",
    "phone_number": "+57302345678",
    "gender": "FEMALE",
    "Birthdate": "1992-08-20T00:00:00.000Z",
    "address": "Calle 123 #45-67, Bogotá"
  }'
```

**Response**:
```json
{
  "message": "Usuario creado exitosamente",
  "user": {
    "id": 4,
    "dni": "99887766",
    "userType": "PATIENT",
    "email": "maria.lopez@email.com", 
    "name": "María",
    "lastname": "López"
  }
}
```

### Ejemplo 4: Error de validación

**Request con datos inválidos**:
```bash
curl -X POST http://localhost:4000/admin/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "userType": "MEDIC",
    "DNI": "123",
    "Name": "",
    "password": "123"
  }'
```

**Response**:
```json
{
  "statusCode": 400,
  "message": [
    "Name should not be empty",
    "Lastname should not be empty", 
    "password must be longer than or equal to 8 characters"
  ],
  "error": "Bad Request"
}
```

---

## Estructura de Base de Datos

### Tabla: admins
```sql
ID_Admins    SERIAL PRIMARY KEY
Name         VARCHAR NOT NULL
Lastname     VARCHAR NOT NULL  
Email        VARCHAR UNIQUE NOT NULL
passwordHash VARCHAR NOT NULL
createdAt    TIMESTAMP DEFAULT NOW()
updatedAt    TIMESTAMP DEFAULT NOW()
Phone_number VARCHAR
DNI          VARCHAR UNIQUE NOT NULL
```

### Tabla: medics
```sql
ID_medics     SERIAL PRIMARY KEY
DNI           VARCHAR UNIQUE NOT NULL
Name          VARCHAR NOT NULL
Lastname      VARCHAR NOT NULL
Birthdate     TIMESTAMP NOT NULL
gender        Gender NOT NULL
phone_number  VARCHAR
email         VARCHAR UNIQUE NOT NULL
passwordHash  VARCHAR NOT NULL
specialty     VARCHAR
schedule      VARCHAR
createdAt     TIMESTAMP DEFAULT NOW()
updatedAt     TIMESTAMP DEFAULT NOW()
create        INTEGER REFERENCES admins(ID_Admins)
```

### Tabla: patients
```sql
ID_Patients   SERIAL PRIMARY KEY
DNI           VARCHAR UNIQUE NOT NULL
Name          VARCHAR NOT NULL
Lastname      VARCHAR NOT NULL
Birthdate     TIMESTAMP NOT NULL
gender        Gender NOT NULL
phone_number  VARCHAR
email         VARCHAR UNIQUE NOT NULL
passwordHash  VARCHAR NOT NULL
address       VARCHAR
createdAt     TIMESTAMP DEFAULT NOW()
updatedAt     TIMESTAMP DEFAULT NOW()
create        INTEGER REFERENCES admins(ID_Admins)
```

### Enum: Gender
```sql
MALE | FEMALE | OTHER
```

---

## Flujo de Creación de Usuario

1. **Validación de autenticación**: Verificar JWT token válido
2. **Validación de datos**: Validar estructura y tipos de datos con class-validator
3. **Verificación de duplicados**: Comprobar que el DNI no exista en el sistema
4. **Hash de contraseña**: Encriptar la contraseña con bcrypt (salt rounds: 10)
5. **Creación en base de datos**: Insertar el usuario en la tabla correspondiente
6. **Respuesta**: Retornar datos del usuario (sin passwordHash)

---

## Consideraciones Técnicas

### Seguridad
- **Hash de contraseñas**: bcrypt con 10 salt rounds
- **Autenticación**: JWT requerido para todos los endpoints
- **Validación**: class-validator para validación automática
- **Datos sensibles**: passwordHash nunca se incluye en respuestas

### Relaciones de Base de Datos
- Los médicos y pacientes requieren un administrador que los cree (campo `create`)
- Se utiliza el primer administrador disponible si no se especifica uno

### Manejo de Errores
- Errores de validación (400): Datos incorrectos o faltantes
- Errores de conflicto (409): DNI duplicado
- Errores de autorización (401): Token inválido o faltante
- Errores internos (500): Problemas de base de datos o servidor

### Flexibilidad de Campos
El sistema maneja diferencias en nombres de campos entre tipos de usuario:
- `Email` vs `email`
- `Phone_number` vs `phone_number`

---

## Testing

### Credenciales de Prueba
Para testing, existe un administrador con las siguientes credenciales:
- **DNI**: `12345678`
- **Password**: `admin123`

### Obtener Token JWT
```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"dni":"12345678","password":"admin123"}'
```

### Usar Token en Requests
```bash
# Usar el access_token obtenido del login
curl -X POST http://localhost:4000/admin/users \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{ ... }'
```

---

## Notas de Implementación

### Campos Opcionales vs Requeridos
- **Siempre requeridos**: `userType`, `DNI`, `Name`, `Lastname`, `password`
- **Requeridos para MEDIC/PATIENT**: `gender`, `Birthdate`
- **Opcionales**: `Email/email`, `Phone_number/phone_number`, `specialty`, `schedule`, `address`

### Formato de Fechas
Las fechas deben enviarse en formato ISO 8601:
```
"Birthdate": "1990-07-22T00:00:00.000Z"
```

### Limitaciones Actuales
- Solo se puede crear usuarios, no hay endpoints para listar, actualizar o eliminar
- Los médicos y pacientes se asocian automáticamente al primer administrador disponible
- No hay validación de roles específicos más allá de requerir ser administrador