# Módulo Users - Gestión de Usuarios del Sistema

## Descripción General

El módulo Users es responsable de la gestión completa de usuarios en el sistema de salud. Proporciona funcionalidades para crear y buscar usuarios de diferentes tipos (Administradores, Médicos y Pacientes), con manejo seguro de contraseñas, validaciones robustas y integración completa con el sistema de autenticación.

## Arquitectura del Módulo

### Estructura de Archivos
```
src/users/
├── users.module.ts          # Configuración del módulo
├── users.controller.ts      # Endpoints REST
├── users.service.ts         # Lógica de negocio
├── dto/
│   └── create-user.dto.ts   # DTO para creación de usuarios
└── README.md                # Documentación específica
```

## Funcionalidades Principales

### 1. Gestión de Usuarios Multi-Tipo
- **Creación de Administradores (ADMIN)**
- **Creación de Médicos (MEDIC)**
- **Creación de Pacientes (PATIENT)**
- **Búsqueda unificada por DNI**

### 2. Seguridad Avanzada
- **Hash de contraseñas con bcrypt**
- **Validación de duplicados por DNI**
- **Exclusión de datos sensibles en respuestas**
- **Autenticación JWT requerida**

### 3. Validación Robusta
- **Validación automática con class-validator**
- **Campos específicos por tipo de usuario**
- **Manejo de errores descriptivos**

## Endpoints Implementados

### POST /admin/users
**Descripción:** Crea un nuevo usuario en el sistema (solo administradores).

**Autenticación:** Requiere JWT válido
**Autorización:** Solo administradores

**Request Body para ADMIN:**
```json
{
  "userType": "ADMIN",
  "DNI": "12345678",
  "Name": "Juan",
  "Lastname": "Pérez",
  "Email": "juan@hospital.com",
  "password": "admin123456",
  "Phone_number": "555-1234"
}
```

**Request Body para MEDIC:**
```json
{
  "userType": "MEDIC",
  "DNI": "87654321",
  "Name": "Dr. María",
  "Lastname": "González",
  "email": "maria.gonzalez@hospital.com",
  "password": "medico123456",
  "phone_number": "555-5678",
  "gender": "FEMALE",
  "Birthdate": "1985-03-15",
  "specialty": "Cardiología",
  "schedule": "Lunes a Viernes 8:00-16:00"
}
```

**Request Body para PATIENT:**
```json
{
  "userType": "PATIENT",
  "DNI": "11223344",
  "Name": "Carlos",
  "Lastname": "Rodríguez",
  "email": "carlos@email.com",
  "password": "paciente123456",
  "phone_number": "555-9876",
  "gender": "MALE",
  "Birthdate": "1990-07-20",
  "address": "Calle 123, Ciudad"
}
```

**Response Exitosa:**
```json
{
  "message": "Usuario creado exitosamente",
  "user": {
    "id": 1,
    "dni": "12345678",
    "userType": "ADMIN",
    "email": "juan@hospital.com",
    "name": "Juan",
    "lastname": "Pérez"
  }
}
```

## Modelo de Datos

### CreateUserDto
```typescript
{
  userType: 'ADMIN' | 'MEDIC' | 'PATIENT';  // Tipo de usuario (requerido)
  DNI: string;                              // DNI único (requerido)
  Name: string;                             // Nombre (requerido)
  Lastname: string;                         // Apellido (requerido)
  password: string;                         // Contraseña min 8 chars (requerido)
  
  // Campos opcionales comunes
  Email?: string;                           // Email para admins
  Phone_number?: string;                    // Teléfono para admins
  
  // Campos para médicos y pacientes
  email?: string;                           // Email (minúscula)
  phone_number?: string;                    // Teléfono (minúscula)
  gender?: Gender;                          // Género (MALE/FEMALE)
  Birthdate?: string;                       // Fecha nacimiento (ISO8601)
  
  // Campos específicos para médicos
  specialty?: string;                       // Especialidad médica
  schedule?: string;                        // Horario de trabajo
  
  // Campos específicos para pacientes
  address?: string;                         // Dirección del paciente
}
```

### FoundUser (Tipo de Retorno)
```typescript
{
  id: number;                               // ID único del usuario
  dni: string;                              // DNI del usuario
  passwordHash: string;                     // Hash de la contraseña
  userType: 'ADMIN' | 'MEDIC' | 'PATIENT'; // Tipo de usuario
  email?: string;                           // Email del usuario
  name?: string;                            // Nombre del usuario
  lastname?: string;                        // Apellido del usuario
  gender?: string;                          // Género (solo para MEDIC y PATIENT)
}
```

**Nota:** El campo `gender` solo está presente para usuarios de tipo `MEDIC` y `PATIENT`. Los usuarios `ADMIN` no incluyen este campo.

## Validaciones de Entrada

### Campos Requeridos (Todos los tipos)
- **userType:** Debe ser 'ADMIN', 'MEDIC' o 'PATIENT'
- **DNI:** String no vacío, único en el sistema
- **Name:** String no vacío
- **Lastname:** String no vacío
- **password:** Mínimo 8 caracteres

