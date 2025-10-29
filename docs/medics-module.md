# Módulo de Médicos (Medics)

## Descripción General

El módulo de Médicos es responsable de la gestión y consulta de información médica en el sistema de salud. Proporciona funcionalidades avanzadas para listar, buscar, filtrar y obtener información detallada de los médicos, incluyendo sus especialidades, disponibilidad y estadísticas de citas.

## Arquitectura del Módulo

### Estructura de Archivos
```
src/medics/
├── medics.module.ts              # Configuración del módulo
├── medics.controller.ts          # Endpoints REST
├── medics.service.ts             # Lógica de negocio
└── dto/
    ├── index.ts                  # Exportaciones centralizadas
    ├── get-medics-query.dto.ts   # DTO para parámetros de consulta
    └── medic-response.dto.ts     # DTOs para respuestas
```

## Funcionalidades Principales

### 1. Gestión de Consultas de Médicos
- **Lista paginada con filtros avanzados**
- **Búsqueda por múltiples campos**
- **Ordenamiento personalizable**
- **Filtrado por especialidad y estado**

### 2. Información Detallada de Médicos
- **Datos completos del médico**
- **Estadísticas de citas**
- **Información administrativa**
- **Citas recientes**

### 3. Consultas Especializadas
- **Médicos disponibles para citas**
- **Lista de especialidades únicas**
- **Filtrado por disponibilidad de fecha**

### 4. Seguridad y Validación
- **Autenticación JWT requerida**
- **Validación automática de parámetros**
- **Manejo robusto de errores**
- **Logging completo de operaciones**

## Endpoints Implementados

### 1. Obtener Lista de Médicos
- **Endpoint:** `GET /medics`
- **Descripción:** Obtiene una lista paginada de médicos con filtros opcionales
- **Autenticación:** Requiere token JWT válido
- **Parámetros de Consulta:**

| Parámetro | Tipo | Requerido | Descripción | Valor por Defecto |
|-----------|------|-----------|-------------|-------------------|
| `page` | number | No | Número de página | 1 |
| `limit` | number | No | Elementos por página (máx: 100) | 10 |
| `search` | string | No | Búsqueda por nombre, apellido, DNI o email | - |
| `specialty` | string | No | Filtrar por especialidad médica | - |
| `isActive` | boolean | No | Filtrar por estado activo | - |
| `sortBy` | enum | No | Campo para ordenar | createdAt |
| `sortOrder` | enum | No | Orden (asc/desc) | desc |

**Campos de Ordenamiento Disponibles:**
- `Name` - Nombre del médico
- `Lastname` - Apellido del médico
- `DNI` - Documento de identidad
- `email` - Correo electrónico
- `specialty` - Especialidad médica
- `createdAt` - Fecha de creación
- `updatedAt` - Fecha de actualización

**Ejemplo de Request:**
```bash
GET /medics?page=1&limit=20&search=juan&specialty=Cardiología&isActive=true&sortBy=Name&sortOrder=asc
```

**Ejemplo de Response:**
```json
{
  "medics": [
    {
      "ID_medics": 1,
      "Name": "Juan",
      "Lastname": "Pérez",
      "DNI": "12345678",
      "email": "juan.perez@hospital.com",
      "Phone_number": "555-1234",
      "specialty": "Cardiología",
      "isActive": true,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z",
      "adminInfo": {
        "ID_admin": 1,
        "Name": "Admin",
        "Lastname": "Sistema"
      },
      "stats": {
        "totalAppointments": 150,
        "completedAppointments": 140,
        "cancelledAppointments": 10,
        "averageRating": 4.8
      },
      "recentAppointments": [
        {
          "ID_Appointments": 1,
          "Date_appointment": "2024-01-20",
          "Time_appointment": "09:00:00",
          "status": "SCHEDULED",
          "patientInfo": {
            "Name": "María",
            "Lastname": "González"
          }
        }
      ]
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 95,
    "itemsPerPage": 20,
    "hasNextPage": true,
    "hasPreviousPage": false
  },
  "filters": {
    "search": "juan",
    "specialty": "Cardiología",
    "isActive": true,
    "sortBy": "Name",
    "sortOrder": "asc"
  }
}
```

### 2. Obtener Médico por ID
- **Endpoint:** `GET /medics/:id`
- **Descripción:** Obtiene información detallada de un médico específico
- **Autenticación:** Requiere token JWT válido
- **Parámetros de Ruta:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `id` | number | ID único del médico |

