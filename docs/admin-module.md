# Módulo de Administración (Admin)

Este módulo implementa la funcionalidad administrativa del sistema de salud, proporcionando endpoints para la gestión completa de usuarios (administradores, médicos y pacientes) y generación de estadísticas del sistema.

## Arquitectura del Módulo

### Estructura de Archivos
```
admin/
├── dto/
│   ├── create-user.dto.ts
│   ├── update-user.dto.ts
│   └── user-response.dto.ts
├── guards/
│   └── admin-role.guard.ts
├── admin.controller.ts
├── admin.service.ts
├── admin.module.ts
└── stats.service.ts
```

## Funcionalidades Principales

### 1. Gestión de Usuarios
El módulo permite la administración completa de todos los tipos de usuarios del sistema.

### 2. Generación de Estadísticas
Proporciona herramientas para exportar datos del sistema en múltiples formatos.

## Endpoints Implementados

### Gestión de Usuarios

#### 1. Crear Usuario
- **Endpoint:** `POST /admin/users`
- **Descripción:** Crea un nuevo usuario (administrador, médico o paciente)
- **Autenticación:** Requiere token JWT de administrador
- **Payload Requerido:**
  ```json
  {
    "Name": "Juan",
    "Lastname": "Pérez",
    "DNI": "12345678",
    "Email": "juan@example.com",
    "password": "password123",
    "Phone_number": "555-1234",
    "gender": "MALE",
    "userType": "PATIENT"
  }
  ```

#### 2. Listar Usuarios
- **Endpoint:** `GET /admin/users`
- **Descripción:** Lista usuarios con paginación y filtros
- **Parámetros de Query:**
  - `page` (opcional): Número de página (default: 1)
  - `limit` (opcional): Elementos por página (default: 10)
  - `userType` (opcional): Filtrar por tipo de usuario (ADMIN, MEDIC, PATIENT)
- **Ejemplo:** `GET /admin/users?page=1&limit=10&userType=MEDIC`

#### 3. Obtener Usuario por ID
- **Endpoint:** `GET /admin/users/:id`
- **Descripción:** Recupera un usuario específico por su ID
- **Parámetros:** 
  - `id` (número): ID único del usuario

#### 4. Actualizar Usuario
- **Endpoint:** `PUT /admin/users/:id`
- **Descripción:** Actualiza un usuario existente
- **Parámetros:** 
  - `id` (número): ID único del usuario
- **Payload:** Campos opcionales para actualizar

#### 5. Eliminar Usuario
- **Endpoint:** `DELETE /admin/users/:id`
- **Descripción:** Elimina un usuario del sistema
- **Parámetros:** 
  - `id` (string): ID del usuario a eliminar

### Estadísticas y Reportes

#### 6. Exportar Estadísticas
- **Endpoint:** `GET /admin/stats/export`
- **Descripción:** Genera y exporta estadísticas del sistema
- **Parámetros de Query:**
  - `format` (opcional): Formato de exportación (csv, excel, json) - default: csv
  - `startDate` (opcional): Fecha de inicio para el rango de datos
  - `endDate` (opcional): Fecha de fin para el rango de datos
  - `type` (opcional): Tipo de estadísticas (appointments, users, clinical) - default: appointments

## Seguridad y Autenticación

### Guard de Administrador
El módulo implementa un guard personalizado (`AdminRoleGuard`) que:
- Verifica la presencia de un token JWT válido
- Valida que el usuario sea de tipo ADMIN
- Protege todos los endpoints del módulo
- Proporciona mensajes de error descriptivos

### Validaciones de Seguridad
1. **Autenticación JWT:** Todos los endpoints requieren token válido
2. **Autorización por rol:** Solo administradores pueden acceder
3. **Validación de datos:** DTOs con validaciones estrictas
4. **Hash de contraseñas:** Uso de bcryptjs con salt rounds de 10

## Modelo de Datos

### DTO de Creación de Usuario
```typescript
{
  Name: string;              // Nombre (requerido)
  Lastname: string;          // Apellido (requerido)
  DNI: string;              // Documento de identidad (requerido, único)
  Email: string;            // Email (requerido, único, formato válido)
  password: string;         // Contraseña (requerido, mínimo 8 caracteres)
  Phone_number?: string;    // Teléfono (opcional)
  gender?: Gender;          // Género (requerido para MEDIC y PATIENT, opcional para ADMIN)
  userType: 'ADMIN' | 'MEDIC' | 'PATIENT';  // Tipo de usuario (requerido)
}
```

### Validaciones Implementadas
- **Email:** Formato válido y único en el sistema
- **DNI:** Único en el sistema
- **Contraseña:** Mínimo 8 caracteres
- **Género:** Requerido para médicos y pacientes, no se incluye para administradores
- **Tipo de usuario:** Debe ser uno de los valores permitidos

## Servicios

### AdminService
Maneja toda la lógica de negocio para la gestión de usuarios:
- Creación de usuarios con validaciones
- Listado con paginación y filtros
- Actualización de datos de usuario
- Eliminación segura de usuarios
- Mapeo de respuestas unificadas