### Campos Específicos por Tipo

#### ADMIN
- **Email:** Email válido (opcional)
- **Phone_number:** String (opcional)

#### MEDIC
- **email:** Email válido (opcional)
- **phone_number:** String (opcional)
- **gender:** Enum Gender (requerido)
- **Birthdate:** Fecha ISO8601 (requerido)
- **specialty:** String (opcional)
- **schedule:** String (opcional)

#### PATIENT
- **email:** Email válido (opcional)
- **phone_number:** String (opcional)
- **gender:** Enum Gender (requerido)
- **Birthdate:** Fecha ISO8601 (requerido)
- **address:** String (opcional)

## Servicios

### UsersService
**Métodos principales:**

#### `findByDni(dni: string): Promise<FoundUser | null>`
- Busca un usuario por DNI en todas las tablas (admins, medics, patients)
- Retorna formato unificado independiente del tipo de usuario
- Utilizado por el sistema de autenticación
- Incluye passwordHash para validación de credenciales

#### `createUser(createUserDto: CreateUserDto): Promise<FoundUser>`
- Crea un nuevo usuario según el tipo especificado
- Valida que el DNI no exista previamente
- Hashea la contraseña con bcrypt (salt rounds: 10)
- Maneja diferencias en nombres de campos entre tipos de usuario
- Establece relaciones automáticas con administradores

### Lógica de Creación por Tipo

#### Administradores (ADMIN)
```typescript
// Campos mapeados
{
  DNI: userData.DNI,
  Name: userData.Name,
  Lastname: userData.Lastname,
  Email: userData.Email || userData.email || '',
  passwordHash: hashedPassword,
  Phone_number: userData.Phone_number || userData.phone_number
}
```

#### Médicos (MEDIC)
```typescript
// Campos mapeados + relación con admin
{
  DNI: userData.DNI,
  Name: userData.Name,
  Lastname: userData.Lastname,
  email: userData.email || userData.Email || '',
  passwordHash: hashedPassword,
  phone_number: userData.phone_number || userData.Phone_number,
  gender: userData.gender,           // Requerido
  Birthdate: new Date(userData.Birthdate), // Requerido
  specialty: userData.specialty,
  schedule: userData.schedule,
  create: firstAdmin.ID_Admins      // Relación automática
}
```

#### Pacientes (PATIENT)
```typescript
// Campos mapeados + relación con admin
{
  DNI: userData.DNI,
  Name: userData.Name,
  Lastname: userData.Lastname,
  email: userData.email || userData.Email || '',
  passwordHash: hashedPassword,
  phone_number: userData.phone_number || userData.Phone_number,
  gender: userData.gender,           // Requerido
  Birthdate: new Date(userData.Birthdate), // Requerido
  address: userData.address,
  create: adminForPatient.ID_Admins // Relación automática
}
```

## Integración con el Sistema

### Relaciones de Base de Datos
- **Administradores:** Tabla `admins`
- **Médicos:** Tabla `medics` (relación con `admins`)
- **Pacientes:** Tabla `patients` (relación con `admins`)

### Autenticación y Autorización
- **JWT Guard:** Protege el endpoint de creación
- **Integración con AuthService:** Método `findByDni` usado para login
- **Exclusión de datos sensibles:** No retorna `passwordHash` en respuestas

### Dependencias del Módulo
- **PrismaModule:** Para acceso a base de datos
- **bcrypt:** Para hash de contraseñas
- **class-validator:** Para validaciones automáticas

## Casos de Uso

### 1. Crear Administrador del Sistema
```bash
curl -X POST http://localhost:3000/admin/users \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userType": "ADMIN",
    "DNI": "12345678",
    "Name": "Admin",
    "Lastname": "Sistema",
    "Email": "admin@hospital.com",
    "password": "admin123456",
    "Phone_number": "555-0001"
  }'
```

### 2. Crear Médico Especialista
```bash
curl -X POST http://localhost:3000/admin/users \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userType": "MEDIC",
    "DNI": "87654321",
    "Name": "Dr. María",
    "Lastname": "González",
    "email": "maria.gonzalez@hospital.com",
    "password": "medico123456",
    "phone_number": "555-0002",
    "gender": "FEMALE",
    "Birthdate": "1985-03-15",
    "specialty": "Cardiología",
    "schedule": "Lunes a Viernes 8:00-16:00"
  }'
```

### 3. Crear Paciente
```bash
curl -X POST http://localhost:3000/admin/users \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userType": "PATIENT",
    "DNI": "11223344",
    "Name": "Carlos",
    "Lastname": "Rodríguez",
    "email": "carlos@email.com",
    "password": "paciente123456",
    "phone_number": "555-0003",
    "gender": "MALE",
    "Birthdate": "1990-07-20",
    "address": "Calle 123, Ciudad"
  }'
```

