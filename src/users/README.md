# Módulo de Usuarios - Gestión de Creación de Usuarios

## Descripción
Este módulo implementa la funcionalidad para crear usuarios en el sistema de salud, permitiendo la creación de tres tipos de usuarios: Administradores (ADMIN), Médicos (MEDIC) y Pacientes (PATIENT).

## Arquitectura del Módulo

### Estructura de Archivos
```
src/users/
├── dto/
│   └── create-user.dto.ts    # DTO para validación de datos de entrada
├── users.controller.ts       # Controlador con endpoints REST
├── users.service.ts         # Lógica de negocio y acceso a datos
├── users.module.ts          # Configuración del módulo NestJS
└── README.md               # Documentación del módulo
```

## Flujo de Implementación

### 1. DTO (Data Transfer Object)
**Archivo:** `dto/create-user.dto.ts`

- **Propósito:** Validar y estructurar los datos de entrada para la creación de usuarios
- **Validaciones implementadas:**
  - Campos obligatorios: `userType`, `DNI`, `Name`, `Lastname`, `password`
  - Validación de email con formato correcto
  - Contraseña mínima de 8 caracteres
  - Validación de enum para género
  - Campos opcionales según el tipo de usuario

### 2. Servicio (Business Logic)
**Archivo:** `users.service.ts`

#### Método `createUser(createUserDto: CreateUserDto)`
**Flujo de ejecución:**

1. **Validación de duplicados:** Verifica si ya existe un usuario con el DNI proporcionado
2. **Hash de contraseña:** Utiliza bcrypt con salt rounds de 10 para encriptar la contraseña
3. **Creación según tipo de usuario:**
   - **ADMIN:** Crea registro en tabla `admins`
   - **MEDIC:** Crea registro en tabla `medics` 
   - **PATIENT:** Crea registro en tabla `patients`
4. **Manejo de errores:** Captura errores de duplicación de Prisma (P2002)
5. **Retorno:** Devuelve objeto `FoundUser` con datos del usuario creado

#### Características técnicas:
- **Seguridad:** Hash de contraseñas con bcrypt
- **Flexibilidad:** Maneja diferencias en nombres de campos entre tipos de usuario
- **Robustez:** Manejo de errores específicos de base de datos
- **Consistencia:** Retorna formato unificado independiente del tipo de usuario

### 3. Controlador (API Endpoints)
**Archivo:** `users.controller.ts`

#### Endpoint: `POST /admin/users`
- **Autenticación:** Requiere JWT válido (JwtAuthGuard)
- **Autorización:** Solo administradores pueden crear usuarios
- **Validación:** Automática mediante class-validator en el DTO
- **Respuesta:** Excluye el passwordHash por seguridad

**Ejemplo de request:**
```json
{
  "userType": "ADMIN",
  "DNI": "12345678",
  "Name": "Juan",
  "Lastname": "Pérez",
  "Email": "juan@example.com",
  "password": "password123",
  "Phone_number": "555-1234",
  "gender": "MALE"
}
```

**Ejemplo de response:**
```json
{
  "message": "Usuario creado exitosamente",
  "user": {
    "id": 1,
    "dni": "12345678",
    "userType": "ADMIN",
    "email": "juan@example.com",
    "name": "Juan",
    "lastname": "Pérez"
  }
}
```

### 4. Módulo (Configuration)
**Archivo:** `users.module.ts`

- **Imports:** PrismaModule para acceso a base de datos
- **Controllers:** UsersController
- **Providers:** UsersService
- **Exports:** UsersService (disponible para otros módulos)

## Integración con el Sistema

### Base de Datos
El módulo interactúa con tres tablas principales:
- `admins`: Para usuarios administradores
- `medics`: Para usuarios médicos
- `patients`: Para usuarios pacientes

### Autenticación
- Integrado con el sistema JWT existente
- Requiere token válido para acceder a endpoints
- Solo administradores pueden crear usuarios

### Validación
- Utiliza class-validator para validación automática
- Validaciones específicas por tipo de campo
- Mensajes de error descriptivos

## Seguridad Implementada

1. **Hash de contraseñas:** bcrypt con salt rounds de 10
2. **Autenticación JWT:** Protección de endpoints
3. **Validación de entrada:** Prevención de datos maliciosos
4. **Exclusión de datos sensibles:** No retorna passwordHash en respuestas
5. **Manejo de errores:** No expone información sensible del sistema

## Casos de Uso

### Crear Administrador
```bash
POST /admin/users
{
  "userType": "ADMIN",
  "DNI": "12345678",
  "Name": "Admin",
  "Lastname": "Sistema",
  "Email": "admin@hospital.com",
  "password": "admin123456"
}
```

### Crear Médico
```bash
POST /admin/users
{
  "userType": "MEDIC",
  "DNI": "87654321",
  "Name": "Dr. María",
  "Lastname": "González",
  "email": "maria.gonzalez@hospital.com",
  "password": "medico123456",
  "specialty": "Cardiología",
  "schedule": "Lunes a Viernes 8:00-16:00"
}
```

### Crear Paciente
```bash
POST /admin/users
{
  "userType": "PATIENT",
  "DNI": "11223344",
  "Name": "Carlos",
  "Lastname": "Rodríguez",
  "email": "carlos@email.com",
  "password": "paciente123456",
  "phone_number": "555-9876",
  "address": "Calle 123, Ciudad"
}
```

## Manejo de Errores

### Errores Comunes
- **409 Conflict:** Usuario con DNI ya existe
- **400 Bad Request:** Datos de entrada inválidos
- **401 Unauthorized:** Token JWT inválido
- **500 Internal Server Error:** Error de base de datos

### Respuestas de Error
```json
{
  "statusCode": 409,
  "message": "Usuario con este DNI ya existe",
  "error": "Conflict"
}
```

## Extensibilidad

El módulo está diseñado para ser fácilmente extensible:
- Agregar nuevos tipos de usuario
- Implementar validaciones adicionales
- Añadir campos específicos por tipo de usuario
- Integrar con sistemas externos de autenticación