**Ejemplo de Request:**
```bash
GET /medics/1
```

**Ejemplo de Response:**
```json
{
  "ID_medics": 1,
  "Name": "Juan",
  "Lastname": "Pérez",
  "DNI": "12345678",
  "email": "juan.perez@hospital.com",
  "Phone_number": "555-1234",
  "specialty": "Cardiología",
  "isActive": true,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z",
  "adminInfo": {
    "ID_admin": 1,
    "Name": "Admin",
    "Lastname": "Sistema",
    "email": "admin@hospital.com"
  },
  "stats": {
    "totalAppointments": 150,
    "completedAppointments": 140,
    "cancelledAppointments": 10,
    "averageRating": 4.8,
    "monthlyAppointments": 25,
    "weeklyAppointments": 6
  },
  "recentAppointments": [
    {
      "ID_Appointments": 1,
      "Date_appointment": "2024-01-20",
      "Time_appointment": "09:00:00",
      "status": "SCHEDULED",
      "patientInfo": {
        "ID_patient": 1,
        "Name": "María",
        "Lastname": "González",
        "DNI": "87654321"
      }
    }
  ]
}
```

### 3. Obtener Médicos Disponibles
- **Endpoint:** `GET /medics/available`
- **Descripción:** Obtiene lista de médicos activos disponibles para citas
- **Autenticación:** Requiere token JWT válido
- **Parámetros de Consulta:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `date` | string | No | Fecha para verificar disponibilidad (YYYY-MM-DD) |

**Ejemplo de Request:**
```bash
GET /medics/available?date=2024-01-25
```

**Ejemplo de Response:**
```json
[
  {
    "ID_medics": 1,
    "Name": "Juan",
    "Lastname": "Pérez",
    "specialty": "Cardiología",
    "email": "juan.perez@hospital.com",
    "Phone_number": "555-1234",
    "availableSlots": 8,
    "nextAvailableTime": "09:00:00"
  },
  {
    "ID_medics": 2,
    "Name": "Ana",
    "Lastname": "Martínez",
    "specialty": "Pediatría",
    "email": "ana.martinez@hospital.com",
    "Phone_number": "555-5678",
    "availableSlots": 12,
    "nextAvailableTime": "08:30:00"
  }
]
```

### 4. Obtener Especialidades Médicas
- **Endpoint:** `GET /medics/specialties`
- **Descripción:** Obtiene lista de especialidades médicas únicas en el sistema
- **Autenticación:** Requiere token JWT válido

**Ejemplo de Request:**
```bash
GET /medics/specialties
```

**Ejemplo de Response:**
```json
{
  "specialties": [
    "Cardiología",
    "Pediatría",
    "Neurología",
    "Dermatología",
    "Ginecología",
    "Traumatología",
    "Psiquiatría",
    "Oftalmología"
  ],
  "total": 8
}
```

## DTOs (Data Transfer Objects)

### GetMedicsQueryDto
Valida y transforma los parámetros de consulta para el endpoint de lista de médicos.

```typescript
export class GetMedicsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  @MinLength(2)
  search?: string;

  @IsOptional()
  @IsString()
  specialty?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(SortByField)
  sortBy?: SortByField = SortByField.CREATED_AT;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;
}
```

### MedicResponseDto
Estructura la respuesta de información detallada de un médico.

```typescript
export class MedicResponseDto {
  ID_medics: number;
  Name: string;
  Lastname: string;
  DNI: string;
  email: string;
  Phone_number: string;
  specialty: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  adminInfo?: AdminInfoDto;
  stats?: MedicStatsDto;
  recentAppointments?: AppointmentInfoDto[];
}
```

## Servicios Implementados

### MedicsService

#### Métodos Principales:

1. **`findAll(query: GetMedicsQueryDto)`**
   - Obtiene lista paginada de médicos con filtros
   - Implementa búsqueda por múltiples campos
   - Soporte para ordenamiento y paginación

2. **`findOne(id: number)`**
   - Obtiene médico específico por ID
   - Incluye información relacionada (admin, estadísticas, citas)
   - Manejo de errores para médico no encontrado

3. **`findAvailable(date?: string)`**
   - Obtiene médicos disponibles para citas
   - Filtrado opcional por fecha específica
   - Cálculo de slots disponibles