## Manejo de Errores

### Errores Comunes
- **409 Conflict:** Usuario con DNI ya existe
- **400 Bad Request:** Datos de entrada inválidos o campos requeridos faltantes
- **401 Unauthorized:** Token JWT inválido o faltante
- **500 Internal Server Error:** Error de base de datos

### Respuestas de Error
```json
{
  "statusCode": 409,
  "message": "Usuario con este DNI ya existe",
  "error": "Conflict"
}
```

```json
{
  "statusCode": 400,
  "message": "Gender y Birthdate son requeridos para médicos",
  "error": "Bad Request"
}
```

## Características Avanzadas

### 1. Seguridad de Contraseñas
- **Bcrypt con salt rounds 10**
- **Validación de longitud mínima (8 caracteres)**
- **Hash automático antes del almacenamiento**
- **Exclusión del hash en respuestas**

### 2. Flexibilidad de Campos
- **Manejo de diferencias en nomenclatura** (Email vs email)
- **Campos opcionales según tipo de usuario**
- **Validaciones específicas por tipo**

### 3. Relaciones Automáticas
- **Asignación automática de administrador creador**
- **Validación de existencia de administradores**
- **Manejo de dependencias entre entidades**

### 4. Búsqueda Unificada
- **Búsqueda por DNI en todas las tablas**
- **Formato de respuesta consistente**
- **Optimización para autenticación**

## Seguridad y Privacidad

### Protección de Datos
- **Hash irreversible de contraseñas**
- **Validación de unicidad de DNI**
- **Exclusión de datos sensibles en respuestas**
- **Autenticación requerida para operaciones**

### Validaciones de Seguridad
- **Verificación de duplicados antes de creación**
- **Validación de tipos de datos**
- **Manejo seguro de errores**

## Extensibilidad

### Futuras Mejoras
1. **Endpoints adicionales (listar, actualizar, eliminar)**
2. **Búsqueda por múltiples criterios**
3. **Paginación para listados grandes**
4. **Filtros avanzados por tipo de usuario**
5. **Auditoría de cambios de usuario**
6. **Integración con sistemas externos**
7. **Validación de documentos de identidad**

### Configuración Personalizable
```typescript
// Configuración de bcrypt
const SALT_ROUNDS = 10;

// Tipos de usuario soportados
const USER_TYPES = ['ADMIN', 'MEDIC', 'PATIENT'] as const;

// Géneros soportados
enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE'
}
```

## Testing y Desarrollo

### Datos de Prueba

#### Administrador
```json
{
  "userType": "ADMIN",
  "DNI": "12345678",
  "Name": "Test",
  "Lastname": "Admin",
  "Email": "test.admin@hospital.com",
  "password": "testadmin123",
  "Phone_number": "555-0001"
}
```

#### Médico
```json
{
  "userType": "MEDIC",
  "DNI": "87654321",
  "Name": "Test",
  "Lastname": "Doctor",
  "email": "test.doctor@hospital.com",
  "password": "testdoctor123",
  "phone_number": "555-0002",
  "gender": "MALE",
  "Birthdate": "1980-01-01",
  "specialty": "Medicina General"
}
```

#### Paciente
```json
{
  "userType": "PATIENT",
  "DNI": "11223344",
  "Name": "Test",
  "Lastname": "Patient",
  "email": "test.patient@email.com",
  "password": "testpatient123",
  "phone_number": "555-0003",
  "gender": "FEMALE",
  "Birthdate": "1995-01-01",
  "address": "Test Address 123"
}
```

### Flujo de Testing
1. **Autenticación:** Obtener JWT token válido
2. **Creación:** Probar creación de cada tipo de usuario
3. **Validaciones:** Verificar manejo de errores
4. **Duplicados:** Probar prevención de DNI duplicados
5. **Búsqueda:** Verificar función `findByDni`
6. **Seguridad:** Confirmar exclusión de passwordHash

### Comandos de Desarrollo
```bash
# Ejecutar tests del módulo
npm run test users

# Modo desarrollo
npm run start:dev

# Verificar endpoint con token
curl -X POST http://localhost:3000/admin/users \
  -H "Authorization: Bearer <token>"
```

## Consideraciones de Producción

### Performance
- **Índices en campos DNI para búsquedas rápidas**
- **Optimización de queries de búsqueda**
- **Cache de usuarios frecuentemente accedidos**

### Seguridad
- **Validación de tokens JWT en cada request**
- **Rate limiting para prevenir ataques de fuerza bruta**
- **Auditoría de creación de usuarios**
- **Monitoreo de intentos de duplicación**

### Escalabilidad
- **Separación de servicios por tipo de usuario**
- **Implementación de microservicios**
- **Base de datos distribuida**

---

**Nota:** Este módulo es fundamental para la gestión de usuarios del sistema. Todas las operaciones requieren autenticación válida y solo los administradores pueden crear nuevos usuarios. Se recomienda implementar auditoría completa y monitoreo de seguridad en producción.