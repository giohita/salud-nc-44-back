# Integración FHIR en Clinical Records

## Descripción General

La integración FHIR (Fast Healthcare Interoperability Resources) permite al sistema de registros clínicos intercambiar datos con sistemas EHR (Electronic Health Records) externos de manera estandarizada. Esta implementación sigue el estándar FHIR R4 y se integra directamente con el módulo `clinical-records` existente.

## Características Principales

### 🔄 Sincronización Bidireccional
- **Exportar**: Convierte pacientes y registros clínicos locales a formato FHIR
- **Importar**: Importa observaciones FHIR y las convierte a registros clínicos locales
- **Sincronización automática**: Mantiene los datos sincronizados entre sistemas

### 📊 Recursos FHIR Soportados
- **Patient**: Información demográfica de pacientes
- **Observation**: Registros clínicos y observaciones médicas
- **Practitioner**: Información de médicos (referenciado)

### 🔧 Configuración Flexible
- Soporte para múltiples servidores FHIR
- Configuración de autenticación personalizable
- Validación de conectividad automática

## Estructura de DTOs

### FhirPatientDto
```typescript
interface FhirPatientDto {
  resourceType: 'Patient';
  id: string;
  identifier: FhirIdentifierDto[];
  active: boolean;
  name: FhirNameDto[];
  telecom?: FhirTelecomDto[];
  gender: FhirGender;
  birthDate: string;
  address?: FhirAddressDto[];
}
```

### FhirObservationDto
```typescript
interface FhirObservationDto {
  resourceType: 'Observation';
  id: string;
  status: FhirObservationStatus;
  category: FhirCodeableConceptDto[];
  code: FhirCodeableConceptDto;
  subject: FhirReferenceDto;
  effectiveDateTime?: string;
  valueQuantity?: FhirQuantityDto;
  valueString?: string;
  performer?: FhirReferenceDto[];
}
```

## Endpoints API

### Configuración de Servidor FHIR

**POST** `/records/fhir/configure-server`

Configura un nuevo servidor FHIR para integración.

```json
{
  "name": "Hospital Central FHIR",
  "baseUrl": "https://fhir.hospital.com/api",
  "version": "R4",
  "authType": "bearer",
  "authToken": "your-auth-token"
}
```

### Sincronización de Paciente

**POST** `/records/fhir/sync-patient`

Sincroniza un paciente local con un servidor FHIR.

```json
{
  "patientId": "123",
  "fhirServerId": "Hospital Central FHIR"
}
```

**Respuesta:**
```json
{
  "resourceType": "Patient",
  "id": "123",
  "identifier": [
    {
      "use": "official",
      "system": "http://salud-nc.com/patient-id",
      "value": "12345678",
      "type": "DNI"
    }
  ],
  "active": true,
  "name": [
    {
      "use": "official",
      "family": "García",
      "given": ["Juan"],
      "text": "Juan García"
    }
  ],
  "gender": "male",
  "birthDate": "1985-03-15"
}
```

### Sincronización de Registro Clínico

**POST** `/records/fhir/sync-record`

Sincroniza un registro clínico como observación FHIR.

```json
{
  "clinicalRecordId": "456",
  "fhirServerId": "Hospital Central FHIR",
  "status": "final"
}
```

### Importación de Observación FHIR

**POST** `/records/fhir/import-observation`

Importa una observación desde un servidor FHIR.

```json
{
  "fhirObservationId": "obs-789",
  "patientId": "123",
  "medicId": "456",
  "adminId": "789"
}
```

### Consulta de Registros con FHIR

**GET** `/records/fhir/records-with-fhir`

Obtiene todos los registros clínicos que tienen datos FHIR asociados.

**GET** `/records/{id}/fhir`

Obtiene un registro clínico específico con sus datos FHIR.

## Flujo de Trabajo

### 1. Configuración Inicial

```typescript
// Configurar servidor FHIR
const config = {
  name: 'Hospital Central',
  baseUrl: 'https://fhir.hospital.com/api',
  version: 'R4',
  authType: 'bearer',
  authToken: 'your-token'
};

await clinicalRecordsService.configureFhirServer(config);
```

### 2. Sincronización de Paciente

```typescript
// Sincronizar paciente local con FHIR
const syncDto = {
  patientId: '123',
  fhirServerId: 'Hospital Central'
};

const fhirPatient = await clinicalRecordsService.syncPatientToFhir(syncDto);
```

### 3. Sincronización de Registro Clínico

```typescript
// Sincronizar registro clínico como observación FHIR
const syncRecordDto = {
  clinicalRecordId: '456',
  fhirServerId: 'Hospital Central',
  status: 'final'
};

const fhirObservation = await clinicalRecordsService.syncClinicalRecordToFhir(syncRecordDto);
```

### 4. Importación de Datos FHIR

```typescript
// Importar observación desde servidor FHIR
const importDto = {
  fhirObservationId: 'obs-789',
  patientId: '123',
  medicId: '456',
  adminId: '789'
};

const localRecord = await clinicalRecordsService.importObservationFromFhir(importDto);
```

## Mapeo de Datos

### Paciente Local → FHIR Patient

| Campo Local | Campo FHIR | Transformación |
|-------------|------------|----------------|
| `ID_Patients` | `id` | String conversion |
| `DNI` | `identifier[0].value` | Direct mapping |
| `Name` | `name[0].given[0]` | Direct mapping |
| `Lastname` | `name[0].family` | Direct mapping |
| `gender` | `gender` | Enum mapping |
| `Birthdate` | `birthDate` | ISO date format |
| `phone_number` | `telecom[0].value` | Direct mapping |
| `email` | `telecom[1].value` | Direct mapping |
| `address` | `address[0].text` | Direct mapping |

