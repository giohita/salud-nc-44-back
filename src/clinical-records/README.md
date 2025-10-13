# Módulo de Historias Clínicas (Clinical Records)

Este módulo implementa la gestión de historias clínicas para el sistema de salud, proporcionando endpoints para crear, consultar y actualizar registros médicos.

## Endpoints Implementados

### 1. Crear Historia Clínica
- **Endpoint:** POST /records
- **Descripción:** Crea un nuevo registro clínico en el sistema
- **Payload Requerido:**
  ```json
  {
    "ID_Patients": number,
    "type": string,
    "code": string (opcional),
    "value": string (opcional),
    "unit": string (opcional),
    "severity": string (opcional),
    "effectiveDate": Date (opcional),
    "fhirData": JSON (opcional),
    "ID_medics": number,
    "create": number
  }
  ```

### 2. Obtener Historia Clínica
- **Endpoint:** GET /records/:id
- **Descripción:** Recupera un registro clínico específico por su ID
- **Parámetros:** id (número)

### 3. Actualizar Historia Clínica
- **Endpoint:** PUT /records/:id
- **Descripción:** Actualiza un registro clínico existente
- **Parámetros:** id (número)
- **Payload:** Similar al de creación, todos los campos son opcionales

## Características Implementadas

- Validación de datos usando class-validator
- Manejo de errores para registros no encontrados
- Integración con Prisma para la persistencia de datos
- Relaciones automáticas con pacientes, médicos y administradores
- Soporte para datos FHIR (Fast Healthcare Interoperability Resources)

## Estructura de Archivos

```
clinical-records/
├── dto/
│   ├── create-clinical-record.dto.ts
│   └── update-clinical-record.dto.ts
├── clinical-records.controller.ts
├── clinical-records.service.ts
├── clinical-records.module.ts
└── README.md
```

## Uso del Módulo

1. El módulo está integrado automáticamente en la aplicación a través del AppModule
2. Utiliza el servicio PrismaService para la persistencia de datos
3. Implementa validaciones automáticas de DTOs
4. Maneja automáticamente las relaciones con otras entidades del sistema

## Seguridad

- Todos los endpoints requieren autenticación (pendiente de implementar)
- Validación de datos en cada operación
- Manejo seguro de errores sin exposición de detalles sensibles