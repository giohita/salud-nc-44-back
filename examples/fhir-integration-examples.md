# Ejemplos Prácticos de Integración FHIR

## Configuración Inicial

### 1. Configurar Servidor FHIR Local (HAPI FHIR)

```bash
# Usando Docker
docker run -p 8080:8080 hapiproject/hapi:latest
```

```typescript
// Configurar en la aplicación
const config = {
  name: 'HAPI FHIR Local',
  baseUrl: 'http://localhost:8080/fhir',
  version: 'R4',
  authType: 'none'
};

// POST /records/fhir/configure-server
```

### 2. Configurar Servidor FHIR con Autenticación

```typescript
const config = {
  name: 'Hospital Central FHIR',
  baseUrl: 'https://fhir.hospital.com/api',
  version: 'R4',
  authType: 'bearer',
  authToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
};
```

## Casos de Uso Completos

### Caso 1: Sincronización de Paciente Nuevo

```typescript
// 1. Crear paciente local
const newPatient = {
  DNI: '12345678',
  Name: 'María',
  Lastname: 'González',
  gender: 'FEMALE',
  Birthdate: '1990-05-15',
  phone_number: '+34612345678',
  email: 'maria.gonzalez@email.com',
  address: 'Calle Mayor 123, Madrid'
};

// POST /patients (endpoint de pacientes)
const createdPatient = await patientsService.create(newPatient);

// 2. Sincronizar con FHIR
const syncDto = {
  patientId: createdPatient.ID_Patients.toString(),
  fhirServerId: 'HAPI FHIR Local'
};

// POST /records/fhir/sync-patient
const fhirPatient = await clinicalRecordsService.syncPatientToFhir(syncDto);

console.log('Paciente sincronizado:', fhirPatient);
```

**Resultado FHIR:**
```json
{
  "resourceType": "Patient",
  "id": "1",
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
      "family": "González",
      "given": ["María"],
      "text": "María González"
    }
  ],
  "telecom": [
    {
      "system": "phone",
      "value": "+34612345678",
      "use": "mobile"
    },
    {
      "system": "email",
      "value": "maria.gonzalez@email.com",
      "use": "home"
    }
  ],
  "gender": "female",
  "birthDate": "1990-05-15",
  "address": [
    {
      "use": "home",
      "type": "physical",
      "text": "Calle Mayor 123, Madrid"
    }
  ]
}
```

### Caso 2: Registro Clínico con Valores Numéricos

```typescript
// 1. Crear registro clínico de presión arterial
const clinicalRecord = {
  ID_Patients: 1,
  type: 'Presión Arterial Sistólica',
  code: 'BP_SYS',
  value: '120',
  unit: 'mmHg',
  severity: 'Normal',
  effectiveDate: new Date().toISOString(),
  ID_medics: 1,
  create: 1
};

// POST /records
const createdRecord = await clinicalRecordsService.create(clinicalRecord);

// 2. Sincronizar con FHIR
const syncRecordDto = {
  clinicalRecordId: createdRecord.ID_Clinical_data.toString(),
  fhirServerId: 'HAPI FHIR Local',
  status: 'final'
};

// POST /records/fhir/sync-record
const fhirObservation = await clinicalRecordsService.syncClinicalRecordToFhir(syncRecordDto);
```

**Resultado FHIR:**
```json
{
  "resourceType": "Observation",
  "id": "1",
  "status": "final",
  "category": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/observation-category",
          "code": "survey",
          "display": "Survey"
        }
      ],
      "text": "Presión Arterial Sistólica"
    }
  ],
  "code": {
    "coding": [
      {
        "system": "http://salud-nc.com/clinical-codes",
        "code": "BP_SYS",
        "display": "Presión Arterial Sistólica"
      }
    ],
    "text": "Presión Arterial Sistólica"
  },
  "subject": {
    "reference": "Patient/1",
    "display": "María González"
  },
  "effectiveDateTime": "2024-01-15T10:30:00.000Z",
  "valueQuantity": {
    "value": 120,
    "unit": "mmHg",
    "system": "http://unitsofmeasure.org",
    "code": "mmHg"
  },
  "performer": [
    {
      "reference": "Practitioner/1",
      "display": "Dr. Juan Pérez"
    }
  ],
  "note": "Severidad: Normal"
}
```

