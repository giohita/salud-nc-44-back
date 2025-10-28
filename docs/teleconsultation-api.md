# Módulo de Teleconsultas - API Documentation

## Descripción General

El módulo de teleconsultas permite gestionar consultas médicas virtuales entre pacientes y médicos. Soporta dos tipos de teleconsultas: WebRTC para consultas regulares y EMERGENCY para consultas de emergencia.

## Arquitectura del Módulo

### Estructura de Archivos
```
src/teleconsultation/
├── dto/
│   ├── create-teleconsultation.dto.ts
│   ├── start-session.dto.ts
│   └── end-session.dto.ts
├── teleconsultation.controller.ts
├── teleconsultation.service.ts
└── teleconsultation.module.ts
```

### Modelos de Base de Datos

#### Teleconsultations
```sql
model Teleconsultations {
  id              Int                     @id @default(autoincrement())
  patientId       Int
  medicId         Int
  appointmentId   Int?
  scheduledAt     DateTime
  startedAt       DateTime?
  endedAt         DateTime?
  type            TeleconsultationType    @default(WEBRTC)
  status          TeleconsultationStatus  @default(SCHEDULED)
  sessionId       String?
  roomId          String?
  notes           String?
  emergencyReason String?
  createdAt       DateTime                @default(now())
  updatedAt       DateTime                @updatedAt
}
```

#### Enums
- **TeleconsultationType**: `WEBRTC`, `EMERGENCY`
- **TeleconsultationStatus**: `SCHEDULED`, `ACTIVE`, `COMPLETED`, `CANCELLED`, `FAILED`

## Endpoints de la API

### 1. Crear Teleconsulta
**POST** `/teleconsultation`

Crea una nueva teleconsulta programada.

#### Request Body
```json
{
  "patientId": 1,
  "medicId": 1,
  "scheduledAt": "2024-12-20T10:00:00Z",
  "type": "webrtc",
  "notes": "Consulta de seguimiento",
  "emergencyReason": "Solo para tipo emergency"
}
```

#### Response
```json
{
  "success": true,
  "message": "Teleconsulta creada exitosamente",
  "data": {
    "id": 1,
    "patientId": 1,
    "medicId": 1,
    "scheduledAt": "2024-12-20T10:00:00.000Z",
    "type": "WEBRTC",
    "status": "SCHEDULED",
    "notes": "Consulta de seguimiento",
    "patient": {
      "ID_Patients": 1,
      "Name": "Juan",
      "email": "juan.perez@email.com"
    },
    "medic": {
      "ID_medics": 1,
      "Name": "Carlos",
      "specialty": "Cardiología"
    }
  }
}
```

### 2. Obtener Todas las Teleconsultas
**GET** `/teleconsultation`

Obtiene la lista de todas las teleconsultas ordenadas por fecha de creación.

#### Response
```json
{
  "success": true,
  "message": "Lista de teleconsultas obtenida",
  "data": [
    {
      "id": 1,
      "patientId": 1,
      "medicId": 1,
      "scheduledAt": "2024-12-20T10:00:00.000Z",
      "type": "WEBRTC",
      "status": "COMPLETED",
      "patient": {
        "ID_Patients": 1,
        "Name": "Juan",
        "Lastname": "Pérez",
        "email": "juan.perez@email.com"
      },
      "medic": {
        "ID_medics": 1,
        "Name": "Carlos",
        "Lastname": "García",
        "specialty": "Cardiología"
      }
    }
  ]
}
```

### 3. Obtener Teleconsulta por ID
**GET** `/teleconsultation/:id`

Obtiene los detalles de una teleconsulta específica.

#### Response
```json
{
  "success": true,
  "message": "Detalles de teleconsulta obtenidos",
  "data": {
    "id": 1,
    "patientId": 1,
    "medicId": 1,
    "scheduledAt": "2024-12-20T10:00:00.000Z",
    "startedAt": "2024-12-20T10:05:00.000Z",
    "endedAt": "2024-12-20T10:35:00.000Z",
    "type": "WEBRTC",
    "status": "COMPLETED",
    "sessionId": "session_abc123",
    "roomId": "room_def456",
    "notes": "Consulta finalizada exitosamente"
  }
}
```

### 4. Iniciar Sesión de Teleconsulta
**POST** `/teleconsultation/start`

Inicia una sesión de teleconsulta activa.

#### Request Body
```json
{
  "teleconsultationId": 1
}
```

