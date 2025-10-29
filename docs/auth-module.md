# Módulo Auth - Sistema de Autenticación y Autorización

## Descripción General

El módulo Auth es el núcleo del sistema de autenticación y autorización del portal de salud. Proporciona funcionalidades completas para el manejo de sesiones de usuario, incluyendo login, logout, refresh de tokens, recuperación de contraseñas y validación de acceso mediante JWT.

## Arquitectura del Módulo

### Estructura de Archivos
```
src/auth/
├── auth.module.ts          # Configuración del módulo
├── auth.controller.ts      # Endpoints de autenticación
├── auth.service.ts         # Lógica de negocio
├── jwt.strategy.ts         # Estrategia JWT para Passport
└── dto/
    ├── login.dto.ts        # DTO para login
    ├── forgot-password.dto.ts  # DTO para recuperación
    └── reset-password.dto.ts   # DTO para reseteo
```

## Funcionalidades Principales

### 1. Autenticación de Usuarios
- **Login con DNI y contraseña**
- **Generación de tokens JWT (access y refresh)**
- **Manejo de cookies seguras**
- **Validación de credenciales**

### 2. Gestión de Sesiones
- **Refresh de tokens automático**
- **Logout seguro con limpieza de cookies**
- **Validación de tokens en tiempo real**

### 3. Recuperación de Contraseñas
- **Solicitud de reseteo por DNI**
- **Generación de tokens temporales**
- **Reseteo seguro de contraseñas**

## Endpoints Implementados

### POST /auth/login
**Descripción:** Autentica un usuario y establece cookies de sesión.

**Request Body:**
```json
{
  "dni": "12345678",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "Name": "Juan",
    "Lastname": "Pérez",
    "DNI": "12345678",
    "Email": "juan@email.com",
    "userType": "PATIENT",
    "gender": "MALE"
  }
}
```

**Nota:** El campo `gender` solo aparece en la respuesta para usuarios de tipo `MEDIC` y `PATIENT`. Los usuarios `ADMIN` no incluyen este campo.

**Cookies establecidas:**
- `access_token`: Token JWT de acceso (15 min)
- `refresh_token`: Token de refresco (7 días)

### POST /auth/refresh
**Descripción:** Renueva el token de acceso usando el refresh token.

**Response:**
```json
{
  "message": "Token refreshed successfully"
}
```

### POST /auth/logout
**Descripción:** Cierra la sesión del usuario y limpia las cookies.

**Response:**
```json
{
  "message": "Logout successful"
}
```

### POST /auth/forgot
**Descripción:** Inicia el proceso de recuperación de contraseña.

**Request Body:**
```json
{
  "dni": "12345678"
}
```

**Response:**
```json
{
  "message": "Reset token generated",
  "resetToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### POST /auth/reset
**Descripción:** Resetea la contraseña usando el token de recuperación.

**Request Body:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "newPassword": "newPassword123"
}
```

**Response:**
```json
{
  "message": "Password reset successfully"
}
```

## Seguridad y Autenticación

### JWT Strategy
- **Algoritmo:** HS256
- **Secret:** Configurado via variables de entorno
- **Duración Access Token:** 15 minutos
- **Duración Refresh Token:** 7 días

### JWT Payload
El token JWT incluye la siguiente información del usuario:
```typescript
{
  sub: number;           // ID del usuario
  dni: string;           // DNI del usuario
  userType: string;      // Tipo: 'ADMIN' | 'MEDIC' | 'PATIENT'
  name?: string;         // Nombre (opcional)
  lastname?: string;     // Apellido (opcional)
  gender?: string;       // Género (solo para MEDIC y PATIENT)
  iat: number;          // Timestamp de emisión
  exp: number;          // Timestamp de expiración
}
```

**Nota:** El campo `gender` solo se incluye para usuarios de tipo `MEDIC` y `PATIENT`. Los usuarios `ADMIN` no tienen este campo en su payload.

### Configuración de Cookies
```typescript
{
  httpOnly: true,      // Previene acceso desde JavaScript
  secure: true,        // Solo HTTPS en producción
  sameSite: 'strict',  // Protección CSRF
  maxAge: 900000       // 15 minutos para access_token
}
```

### Validaciones de Entrada
- **DNI:** String de 7-12 caracteres
- **Password:** String mínimo 8 caracteres
- **Token:** String requerido para operaciones de reset

## Modelo de Datos