### Caso 3: Importación de Observación FHIR Externa

```typescript
// Importar observación de glucosa desde servidor FHIR externo
const importDto = {
  fhirObservationId: 'glucose-obs-456',
  patientId: '1',
  medicId: '1',
  adminId: '1'
};

// POST /records/fhir/import-observation
const importedRecord = await clinicalRecordsService.importObservationFromFhir(importDto);

console.log('Registro importado:', importedRecord);
```

**Observación FHIR de origen (simulada):**
```json
{
  "resourceType": "Observation",
  "id": "glucose-obs-456",
  "status": "final",
  "category": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/observation-category",
          "code": "vital-signs",
          "display": "Vital Signs"
        }
      ]
    }
  ],
  "code": {
    "coding": [
      {
        "system": "http://loinc.org",
        "code": "33747-0",
        "display": "Glucose [Mass/volume] in Blood"
      }
    ]
  },
  "subject": {
    "reference": "Patient/123"
  },
  "effectiveDateTime": "2024-01-15T08:00:00.000Z",
  "valueQuantity": {
    "value": 95,
    "unit": "mg/dL",
    "system": "http://unitsofmeasure.org",
    "code": "mg/dL"
  }
}
```

**Registro clínico resultante:**
```json
{
  "ID_Clinical_data": 2,
  "ID_Patients": 1,
  "type": "Glucose [Mass/volume] in Blood",
  "code": "33747-0",
  "value": "95",
  "unit": "mg/dL",
  "severity": "Normal",
  "effectiveDate": "2024-01-15T08:00:00.000Z",
  "fhirData": "{\"resourceType\":\"Observation\",\"id\":\"glucose-obs-456\",...}",
  "ID_medics": 1,
  "create": 1
}
```

## Flujos de Trabajo Avanzados

### Flujo 1: Sincronización Masiva de Pacientes

```typescript
async function syncAllPatients() {
  // 1. Obtener todos los pacientes
  const patients = await prisma.patients.findMany();
  
  // 2. Sincronizar en lotes
  const batchSize = 10;
  for (let i = 0; i < patients.length; i += batchSize) {
    const batch = patients.slice(i, i + batchSize);
    
    const syncPromises = batch.map(patient => 
      clinicalRecordsService.syncPatientToFhir({
        patientId: patient.ID_Patients.toString(),
        fhirServerId: 'HAPI FHIR Local'
      })
    );
    
    try {
      await Promise.all(syncPromises);
      console.log(`Lote ${Math.floor(i/batchSize) + 1} sincronizado exitosamente`);
    } catch (error) {
      console.error(`Error en lote ${Math.floor(i/batchSize) + 1}:`, error);
    }
    
    // Pausa entre lotes para no sobrecargar el servidor
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
```

### Flujo 2: Monitoreo de Sincronización

```typescript
async function monitorFhirSync() {
  // Obtener registros con datos FHIR
  const recordsWithFhir = await clinicalRecordsService.getClinicalRecordsWithFhir();
  
  console.log(`Total de registros sincronizados: ${recordsWithFhir.length}`);
  
  // Agrupar por tipo
  const byType = recordsWithFhir.reduce((acc, record) => {
    acc[record.type] = (acc[record.type] || 0) + 1;
    return acc;
  }, {});
  
  console.log('Distribución por tipo:', byType);
  
  // Verificar integridad de datos FHIR
  const invalidRecords = recordsWithFhir.filter(record => {
    try {
      const fhirData = JSON.parse(record.fhirData);
      return !fhirData.resourceType || !fhirData.id;
    } catch {
      return true;
    }
  });
  
  if (invalidRecords.length > 0) {
    console.warn(`${invalidRecords.length} registros con datos FHIR inválidos`);
  }
}
```

### Flujo 3: Sincronización Bidireccional

