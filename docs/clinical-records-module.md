# Módulo Clinical Records - Gestión de Historias Clínicas

## Descripción General

El módulo Clinical Records es responsable de la gestión completa de historias clínicas en el sistema de salud. Proporciona funcionalidades para crear, consultar, actualizar y generar reportes descargables de registros médicos, con soporte para estándares FHIR y integración completa con el sistema de pacientes y médicos.

## Arquitectura del Módulo

### Estructura de Archivos
```
src/clinical-records/
├── clinical-records.module.ts      # Configuración del módulo
├── clinical-records.controller.ts  # Endpoints REST
├── clinical-records.service.ts     # Lógica de negocio
├── dto/
│   ├── create-clinical-record.dto.ts  # DTO para creación
│   └── update-clinical-record.dto.ts  # DTO para actualización
└── README.md                       # Documentación específica
```

## Funcionalidades Principales

### 1. Gestión de Registros Clínicos
- **Creación de nuevos registros médicos**
- **Consulta de registros por ID**
- **Actualización de registros existentes**
- **Validación automática de datos**

### 2. Integración con Estándares Médicos
- **Soporte para datos FHIR**
- **Códigos médicos estandarizados**
- **Unidades de medida médicas**
- **Clasificación de severidad**

### 3. Generación de Reportes
- **Descarga de registros en formato PDF**
- **Información completa del paciente y médico**
- **Formato profesional para uso clínico**
- **Marca de tiempo y confidencialidad**

## Endpoints Implementados

### POST /records
**Descripción:** Crea un nuevo registro clínico en el sistema.

**Request Body:**
```json
{
  "ID_Patients": 1,
  "type": "Examen de Laboratorio",
  "code": "LAB001",
  "value": "120",
  "unit": "mg/dL",
  "severity": "Normal",
  "effectiveDate": "2024-01-15T10:30:00Z",
  "fhirData": "{\"resourceType\": \"Observation\"}",
  "ID_medics": 2,
  "create": 1
}
```

**Response:**
```json
{
  "ID_Clinical_data": 1,
  "ID_Patients": 1,
  "type": "Examen de Laboratorio",
  "code": "LAB001",
  "value": "120",
  "unit": "mg/dL",
  "severity": "Normal",
  "effectiveDate": "2024-01-15T10:30:00.000Z",
  "fhirData": "{\"resourceType\": \"Observation\"}",
  "ID_medics": 2,
  "create": 1,
  "patient": {
    "id": 1,
    "Name": "Juan",
    "Lastname": "Pérez"
  },
  "medic": {
    "id": 2,
    "Name": "Dr. María",
    "Lastname": "González"
  },
  "admin": {
    "id": 1,
    "Name": "Admin",
    "Lastname": "Sistema"
  }
}
```

### GET /records/:id
**Descripción:** Recupera un registro clínico específico por su ID.

**Parámetros:**
- `id` (number): ID del registro clínico

**Response:**
```json
{
  "ID_Clinical_data": 1,
  "ID_Patients": 1,
  "type": "Examen de Laboratorio",
  "code": "LAB001",
  "value": "120",
  "unit": "mg/dL",
  "severity": "Normal",
  "effectiveDate": "2024-01-15T10:30:00.000Z",
  "patient": {
    "Name": "Juan",
    "Lastname": "Pérez",
    "DNI": "12345678"
  },
  "medic": {
    "Name": "Dr. María",
    "Lastname": "González"
  }
}
```

### PUT /records/:id
**Descripción:** Actualiza un registro clínico existente.

**Parámetros:**
- `id` (number): ID del registro clínico

**Request Body:** (todos los campos son opcionales)
```json
{
  "type": "Examen de Laboratorio Actualizado",
  "value": "125",
  "severity": "Ligeramente Elevado"
}
```

### GET /records/:id/download
**Descripción:** Genera y descarga un reporte PDF del registro clínico.

**Parámetros:**
- `id` (number): ID del registro clínico

**Response:** Archivo PDF con el registro clínico completo

**Headers de Respuesta:**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="registro_clinico_1_20240115_103000.pdf"
```

## Modelo de Datos

### CreateClinicalRecordDto
```typescript
{
  ID_Patients: number;      // ID del paciente (requerido)
  type: string;            // Tipo de registro (requerido)
  code: string;            // Código médico (requerido)
  value: string;           // Valor del registro (requerido)
  unit: string;            // Unidad de medida (requerido)
  severity: string;        // Nivel de severidad (requerido)
  effectiveDate?: string;  // Fecha efectiva (ISO8601, opcional)
  fhirData?: string;       // Datos FHIR (JSON string, opcional)
  ID_medics: number;       // ID del médico (requerido)
  create: number;          // ID del creador (requerido)
}
```

### UpdateClinicalRecordDto
```typescript
// Extiende CreateClinicalRecordDto con todos los campos opcionales
{
  ID_Patients?: number;
  type?: string;
  code?: string;
  value?: string;
  unit?: string;
  severity?: string;
  effectiveDate?: string;
  fhirData?: string;
  ID_medics?: number;
  create?: number;
}
```

## Validaciones de Entrada

### Campos Requeridos (Creación)
- **ID_Patients:** Número entero válido
- **type:** String no vacío
- **code:** String no vacío
- **value:** String no vacío
- **unit:** String no vacío
- **severity:** String no vacío
- **ID_medics:** Número entero válido
- **create:** Número entero válido

### Campos Opcionales
- **effectiveDate:** Formato ISO8601 válido
- **fhirData:** String JSON válido

## Servicios

### ClinicalRecordsService
**Métodos principales:**

#### `create(createClinicalRecordDto)`
- Crea un nuevo registro clínico
- Valida relaciones con pacientes, médicos y administradores
- Establece fecha efectiva por defecto si no se proporciona
- Incluye información relacionada en la respuesta

#### `findOne(id)`
- Busca un registro clínico por ID
- Incluye información del paciente, médico y administrador
- Maneja errores de registro no encontrado

#### `update(id, updateClinicalRecordDto)`
- Actualiza un registro clínico existente
- Permite actualizaciones parciales
- Valida existencia del registro antes de actualizar

#### `generateDownloadableRecord(id)`
- Genera un PDF profesional del registro clínico
- Incluye información completa del paciente y médico
- Formato estructurado con marca de tiempo
- Incluye advertencias de confidencialidad

## Integración con el Sistema

### Relaciones de Base de Datos
- **Pacientes:** Relación con tabla `patients`
- **Médicos:** Relación con tabla `medics`
- **Administradores:** Relación con tabla `admins`

### Dependencias del Módulo
- **PrismaModule:** Para acceso a base de datos
- **PDFKit:** Para generación de reportes PDF
- **date-fns:** Para formateo de fechas

## Casos de Uso

### 1. Crear Registro de Laboratorio
```bash
curl -X POST http://localhost:3000/records \
  -H "Content-Type: application/json" \
  -d '{
    "ID_Patients": 1,
    "type": "Análisis de Sangre",
    "code": "HEMO001",
    "value": "14.5",
    "unit": "g/dL",
    "severity": "Normal",
    "ID_medics": 2,
    "create": 1
  }'
