# Módulo de Citas (Appointments)

Este módulo implementa la gestión completa de citas médicas para el sistema de salud, proporcionando endpoints CRUD para crear, consultar, actualizar y eliminar citas entre pacientes y médicos.

## Arquitectura del Módulo

### Estructura de Archivos
```
Appointments/
├── dto/
│   ├── create-appointment.dto.ts
│   └── update-appointment.dto.ts
├── Appointments.controller.ts
├── Appointments.service.ts
├── Appointments.module.ts
└── README.md (este archivo)
```

## Endpoints Implementados

### 1. Crear Cita
- **Endpoint:** `POST /appointments`
- **Descripción:** Crea una nueva cita médica en el sistema
- **Payload Requerido:**
  ```json
  {
    "ID_Patients": 1,
    "ID_medics": 1,
    "appointmentType": "Consulta general",
    "appointmentDatetime": "2025-10-22T10:00:00.000Z",
    "status": "PENDING",
    "notes": "Paciente con dolor abdominal"
  }
  ```

### 2. Listar Todas las Citas
- **Endpoint:** `GET /appointments`
- **Descripción:** Recupera todas las citas registradas en el sistema
- **Respuesta:** Array de objetos de citas con toda la información

### 3. Obtener Cita por ID
- **Endpoint:** `GET /appointments/:id`
- **Descripción:** Recupera una cita específica por su ID
- **Parámetros:** 
  - `id` (número): ID único de la cita
- **Ejemplo:** `GET /appointments/1`

### 4. Actualizar Cita
- **Endpoint:** `PUT /appointments/:id`
- **Descripción:** Actualiza una cita existente
- **Parámetros:** 
  - `id` (número): ID único de la cita
- **Payload:** Similar al de creación, todos los campos son opcionales
- **Campos adicionales disponibles:**
  ```json
  {
    "reminderSent": true
  }
  ```

### 5. Eliminar Cita
- **Endpoint:** `DELETE /appointments/:id`
- **Descripción:** Elimina una cita del sistema
- **Parámetros:** 
  - `id` (número): ID único de la cita
- **Ejemplo:** `DELETE /appointments/5`

## Características Técnicas

### Validación de Datos
- Utiliza **class-validator** para validación automática de DTOs
- Validación de tipos de datos en tiempo de ejecución
- Transformación automática de parámetros (ParseIntPipe para IDs)

### Manejo de Errores
- Manejo automático de errores para citas no encontradas
- Validación de relaciones con pacientes y médicos existentes
- Respuestas de error estructuradas y descriptivas

### Integración con Base de Datos
- Utiliza **Prisma ORM** para la persistencia de datos
- Relaciones automáticas con las tablas `patients` y `medics`
- Transacciones seguras para operaciones críticas

## Modelo de Datos

### Campos de la Entidad Appointment
```typescript
{
  ID_Appointments: number;      // ID único de la cita
  ID_Patients: number;          // ID del paciente (FK)
  ID_medics: number;           // ID del médico (FK)
  appointmentType: string;      // Tipo de consulta
  appointmentDatetime: Date;    // Fecha y hora de la cita
  status: string;              // Estado de la cita (PENDING, CONFIRMED, COMPLETED, CANCELLED)
  notes: string;               // Notas adicionales sobre la cita
  reminderSent?: boolean;      // Indicador de recordatorio enviado
  createdAt: Date;             // Fecha de creación
  updatedAt: Date;             // Fecha de última actualización
}
```

### Relaciones
- **Paciente:** Relación con la tabla `patients` a través de `ID_Patients`
- **Médico:** Relación con la tabla `medics` a través de `ID_medics`

## Estados de Cita

El sistema maneja diferentes estados para las citas:
- **PENDING:** Cita programada, pendiente de confirmación
- **CONFIRMED:** Cita confirmada por el paciente/médico
- **COMPLETED:** Cita realizada exitosamente
- **CANCELLED:** Cita cancelada

## Casos de Uso

### Programar Nueva Cita
```bash
POST /appointments
Content-Type: application/json

{
  "ID_Patients": 1,
  "ID_medics": 1,
  "appointmentType": "Consulta de seguimiento",
  "appointmentDatetime": "2025-01-15T14:30:00.000Z",
  "status": "PENDING",
  "notes": "Control post-operatorio"
}
```

### Confirmar Cita
```bash
PUT /appointments/1
Content-Type: application/json

{
  "status": "CONFIRMED"
}
```

### Marcar Recordatorio Enviado
```bash
PUT /appointments/1
Content-Type: application/json

{
  "reminderSent": true
}
```

### Cancelar Cita
```bash
PUT /appointments/1
Content-Type: application/json

{
  "status": "CANCELLED",
  "notes": "Cancelada por el paciente - reagendar"
}
```

## Integración con el Sistema

### Dependencias
- **PrismaModule:** Para acceso a la base de datos
- **class-validator:** Para validación de DTOs
- **@nestjs/common:** Para decoradores y funcionalidades básicas

### Exportaciones
- **AppointmentsService:** Disponible para otros módulos que necesiten gestionar citas

## Seguridad y Validaciones

### Validaciones Implementadas
1. **Validación de IDs:** Verificación de que los IDs de pacientes y médicos existen
2. **Validación de fechas:** Asegurar que las fechas de citas sean válidas y futuras
3. **Validación de estados:** Solo permitir transiciones válidas entre estados
4. **Sanitización de datos:** Limpieza automática de inputs maliciosos

### Consideraciones de Seguridad
- Validación de permisos para modificar citas (pendiente de implementar)
- Auditoría de cambios en citas críticas
- Protección contra modificación de citas pasadas

## Extensibilidad

El módulo está diseñado para ser fácilmente extensible:
- **Notificaciones:** Integración con sistemas de email/SMS para recordatorios
- **Calendario:** Sincronización con calendarios externos (Google Calendar, Outlook)
- **Videollamadas:** Integración con plataformas de telemedicina
- **Reportes:** Generación de reportes de citas por período
- **Disponibilidad:** Sistema de gestión de horarios médicos

## Próximas Mejoras

1. **Sistema de Recordatorios Automáticos**
   - Envío de recordatorios por email/SMS
   - Configuración de tiempos de recordatorio

2. **Gestión de Disponibilidad**
   - Horarios de médicos
   - Bloqueo de horarios ocupados

3. **Integración con Telemedicina**
   - Enlaces de videollamada automáticos
   - Salas virtuales de consulta

4. **Reportes y Analytics**
   - Estadísticas de citas por médico
   - Análisis de no-shows y cancelaciones

## Testing

### Credenciales de Prueba
Para probar el módulo, asegúrate de tener:
- Al menos un paciente creado en el sistema
- Al menos un médico creado en el sistema
- Usar IDs válidos en las requests

### Ejemplos de Testing
```bash
# Verificar que existe el paciente y médico antes de crear cita
GET /admin/users?userType=PATIENT
GET /admin/users?userType=MEDIC

# Crear cita de prueba
POST /appointments
{
  "ID_Patients": 1,
  "ID_medics": 1,
  "appointmentType": "Consulta de prueba",
  "appointmentDatetime": "2025-02-01T10:00:00.000Z",
  "status": "PENDING",
  "notes": "Cita de prueba del sistema"
}
```