```typescript
async function bidirectionalSync(patientId: number) {
  try {
    // 1. Sincronizar paciente local a FHIR
    await clinicalRecordsService.syncPatientToFhir({
      patientId: patientId.toString(),
      fhirServerId: 'Hospital Central FHIR'
    });
    
    // 2. Obtener registros clínicos locales del paciente
    const localRecords = await prisma.clinical_data.findMany({
      where: { ID_Patients: patientId }
    });
    
    // 3. Sincronizar cada registro a FHIR
    for (const record of localRecords) {
      await clinicalRecordsService.syncClinicalRecordToFhir({
        clinicalRecordId: record.ID_Clinical_data.toString(),
        fhirServerId: 'Hospital Central FHIR'
      });
    }
    
    // 4. Importar observaciones FHIR externas (simulado)
    const externalObservations = ['obs-1', 'obs-2', 'obs-3'];
    
    for (const obsId of externalObservations) {
      try {
        await clinicalRecordsService.importObservationFromFhir({
          fhirObservationId: obsId,
          patientId: patientId.toString(),
          medicId: '1',
          adminId: '1'
        });
      } catch (error) {
        console.warn(`No se pudo importar observación ${obsId}:`, error.message);
      }
    }
    
    console.log(`Sincronización bidireccional completada para paciente ${patientId}`);
    
  } catch (error) {
    console.error(`Error en sincronización bidireccional:`, error);
    throw error;
  }
}
```

## Casos de Error y Recuperación

### Error 1: Servidor FHIR No Disponible

```typescript
try {
  await clinicalRecordsService.syncPatientToFhir({
    patientId: '1',
    fhirServerId: 'Servidor Inaccesible'
  });
} catch (error) {
  if (error.message.includes('No se puede conectar')) {
    console.log('Servidor FHIR no disponible, reintentando en 5 minutos...');
    
    setTimeout(async () => {
      try {
        await clinicalRecordsService.syncPatientToFhir({
          patientId: '1',
          fhirServerId: 'Servidor Inaccesible'
        });
        console.log('Sincronización exitosa en reintento');
      } catch (retryError) {
        console.error('Fallo en reintento:', retryError);
      }
    }, 5 * 60 * 1000);
  }
}
```

### Error 2: Datos Incompletos

