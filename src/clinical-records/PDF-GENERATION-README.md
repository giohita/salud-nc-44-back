# Funcionalidad de Generación de PDF - Clinical Records

## Descripción General

Este README explica el flujo y la implementación de la funcionalidad de generación de PDF para registros clínicos en el módulo `clinical-records`. Esta característica permite generar reportes profesionales en formato PDF de las historias clínicas almacenadas en el sistema.

## Flujo de Funcionamiento

### 1. Solicitud de Descarga
```
Cliente → GET /records/:id/download → Controlador → Servicio → PDF → Respuesta
```

### 2. Proceso Detallado

#### Paso 1: Recepción de la Solicitud
- El cliente realiza una petición GET al endpoint `/records/:id/download`
- El controlador recibe el parámetro `id` del registro clínico
- Se valida que el `id` sea un número entero válido usando `ParseIntPipe`

#### Paso 2: Validación y Consulta de Datos
```typescript
// En ClinicalRecordsService.generateDownloadableRecord()
const record = await this.prisma.clinical_data.findUnique({
  where: { ID_Clinical_data: id },
  include: {
    patient: true,
    medic: true,
    admin: true,
  },
});
```

#### Paso 3: Generación del PDF
- Se crea una instancia de `PDFDocument` con configuración específica
- Se estructura el contenido del documento con secciones organizadas
- Se aplican estilos y formateo profesional

#### Paso 4: Respuesta al Cliente
- Se configuran los headers HTTP apropiados
- Se envía el buffer del PDF como respuesta
- El archivo se descarga automáticamente en el navegador

## Implementación Técnica

### Arquitectura del Código

```
clinical-records.controller.ts
├── @Get(':id/download')
├── download(@Param('id', ParseIntPipe) id: number, @Res() res: Response)
└── → clinicalRecordsService.generateDownloadableRecord(id)

clinical-records.service.ts
├── generateDownloadableRecord(id: number)
├── → Validación de existencia del registro
├── → Consulta de datos con relaciones
├── → Generación del PDF con PDFKit
└── → Retorno de buffer y nombre de archivo
```

### Dependencias Utilizadas

#### PDFKit
```typescript
import PDFDocument from 'pdfkit';

// Configuración del documento
const doc = new PDFDocument({ 
  margin: 50,
  size: 'A4',
  info: {
    Title: 'Registro Clínico',
    Author: 'Sistema de Salud NC-44',
    Subject: 'Historia Clínica',
    Creator: 'Clinical Records Module'
  }
});
```

#### date-fns
```typescript
import { format } from 'date-fns';

// Formateo de fechas
const formattedDate = format(new Date(record.effectiveDate), 'dd/MM/yyyy HH:mm');
const fileName = `registro_clinico_${id}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
```

### Estructura del PDF Generado

#### Secciones del Documento
1. **Encabezado Principal**
   - Título: "REGISTRO CLÍNICO"
   - Tamaño de fuente: 20pt
   - Alineación: Centro

2. **Información del Paciente**
   - Nombre completo del paciente
   - ID del paciente
   - Fuente: 16pt para título, 12pt para contenido

3. **Información del Médico**
   - Nombre completo del médico
   - ID del médico
   - Fuente: 16pt para título, 12pt para contenido

4. **Detalles del Registro Clínico**
   - Tipo de registro
   - Código médico
   - Valor del registro
   - Unidad de medida
   - Nivel de severidad
   - Fecha efectiva (formato dd/MM/yyyy HH:mm)

5. **Información de Creación**
   - Nombre del administrador que creó el registro
   - ID de creación

6. **Pie de Página**
   - Fecha y hora de generación del documento
   - Advertencia de confidencialidad médica

### Manejo de Errores

#### Tipos de Errores Manejados
```typescript
// Registro no encontrado
if (!record) {
  throw new NotFoundException(`No se encontró el registro clínico con ID ${id}`);
}

// Error en generación de PDF
catch (error) {
  this.logger.error(`Error al generar archivo descargable: ${error.message}`, error.stack);
  
  if (error instanceof NotFoundException) {
    throw error;
  }
  
  throw new InternalServerErrorException(
    'Error al generar el archivo descargable. Por favor, intenta nuevamente.',
  );
}
```

#### Logging y Auditoría
```typescript
// Logging de operaciones
this.logger.log(`Generando archivo descargable para registro clínico con ID ${id}`);