### LoginDto
```typescript
{
  dni: string;        // DNI del usuario (validado)
  password: string;   // Contraseña (validada)
}
```

### ForgotPasswordDto
```typescript
{
  dni: string;        // DNI (7-12 caracteres)
}
```

### ResetPasswordDto
```typescript
{
  token: string;      // Token de recuperación
  newPassword: string; // Nueva contraseña (min 8 chars)
}
```

## Servicios

### AuthService
**Métodos principales:**
- `validateUser(dni, password)`: Valida credenciales
- `login(user)`: Genera tokens y establece cookies
- `refreshToken(refreshToken)`: Renueva access token
- `logout(response)`: Limpia cookies de sesión
- `forgotPassword(dni)`: Genera token de recuperación
- `resetPassword(token, newPassword)`: Resetea contraseña

### Integración con UsersService
- Validación de usuarios existentes
- Verificación de contraseñas hasheadas
- Actualización de contraseñas

## Casos de Uso

### 1. Login de Usuario
```bash
# Request
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"dni": "12345678", "password": "password123"}'

# Response incluye cookies automáticamente
```

### 2. Acceso a Recurso Protegido
```bash
# Las cookies se envían automáticamente
curl -X GET http://localhost:3000/appointments \
  -H "Cookie: access_token=eyJ..."
```

### 3. Recuperación de Contraseña
```bash
# Paso 1: Solicitar token
curl -X POST http://localhost:3000/auth/forgot \
  -H "Content-Type: application/json" \
  -d '{"dni": "12345678"}'

# Paso 2: Resetear con token
curl -X POST http://localhost:3000/auth/reset \
  -H "Content-Type: application/json" \
  -d '{"token": "eyJ...", "newPassword": "newPass123"}'
```

## Manejo de Errores

### Errores Comunes
- **401 Unauthorized:** Credenciales inválidas
- **404 Not Found:** Usuario no encontrado
- **400 Bad Request:** Token inválido o expirado
- **500 Internal Server Error:** Error del servidor

### Respuestas de Error
```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}
```

## Integración con el Sistema

### Guards Utilizados
- **JwtAuthGuard:** Protege rutas que requieren autenticación
- **AdminRoleGuard:** Protege rutas administrativas

### Middleware de Cookies
- Configuración automática de cookies seguras
- Limpieza automática en logout
- Renovación transparente de tokens

## Características Avanzadas

### 1. Refresh Token Automático
- Renovación transparente antes de expiración
- Manejo de errores de token expirado
- Redirección automática a login si es necesario

### 2. Seguridad Mejorada
- Tokens con tiempo de vida limitado
- Cookies httpOnly para prevenir XSS
- Validación de origen para prevenir CSRF

### 3. Recuperación de Contraseña
- Tokens temporales con expiración
- Validación de usuario antes de generar token
- Hash seguro de nuevas contraseñas

## Extensibilidad

### Futuras Mejoras
1. **Autenticación Multifactor (2FA)**
2. **OAuth2 con proveedores externos**
3. **Rate limiting para intentos de login**
4. **Auditoría de sesiones**
5. **Notificaciones de seguridad**

### Configuración Personalizable
```typescript
// Variables de entorno
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
COOKIE_SECURE=true
```

## Testing y Desarrollo

### Credenciales de Prueba
```json
{
  "dni": "12345678",
  "password": "admin123",
  "userType": "ADMIN"
}
```

### Flujo de Testing
1. **Login:** Verificar autenticación exitosa
2. **Token Validation:** Confirmar acceso a rutas protegidas
3. **Refresh:** Probar renovación de tokens
4. **Logout:** Verificar limpieza de sesión
5. **Password Recovery:** Probar flujo completo de recuperación

### Comandos de Desarrollo
```bash
# Ejecutar tests del módulo
npm run test auth

# Modo desarrollo con hot reload
npm run start:dev

# Verificar endpoints
curl -X POST http://localhost:3000/auth/login
```

## Consideraciones de Producción

### Seguridad
- Usar HTTPS en producción
- Configurar secrets seguros
- Implementar rate limiting
- Monitorear intentos de acceso

### Performance
- Cache de validaciones JWT
- Optimización de queries de usuario
- Compresión de respuestas

### Monitoreo
- Logs de autenticación
- Métricas de sesiones activas
- Alertas de seguridad

---

**Nota:** Este módulo es crítico para la seguridad del sistema. Cualquier modificación debe ser revisada cuidadosamente y probada exhaustivamente antes de implementarse en producción.