### StatsService
Proporciona funcionalidades de generación de reportes:
- **Estadísticas de citas:** Datos de appointments por rango de fechas
- **Estadísticas de usuarios:** Conteos y distribución por tipo
- **Estadísticas clínicas:** Datos de historias clínicas
- **Múltiples formatos:** CSV, Excel, JSON

## Casos de Uso

### Crear Administrador
```bash
POST /admin/users
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "Name": "Admin",
  "Lastname": "Sistema",
  "DNI": "87654321",
  "Email": "admin2@hospital.com",
  "password": "admin123456",
  "userType": "ADMIN"
}
```

### Crear Médico
```bash
POST /admin/users
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "Name": "Dr. María",
  "Lastname": "González",
  "DNI": "11223344",
  "Email": "maria@hospital.com",
  "password": "medico123456",
  "Phone_number": "555-9876",
  "gender": "FEMALE",
  "userType": "MEDIC"
}
```

### Listar Médicos con Paginación
```bash
GET /admin/users?page=1&limit=5&userType=MEDIC
Authorization: Bearer <jwt_token>
```

### Exportar Estadísticas de Citas en Excel
```bash
GET /admin/stats/export?format=excel&type=appointments&startDate=2025-01-01&endDate=2025-01-31
Authorization: Bearer <jwt_token>
```

## Manejo de Errores

### Errores Comunes
- **401 Unauthorized:** Token JWT inválido o faltante
- **403 Forbidden:** Usuario no es administrador
- **409 Conflict:** Email o DNI ya existe
- **400 Bad Request:** Datos de entrada inválidos
- **404 Not Found:** Usuario no encontrado

### Respuestas de Error
```json
{
  "statusCode": 409,
  "message": "El email juan@example.com ya está registrado",
  "error": "Conflict"
}
```

## Integración con el Sistema

### Dependencias
- **PrismaModule:** Para acceso a la base de datos
- **JwtModule:** Para autenticación y autorización
- **ConfigModule:** Para configuración de JWT
- **bcryptjs:** Para hash de contraseñas
- **ExcelJS:** Para generación de archivos Excel
- **csv-writer:** Para generación de archivos CSV

### Exportaciones
- **AdminService:** Disponible para otros módulos
- **StatsService:** Disponible para generación de reportes

## Características Avanzadas

### Paginación Inteligente
- Soporte para paginación en listados
- Metadatos de paginación en respuestas
- Filtros por tipo de usuario

### Generación de Reportes
- **Formatos múltiples:** CSV, Excel, JSON
- **Filtros por fecha:** Rangos personalizables
- **Tipos de datos:** Citas, usuarios, historias clínicas
- **Descarga directa:** Archivos listos para descargar

### Mapeo Unificado
- Respuestas consistentes independiente del tipo de usuario
- Exclusión automática de datos sensibles (passwordHash)
- Formato estandarizado para todos los endpoints

## Seguridad Implementada

1. **Autenticación JWT:** Verificación de tokens en todos los endpoints
2. **Autorización por rol:** Solo administradores pueden acceder
3. **Validación de entrada:** DTOs con validaciones estrictas
4. **Hash de contraseñas:** bcryptjs con salt rounds seguros
5. **Verificación de unicidad:** Email y DNI únicos en el sistema
6. **Manejo seguro de errores:** Sin exposición de información sensible

## Extensibilidad

El módulo está diseñado para ser fácilmente extensible:
- **Nuevos tipos de usuario:** Fácil adición de roles
- **Reportes adicionales:** Nuevos tipos de estadísticas
- **Formatos de exportación:** Soporte para más formatos
- **Filtros avanzados:** Búsquedas más complejas
- **Auditoría:** Registro de cambios administrativos

## Testing y Desarrollo

### Credenciales de Prueba
Para probar el módulo, usa las credenciales del administrador inicial:
- **DNI:** 12345678
- **Password:** admin123

### Flujo de Testing
1. **Login como admin:** Obtener token JWT
2. **Crear usuarios:** Probar creación de diferentes tipos
3. **Listar y filtrar:** Verificar paginación y filtros
4. **Actualizar datos:** Modificar información de usuarios
5. **Generar reportes:** Exportar estadísticas en diferentes formatos

### Ejemplo de Flujo Completo
```bash
# 1. Login para obtener token
POST /auth/login
{
  "dni": "12345678",
  "password": "admin123"
}

# 2. Crear un médico
POST /admin/users
Authorization: Bearer <token>
{
  "Name": "Dr. Test",
  "Lastname": "Médico",
  "DNI": "99887766",
  "Email": "test@hospital.com",
  "password": "test123456",
  "gender": "MALE",
  "userType": "MEDIC"
}

# 3. Listar usuarios
GET /admin/users?userType=MEDIC
Authorization: Bearer <token>

# 4. Exportar estadísticas
GET /admin/stats/export?format=json&type=users
Authorization: Bearer <token>
```