#### Response
```json
{
  "success": true,
  "message": "Sesión de teleconsulta iniciada",
  "data": {
    "sessionId": "session_abc123",
    "roomId": "room_def456",
    "type": "WEBRTC",
    "startedAt": "2024-12-20T10:05:00.000Z"
  }
}
```

### 5. Finalizar Sesión de Teleconsulta
**PATCH** `/teleconsultation/:id/end`

Finaliza una sesión de teleconsulta activa.

#### Request Body
```json
{
  "notes": "Consulta finalizada exitosamente"
}
```

#### Response
```json
{
  "success": true,
  "message": "Sesión de teleconsulta finalizada",
  "data": {
    "id": 1,
    "status": "COMPLETED",
    "endedAt": "2024-12-20T10:35:00.000Z",
    "notes": "Consulta finalizada exitosamente"
  }
}
```

### 6. Obtener Teleconsultas por Médico
**GET** `/teleconsultation/medic/:medicId`

Obtiene las teleconsultas de un médico específico con filtros opcionales.

#### Query Parameters
- `status` (opcional): Filtrar por estado (`SCHEDULED`, `ACTIVE`, `COMPLETED`, etc.)

#### Response
```json
{
  "success": true,
  "message": "Teleconsultas del médico obtenidas",
  "data": [
    {
      "id": 1,
      "patientId": 1,
      "scheduledAt": "2024-12-20T10:00:00.000Z",
      "type": "WEBRTC",
      "status": "SCHEDULED"
    }
  ]
}
```

### 7. Obtener Teleconsultas por Paciente
**GET** `/teleconsultation/patient/:patientId`

Obtiene las teleconsultas de un paciente específico con filtros opcionales.

#### Query Parameters
- `status` (opcional): Filtrar por estado

## Flujo de Trabajo

### 1. Creación de Teleconsulta
1. El sistema valida que el paciente y médico existan
2. Se crea la teleconsulta con estado `SCHEDULED`
3. Se retorna la información completa con datos del paciente y médico

### 2. Inicio de Sesión
1. Se valida que la teleconsulta exista y esté en estado `SCHEDULED`
2. Se genera un `sessionId` y `roomId` únicos
3. Se actualiza el estado a `ACTIVE` y se registra `startedAt`
4. Para teleconsultas WebRTC, se prepara la sala virtual
5. Para emergencias, se activa el protocolo de emergencia

### 3. Finalización de Sesión
1. Se valida que la teleconsulta esté `ACTIVE`
2. Se actualiza el estado a `COMPLETED`
3. Se registra `endedAt` y notas opcionales
4. Se libera la sala virtual

## Validaciones

### Crear Teleconsulta
- `patientId`: Debe existir en la base de datos
- `medicId`: Debe existir en la base de datos
- `scheduledAt`: Debe ser una fecha futura
- `type`: Debe ser 'webrtc' o 'emergency'

### Iniciar Sesión
- La teleconsulta debe existir
- El estado debe ser `SCHEDULED`

### Finalizar Sesión
- La teleconsulta debe existir
- El estado debe ser `ACTIVE`

## Manejo de Errores

### Errores Comunes
- **404**: Teleconsulta no encontrada
- **400**: Datos de entrada inválidos
- **409**: Estado de teleconsulta inválido para la operación
- **500**: Error interno del servidor

### Ejemplo de Error
```json
{
  "success": false,
  "message": "Teleconsulta no encontrada",
  "statusCode": 404
}
```

## Datos de Prueba

### Credenciales Disponibles
```
Admin:
  DNI: 12345678, Password: admin123

Médicos:
  Dr. García - DNI: 87654321, Password: medico123
  Dra. Martínez - DNI: 87654322, Password: medico123

Pacientes:
  Juan Pérez - DNI: 11111111, Password: paciente123
  Ana López - DNI: 22222222, Password: paciente123
```

## Próximas Funcionalidades

1. **Integración WebRTC**: Implementación completa de videollamadas
2. **Notificaciones**: Sistema de recordatorios automáticos
3. **Grabación**: Capacidad de grabar sesiones (con consentimiento)
4. **Chat**: Sistema de mensajería durante la consulta
5. **Archivos**: Compartir documentos e imágenes durante la consulta

## Consideraciones de Seguridad

- Todas las comunicaciones deben ser encriptadas
- Los datos médicos requieren cumplimiento HIPAA
- Autenticación requerida para todos los endpoints
- Logs de auditoría para todas las operaciones