### Registro Clínico → FHIR Observation

| Campo Local | Campo FHIR | Transformación |
|-------------|------------|----------------|
| `ID_Clinical_data` | `id` | String conversion |
| `type` | `code.text` | Direct mapping |
| `code` | `code.coding[0].code` | Direct mapping |
| `value` | `valueQuantity.value` o `valueString` | Type-based mapping |
| `unit` | `valueQuantity.unit` | Direct mapping |
| `severity` | `note` | Text format |
| `effectiveDate` | `effectiveDateTime` | ISO format |
| `ID_Patients` | `subject.reference` | Patient reference |
| `ID_medics` | `performer[0].reference` | Practitioner reference |

## Validaciones y Seguridad

### Validaciones de Entrada
- **Formato FHIR**: Todos los recursos siguen el estándar FHIR R4
- **Campos requeridos**: Validación de campos obligatorios según FHIR
- **Tipos de datos**: Validación de tipos y formatos específicos
- **Referencias**: Validación de referencias entre recursos

### Seguridad
- **Autenticación**: Soporte para diferentes métodos de autenticación
- **Validación de conectividad**: Verificación antes de configurar servidores
- **Manejo de errores**: Logging detallado y manejo de excepciones
- **Datos sensibles**: No exposición de información confidencial en logs

## Manejo de Errores

### Errores Comunes

1. **Servidor FHIR no disponible**
   ```json
   {
     "statusCode": 400,
     "message": "No se puede conectar al servidor FHIR: https://fhir.example.com"
   }
   ```

2. **Recurso no encontrado**
   ```json
   {
     "statusCode": 404,
     "message": "Paciente con ID 123 no encontrado"
   }
   ```

3. **Configuración FHIR inválida**
   ```json
   {
     "statusCode": 400,
     "message": "Servidor FHIR no configurado: Hospital Central"
   }
   ```

### Logging

El sistema registra todas las operaciones FHIR:

```typescript
// Logs de ejemplo
[ClinicalRecordsService] Configurando servidor FHIR: Hospital Central
[ClinicalRecordsService] Sincronizando paciente 123 con servidor FHIR
[ClinicalRecordsService] Paciente sincronizado exitosamente con FHIR: 123
[ClinicalRecordsService] Error al sincronizar registro clínico con FHIR: Connection timeout
```

## Extensibilidad

### Agregar Nuevos Recursos FHIR

1. **Crear DTOs**: Definir interfaces para el nuevo recurso
2. **Métodos de conversión**: Implementar mapeo bidireccional
3. **Endpoints**: Agregar rutas en el controlador
4. **Validaciones**: Implementar validaciones específicas

### Ejemplo: Agregar Practitioner

```typescript
// 1. DTO
interface FhirPractitionerDto {
  resourceType: 'Practitioner';
  id: string;
  identifier: FhirIdentifierDto[];
  active: boolean;
  name: FhirNameDto[];
  qualification?: FhirQualificationDto[];
}

// 2. Método de conversión
private async convertMedicToFhirPractitioner(medicId: number): Promise<FhirPractitionerDto> {
  // Implementación del mapeo
}

// 3. Endpoint
@Post('fhir/sync-practitioner')
syncPractitionerToFhir(@Body() dto: SyncPractitionerToFhirDto) {
  return this.clinicalRecordsService.syncPractitionerToFhir(dto);
}
```

## Consideraciones de Rendimiento

### Optimizaciones Implementadas
- **Conexiones reutilizables**: Pool de conexiones para servidores FHIR
- **Caché de configuración**: Configuraciones de servidor en memoria
- **Validación previa**: Verificación de conectividad antes de operaciones
- **Logging eficiente**: Logs estructurados para debugging

### Recomendaciones
- **Sincronización por lotes**: Para grandes volúmenes de datos
- **Procesamiento asíncrono**: Para operaciones de larga duración
- **Monitoreo**: Implementar métricas de rendimiento
- **Rate limiting**: Controlar frecuencia de requests a servidores FHIR

## Testing

### Casos de Prueba Recomendados

1. **Configuración de servidor FHIR**
   - Servidor válido y accesible
   - Servidor inválido o inaccesible
   - Configuración duplicada

2. **Sincronización de pacientes**
   - Paciente existente
   - Paciente no encontrado
   - Datos incompletos

3. **Sincronización de registros clínicos**
   - Registro válido
   - Registro sin datos FHIR
   - Diferentes tipos de valores

4. **Importación de observaciones**
   - Observación válida
   - Observación no encontrada
   - Mapeo de diferentes tipos de datos

### Ejemplo de Test

```typescript
describe('FHIR Integration', () => {
  it('should sync patient to FHIR server', async () => {
    const dto = {
      patientId: '1',
      fhirServerId: 'test-server'
    };
    
    const result = await service.syncPatientToFhir(dto);
    
    expect(result.resourceType).toBe('Patient');
    expect(result.id).toBe('1');
  });
});
```

## Conclusión

La integración FHIR en el módulo `clinical-records` proporciona una solución robusta y estándar para el intercambio de datos con sistemas EHR externos. La implementación sigue las mejores prácticas de FHIR R4 y se integra seamlessly con la arquitectura existente del sistema.

Para más información sobre el estándar FHIR, consulte la [documentación oficial de HL7 FHIR](https://www.hl7.org/fhir/).