// Logging de errores
this.logger.error(`Error al generar archivo descargable: ${error.message}`, error.stack);
```

## Configuración de Headers HTTP

### Headers de Respuesta
```typescript
res.set({
  'Content-Type': 'application/pdf',
  'Content-Disposition': `attachment; filename="${fileName}"`,
});
```

### Explicación de Headers
- **Content-Type**: Especifica que el contenido es un archivo PDF
- **Content-Disposition**: Indica que el archivo debe descargarse con un nombre específico

## Casos de Uso

### Caso de Uso 1: Descarga Exitosa
```bash
# Solicitud
curl -X GET http://localhost:3000/records/1/download -o registro.pdf

# Respuesta
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: attachment; filename="registro_clinico_1_20240115_103000.pdf"
Content-Length: 15234

[Binary PDF Data]
```

### Caso de Uso 2: Registro No Encontrado
```bash
# Solicitud
curl -X GET http://localhost:3000/records/999/download

# Respuesta
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "statusCode": 404,
  "message": "No se encontró el registro clínico con ID 999",
  "error": "Not Found"
}
```

### Caso de Uso 3: Error del Servidor
```bash
# Respuesta en caso de error interno
HTTP/1.1 500 Internal Server Error
Content-Type: application/json

{
  "statusCode": 500,
  "message": "Error al generar el archivo descargable. Por favor, intenta nuevamente.",
  "error": "Internal Server Error"
}
```

## Consideraciones de Seguridad

### Validación de Entrada
- Validación del parámetro `id` como número entero
- Verificación de existencia del registro antes de procesar

### Protección de Datos
- Información médica confidencial incluida en el PDF
- Advertencias de confidencialidad en el documento
- Logging de accesos para auditoría

### Control de Recursos
- Manejo eficiente de memoria con buffers
- Cleanup automático de recursos PDF
- Control de errores para evitar memory leaks

## Optimizaciones y Mejores Prácticas

### Performance
```typescript
// Uso eficiente de buffers
const pdfBuffer = await new Promise<Buffer>((resolve) => {
  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  doc.on('end', () => resolve(Buffer.concat(chunks)));
  // ... generación del contenido
  doc.end();
});
```

### Manejo de Memoria
- Uso de streams para archivos grandes
- Liberación automática de recursos
- Control de tamaño de buffer

### Escalabilidad
- Generación asíncrona de PDF
- Posibilidad de implementar cache de PDFs frecuentes
- Preparado para procesamiento en background

## Extensiones Futuras

### Mejoras Planificadas
1. **Plantillas Personalizables**
   - Diferentes formatos según tipo de registro
   - Logos y branding personalizable

2. **Múltiples Formatos**
   - Exportación a Word/Excel
   - Formatos de intercambio médico (HL7, FHIR)

3. **Batch Processing**
   - Generación de múltiples PDFs
   - Reportes consolidados por paciente

4. **Firma Digital**
   - Firma electrónica de médicos
   - Certificados de autenticidad

### Configuración Avanzada
```typescript
// Configuración futura para plantillas
interface PDFTemplate {
  headerLogo?: string;
  footerText?: string;
  colorScheme?: 'default' | 'hospital' | 'clinic';
  language?: 'es' | 'en';
}
```

## Testing

### Casos de Prueba
```typescript
describe('PDF Generation', () => {
  it('should generate PDF for valid record ID', async () => {
    const result = await service.generateDownloadableRecord(1);
    expect(result.fileBuffer).toBeDefined();
    expect(result.fileName).toMatch(/registro_clinico_1_\d{8}_\d{6}\.pdf/);
  });

  it('should throw NotFoundException for invalid ID', async () => {
    await expect(service.generateDownloadableRecord(999))
      .rejects.toThrow(NotFoundException);
  });
});
```

### Comandos de Testing
```bash
# Ejecutar tests específicos de PDF
npm run test -- --testNamePattern="PDF"

# Test de integración
npm run test:e2e -- --grep "download"
```

---

## Resumen

La funcionalidad de generación de PDF en el módulo clinical-records proporciona una solución robusta y profesional para la exportación de registros clínicos. La implementación utiliza las mejores prácticas de NestJS, manejo eficiente de recursos, y genera documentos con formato médico profesional.

**Características Clave:**
- ✅ Generación automática de PDF profesional
- ✅ Información completa del registro clínico
- ✅ Manejo robusto de errores
- ✅ Logging y auditoría completa
- ✅ Headers HTTP apropiados
- ✅ Nombres de archivo únicos
- ✅ Advertencias de confidencialidad
- ✅ Escalable y mantenible

Esta implementación está lista para producción y cumple con los estándares de seguridad y privacidad médica requeridos.