4. **`getSpecialties()`**
   - Obtiene especialidades únicas del sistema
   - Optimizado para consultas rápidas

## Manejo de Errores

### Errores Comunes y Respuestas:

1. **Médico no encontrado (404)**
```json
{
  "statusCode": 404,
  "message": "Médico con ID 999 no encontrado",
  "error": "Not Found"
}
```

2. **Parámetros inválidos (400)**
```json
{
  "statusCode": 400,
  "message": [
    "page must be a positive number",
    "limit must not be greater than 100"
  ],
  "error": "Bad Request"
}
```

3. **Token JWT inválido (401)**
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

## Logging y Monitoreo

### Eventos Registrados:
- Consultas de lista de médicos con parámetros
- Búsquedas por ID específico
- Consultas de disponibilidad
- Errores y excepciones

### Formato de Logs:
```
[MedicsController] GET /medics - Parámetros: {"page":1,"limit":10,"search":"juan"}
[MedicsController] GET /medics/1
[MedicsController] GET /medics/available - Fecha: 2024-01-25
[MedicsService] Médico con ID 999 no encontrado
```

## Integración con Otros Módulos

### Dependencias:
- **PrismaModule**: Acceso a base de datos
- **AuthModule**: Autenticación JWT

### Módulos que lo Utilizan:
- **AppointmentsModule**: Para validar médicos en citas
- **TeleconsultationModule**: Para teleconsultas médicas
- **AdminModule**: Para gestión administrativa

## Configuración y Deployment

### Variables de Entorno:
No requiere variables específicas adicionales.

### Base de Datos:
Utiliza las siguientes tablas de Prisma:
- `medics` - Información principal de médicos
- `admin` - Información de administradores
- `Appointments` - Citas médicas
- `patient` - Información de pacientes

## Seguridad

### Medidas Implementadas:
1. **Autenticación JWT obligatoria** en todos los endpoints
2. **Validación automática** de parámetros de entrada
3. **Exclusión de campos sensibles** en respuestas
4. **Logging de accesos** para auditoría
5. **Límites de paginación** para prevenir sobrecarga

### Consideraciones de Seguridad:
- No se exponen contraseñas ni datos sensibles
- Validación estricta de tipos de datos
- Manejo seguro de errores sin exposición de información interna

## Testing

### Cobertura de Pruebas:
El módulo está cubierto por las pruebas E2E del sistema:
- `test/medics.e2e-spec.ts` (cuando se implemente)
- Integración en `test/workflows.e2e-spec.ts`

### Casos de Prueba Recomendados:
1. Lista de médicos con diferentes filtros
2. Búsqueda por ID existente y no existente
3. Consulta de médicos disponibles
4. Validación de parámetros inválidos
5. Autenticación y autorización

## Mejores Prácticas Implementadas

1. **Separación de Responsabilidades**: Controlador, servicio y DTOs separados
2. **Validación Robusta**: Class-validator para todos los inputs
3. **Documentación Swagger**: API completamente documentada
4. **Manejo de Errores**: Respuestas consistentes y descriptivas
5. **Logging Estructurado**: Trazabilidad completa de operaciones
6. **Paginación Eficiente**: Límites y optimización de consultas
7. **Tipado Fuerte**: TypeScript en toda la implementación

## Próximas Mejoras

### Funcionalidades Sugeridas:
1. **Cache de consultas frecuentes** (Redis)
2. **Filtros avanzados** (rango de fechas, múltiples especialidades)
3. **Exportación de datos** (CSV, Excel)
4. **Métricas de rendimiento** detalladas
5. **Notificaciones** de cambios de disponibilidad
6. **API de búsqueda** con Elasticsearch

### Optimizaciones:
1. **Índices de base de datos** para consultas frecuentes
2. **Paginación cursor-based** para grandes datasets
3. **Compresión de respuestas** para mejorar performance
4. **Rate limiting** para prevenir abuso

---

## Conclusión

El módulo de Médicos proporciona una API robusta y completa para la gestión de información médica en el sistema de salud. Implementa las mejores prácticas de desarrollo backend con seguridad, validación, documentación y manejo de errores de nivel empresarial.

Para más información sobre la implementación técnica, consulte los archivos de código fuente en `src/medics/` y las pruebas E2E en `test/`.