```

### 2. Consultar Registro Específico
```bash
curl -X GET http://localhost:3000/records/1
```

### 3. Actualizar Registro
```bash
curl -X PUT http://localhost:3000/records/1 \
  -H "Content-Type: application/json" \
  -d '{
    "severity": "Ligeramente Elevado",
    "value": "15.2"
  }'
```

### 4. Descargar Reporte PDF
```bash
curl -X GET http://localhost:3000/records/1/download \
  -o registro_clinico.pdf
```

## Manejo de Errores

### Errores Comunes
- **404 Not Found:** Registro clínico no encontrado
- **404 Not Found:** Paciente, médico o administrador no encontrado
- **400 Bad Request:** Datos de entrada inválidos
- **500 Internal Server Error:** Error del servidor

### Respuestas de Error
```json
{
  "statusCode": 404,
  "message": "Historia clínica con ID 1 no encontrada",
  "error": "Not Found"
}
```

## Características Avanzadas

### 1. Soporte FHIR
- Almacenamiento de datos en formato FHIR
- Interoperabilidad con sistemas externos
- Estándares internacionales de salud

### 2. Generación de PDF
- Reportes profesionales automáticos
- Información completa y estructurada
- Marca de tiempo y confidencialidad
- Formato descargable para archivo

### 3. Logging Avanzado
- Registro detallado de operaciones
- Seguimiento de errores
- Auditoría de accesos a registros

### 4. Validación Robusta
- Validación de tipos de datos
- Verificación de relaciones
- Manejo de errores específicos

## Seguridad y Privacidad

### Protección de Datos
- Información médica confidencial
- Acceso controlado a registros
- Auditoría de operaciones

### Validaciones de Seguridad
- Verificación de relaciones válidas
- Validación de datos de entrada
- Manejo seguro de errores

## Extensibilidad

### Futuras Mejoras
1. **Búsqueda avanzada por criterios médicos**
2. **Integración con sistemas de imagen médica**
3. **Alertas automáticas por valores críticos**
4. **Historial de cambios y versioning**
5. **Integración con sistemas de laboratorio**
6. **Notificaciones automáticas a médicos**

### Configuración Personalizable
```typescript
// Tipos de registro configurables
const RECORD_TYPES = [
  'Examen de Laboratorio',
  'Diagnóstico',
  'Tratamiento',
  'Procedimiento',
  'Observación'
];

// Niveles de severidad
const SEVERITY_LEVELS = [
  'Normal',
  'Leve',
  'Moderado',
  'Severo',
  'Crítico'
];
```

## Testing y Desarrollo

### Datos de Prueba
```json
{
  "ID_Patients": 1,
  "type": "Examen de Prueba",
  "code": "TEST001",
  "value": "100",
  "unit": "mg/dL",
  "severity": "Normal",
  "ID_medics": 1,
  "create": 1
}
```

### Flujo de Testing
1. **Creación:** Verificar creación exitosa con datos válidos
2. **Consulta:** Confirmar recuperación de datos completos
3. **Actualización:** Probar modificaciones parciales
4. **Descarga:** Verificar generación de PDF
5. **Validaciones:** Probar manejo de errores
6. **Relaciones:** Verificar integridad referencial

### Comandos de Desarrollo
```bash
# Ejecutar tests del módulo
npm run test clinical-records

# Modo desarrollo
npm run start:dev

# Verificar endpoints
curl -X GET http://localhost:3000/records/1
```

## Consideraciones de Producción

### Performance
- Índices en campos de búsqueda frecuente
- Paginación para listados grandes
- Cache de registros frecuentemente accedidos

### Backup y Recuperación
- Respaldo automático de registros clínicos
- Versionado de cambios importantes
- Procedimientos de recuperación de datos

### Compliance Médico
- Cumplimiento con regulaciones de salud
- Estándares HIPAA para privacidad
- Auditoría completa de accesos

---

**Nota:** Este módulo maneja información médica sensible. Todas las operaciones deben cumplir con las regulaciones de privacidad y seguridad médica aplicables. Se recomienda implementar autenticación y autorización robustas antes del despliegue en producción.