```typescript
async function validateAndSync(patientId: number) {
  // Validar datos del paciente antes de sincronizar
  const patient = await prisma.patients.findUnique({
    where: { ID_Patients: patientId }
  });
  
  if (!patient) {
    throw new Error(`Paciente ${patientId} no encontrado`);
  }
  
  // Validaciones específicas para FHIR
  const validationErrors = [];
  
  if (!patient.DNI) {
    validationErrors.push('DNI requerido para sincronización FHIR');
  }
  
  if (!patient.Name || !patient.Lastname) {
    validationErrors.push('Nombre completo requerido para sincronización FHIR');
  }
  
  if (!patient.gender) {
    validationErrors.push('Género requerido para sincronización FHIR');
  }
  
  if (validationErrors.length > 0) {
    console.warn(`Paciente ${patientId} tiene datos incompletos:`, validationErrors);
    return { success: false, errors: validationErrors };
  }
  
  // Proceder con sincronización
  try {
    const result = await clinicalRecordsService.syncPatientToFhir({
      patientId: patientId.toString(),
      fhirServerId: 'HAPI FHIR Local'
    });
    
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

## Testing con Jest

### Test de Sincronización de Paciente

```typescript
describe('FHIR Patient Sync', () => {
  let service: ClinicalRecordsService;
  let prisma: PrismaService;
  
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ClinicalRecordsService, PrismaService],
    }).compile();
    
    service = module.get<ClinicalRecordsService>(ClinicalRecordsService);
    prisma = module.get<PrismaService>(PrismaService);
  });
  
  it('should sync patient to FHIR successfully', async () => {
    // Arrange
    const mockPatient = {
      ID_Patients: 1,
      DNI: '12345678',
      Name: 'Test',
      Lastname: 'Patient',
      gender: 'MALE',
      Birthdate: new Date('1990-01-01'),
      phone_number: '+34123456789',
      email: 'test@example.com',
      address: 'Test Address'
    };
    
    jest.spyOn(prisma.patients, 'findUnique').mockResolvedValue(mockPatient);
    
    const syncDto = {
      patientId: '1',
      fhirServerId: 'test-server'
    };
    
    // Act
    const result = await service.syncPatientToFhir(syncDto);
    
    // Assert
    expect(result.resourceType).toBe('Patient');
    expect(result.id).toBe('1');
    expect(result.identifier[0].value).toBe('12345678');
    expect(result.name[0].given[0]).toBe('Test');
    expect(result.name[0].family).toBe('Patient');
    expect(result.gender).toBe('male');
  });
  
  it('should throw error when patient not found', async () => {
    // Arrange
    jest.spyOn(prisma.patients, 'findUnique').mockResolvedValue(null);
    
    const syncDto = {
      patientId: '999',
      fhirServerId: 'test-server'
    };
    
    // Act & Assert
    await expect(service.syncPatientToFhir(syncDto))
      .rejects
      .toThrow('Paciente con ID 999 no encontrado');
  });
});
```

### Test de Importación de Observación

```typescript
describe('FHIR Observation Import', () => {
  it('should import FHIR observation successfully', async () => {
    // Arrange
    const mockObservation = {
      resourceType: 'Observation',
      id: 'test-obs-1',
      status: 'final',
      code: {
        coding: [{
          system: 'http://loinc.org',
          code: '33747-0',
          display: 'Glucose'
        }]
      },
      valueQuantity: {
        value: 95,
        unit: 'mg/dL'
      },
      effectiveDateTime: '2024-01-15T08:00:00.000Z'
    };
    
    jest.spyOn(service as any, 'getFromFhirServer').mockResolvedValue(mockObservation);
    jest.spyOn(service, 'create').mockResolvedValue({ ID_Clinical_data: 1 });
    
    const importDto = {
      fhirObservationId: 'test-obs-1',
      patientId: '1',
      medicId: '1',
      adminId: '1'
    };
    
    // Act
    const result = await service.importObservationFromFhir(importDto);
    
    // Assert
    expect(result.ID_Clinical_data).toBe(1);
    expect(service.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'Glucose',
        code: '33747-0',
        value: '95',
        unit: 'mg/dL'
      })
    );
  });
});
```

## Métricas y Monitoreo

### Dashboard de Sincronización

```typescript
async function getFhirSyncMetrics() {
  const metrics = {
    totalRecords: 0,
    syncedRecords: 0,
    syncRate: 0,
    lastSyncDate: null,
    errorCount: 0,
    byResourceType: {}
  };
  
  // Total de registros
  metrics.totalRecords = await prisma.clinical_data.count();
  
  // Registros sincronizados
  metrics.syncedRecords = await prisma.clinical_data.count({
    where: {
      fhirData: { not: null }
    }
  });
  
  // Tasa de sincronización
  metrics.syncRate = (metrics.syncedRecords / metrics.totalRecords) * 100;
  
  // Última sincronización
  const lastSynced = await prisma.clinical_data.findFirst({
    where: { fhirData: { not: null } },
    orderBy: { create: 'desc' }
  });
  
  metrics.lastSyncDate = lastSynced?.create;
  
  // Distribución por tipo de recurso
  const recordsWithFhir = await prisma.clinical_data.findMany({
    where: { fhirData: { not: null } },
    select: { type: true, fhirData: true }
  });
  
  metrics.byResourceType = recordsWithFhir.reduce((acc, record) => {
    try {
      const fhirData = JSON.parse(record.fhirData as string);
      const resourceType = fhirData.resourceType || 'Unknown';
      acc[resourceType] = (acc[resourceType] || 0) + 1;
    } catch {
      acc['Invalid'] = (acc['Invalid'] || 0) + 1;
    }
    return acc;
  }, {});
  
  return metrics;
}

// Uso
const metrics = await getFhirSyncMetrics();
console.log('Métricas FHIR:', metrics);
```

## Conclusión

Estos ejemplos muestran cómo utilizar la integración FHIR en diferentes escenarios reales. La implementación proporciona flexibilidad para adaptarse a diversos casos de uso mientras mantiene la compatibilidad con el estándar FHIR R4.

Para casos de uso específicos no cubiertos en estos ejemplos, consulte la documentación técnica completa en `docs/fhir-integration.md`.