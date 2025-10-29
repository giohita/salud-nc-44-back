# Sistema de Pruebas End-to-End (E2E) - Portal de Salud NC-44

## 📋 Descripción General

Este sistema de pruebas E2E está diseñado para validar de manera integral todas las funcionalidades del Portal Web de Coordinación de Citas y Teleasistencia. Las pruebas cubren desde operaciones básicas hasta flujos de trabajo completos, asegurando que el sistema funcione correctamente en escenarios reales.

## 🏗️ Arquitectura del Sistema de Pruebas

### Estructura de Archivos

```
test/
├── README.md                    # Este archivo
├── jest-e2e.json              # Configuración de Jest para E2E
├── setup-e2e.ts               # Configuración inicial de pruebas
├── test-utils.ts               # Utilidades y helpers para pruebas
├── database-setup.ts           # Configuración de base de datos de pruebas
├── run-e2e-tests.js           # Script principal para ejecutar pruebas
├── scripts/
│   └── test-db-setup.js       # Scripts de gestión de BD de pruebas
├── coverage/                   # Reportes de cobertura (generado)
├── e2e-test-results.log       # Logs de ejecución (generado)
└── Archivos de pruebas:
    ├── auth.e2e-spec.ts        # Pruebas de autenticación
    ├── users.e2e-spec.ts       # Pruebas de gestión de usuarios
    ├── appointments.e2e-spec.ts # Pruebas de citas médicas
    ├── clinical-records.e2e-spec.ts # Pruebas de registros clínicos
    ├── teleconsultations.e2e-spec.ts # Pruebas de teleconsultas
    ├── admin.e2e-spec.ts       # Pruebas administrativas
    └── workflows.e2e-spec.ts   # Pruebas de flujos completos
```

## 🚀 Configuración Inicial

### Prerrequisitos

1. **Node.js** (versión 16 o superior)
2. **Base de datos** configurada (PostgreSQL, MySQL o SQLite)
3. **Variables de entorno** configuradas:

```bash
# .env.test
NODE_ENV=test
DATABASE_URL="postgresql://user:password@localhost:5432/salud_nc_44_test"
JWT_SECRET="test-jwt-secret-key"
JWT_REFRESH_SECRET="test-refresh-secret-key"
```

### Instalación

```bash
# Instalar dependencias
npm install

# Configurar base de datos de pruebas
npm run test:db:setup

# Verificar configuración
npm run test:db:status
```

## 🧪 Tipos de Pruebas

### 1. Pruebas de Módulos Individuales

#### **Autenticación (`auth.e2e-spec.ts`)**
- Login con diferentes tipos de usuario (admin, médico, paciente)
- Validación de credenciales
- Manejo de tokens JWT y refresh tokens
- Protección de endpoints

#### **Gestión de Usuarios (`users.e2e-spec.ts`)**
- Creación de usuarios (admin, médicos, pacientes)
- Validaciones de campos y formatos
- Control de acceso por roles
- Manejo de datos duplicados

#### **Citas Médicas (`appointments.e2e-spec.ts`)**
- Creación y gestión de citas
- Validación de disponibilidad
- Estados de citas (programada, confirmada, completada, cancelada)
- Filtros y paginación

#### **Registros Clínicos (`clinical-records.e2e-spec.ts`)**
- Creación de historiales médicos
- Integración con FHIR
- Control de acceso a registros
- Sincronización de datos

#### **Teleconsultas (`teleconsultations.e2e-spec.ts`)**
- Iniciación de sesiones virtuales
- Integración WebRTC
- Manejo de señalización
- Estados de teleconsulta

#### **Administración (`admin.e2e-spec.ts`)**
- Dashboard administrativo
- Gestión de usuarios
- Reportes y estadísticas
- Backup y salud del sistema

### 2. Pruebas de Flujos Completos (`workflows.e2e-spec.ts`)

#### **Flujo de Atención Médica Completo**
1. Paciente agenda cita
2. Médico confirma cita
3. Realización de consulta
4. Creación de registro clínico
5. Finalización del proceso

#### **Flujo de Teleconsulta**
1. Agendamiento de cita virtual
2. Iniciación de teleconsulta
3. Conexión WebRTC
4. Intercambio de datos
5. Finalización y registro

#### **Flujo Administrativo**
1. Gestión de usuarios
2. Generación de reportes
3. Backup del sistema
4. Monitoreo de salud

## 🛠️ Ejecución de Pruebas

### Comandos Principales

```bash
# Ejecutar todas las pruebas E2E
npm run test:e2e:all

# Ejecutar con cobertura de código
npm run test:e2e:coverage

# Pruebas rápidas (smoke tests)
npm run test:e2e:smoke

# Pruebas de rendimiento
npm run test:e2e:performance
```

### Pruebas por Módulo

```bash
# Autenticación
npm run test:e2e:auth

# Usuarios
npm run test:e2e:users

# Citas médicas
npm run test:e2e:appointments

# Registros clínicos
npm run test:e2e:clinical-records

# Teleconsultas
npm run test:e2e:teleconsultations

# Administración
npm run test:e2e:admin

# Flujos completos
npm run test:e2e:workflows
```

### Gestión de Base de Datos

```bash
# Configurar BD de pruebas
npm run test:db:setup

# Limpiar datos de prueba
npm run test:db:cleanup

# Resetear BD completamente
npm run test:db:reset

# Verificar estado
npm run test:db:status
```

## 🔧 Configuración Avanzada

### Opciones del Script Principal

```bash
# Ejecutar con opciones específicas
node test/run-e2e-tests.js all --coverage --verbose --timeout 120000

# Opciones disponibles:
--coverage     # Genera reporte de cobertura
--verbose      # Salida detallada
--parallel     # Ejecución en paralelo (solo para 'all')
--timeout <ms> # Timeout personalizado
--bail         # Detiene en el primer fallo
```

### Configuración de Jest (`jest-e2e.json`)

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  "moduleNameMapping": {
    "^src/(.*)$": "<rootDir>/../src/$1"
  },
  "setupFilesAfterEnv": ["<rootDir>/setup-e2e.ts"],
  "testTimeout": 60000,
  "collectCoverageFrom": [
    "../src/**/*.(t|j)s",
    "!../src/**/*.spec.ts",
    "!../src/**/*.interface.ts"
  ],
  "coverageDirectory": "./coverage",
  "coverageReporters": ["text", "lcov", "html"],
  "verbose": true,
  "detectOpenHandles": true,
  "forceExit": true
}
```

## 📊 Utilidades y Helpers

### TestApp Class
Maneja la inicialización y cierre de la aplicación de pruebas:

```typescript
const testApp = new TestApp();
await testApp.initialize();
// ... ejecutar pruebas
await testApp.close();
```

### AuthTestUtils
Utilidades para autenticación en pruebas:

```typescript
// Crear y loguear usuarios
const { token, dni } = await AuthTestUtils.createAndLoginAdmin(app, prisma);
const { token, dni } = await AuthTestUtils.createAndLoginMedic(app, prisma);
const { token, dni } = await AuthTestUtils.createAndLoginPatient(app, prisma);
```

### TestValidationUtils
Validaciones comunes para respuestas:

```typescript
TestValidationUtils.expectSuccess(response, 200);
TestValidationUtils.expectValidationError(response, 'fieldName');
TestValidationUtils.expectUnauthorized(response);
```

### TestCleanupUtils
Limpieza de datos entre pruebas:

```typescript
await TestCleanupUtils.cleanupAll(prisma);
await TestCleanupUtils.createMultipleTestAppointments(prisma, medicDni, patientDni, 5);
```

## 🔍 Casos de Prueba Cubiertos

### Funcionalidades Básicas
- ✅ Autenticación y autorización
- ✅ CRUD de usuarios
- ✅ Gestión de citas médicas
- ✅ Registros clínicos
- ✅ Teleconsultas y WebRTC

### Casos Edge y Manejo de Errores
- ✅ Validación de datos de entrada
- ✅ Manejo de errores de red
- ✅ Timeouts y reconexiones
- ✅ Datos corruptos o malformados
- ✅ Límites de recursos

### Seguridad
- ✅ Control de acceso por roles
- ✅ Validación de tokens JWT
- ✅ Protección contra ataques comunes
- ✅ Encriptación de datos sensibles

### Rendimiento
- ✅ Operaciones concurrentes
- ✅ Carga de múltiples usuarios
- ✅ Timeouts de respuesta
- ✅ Uso de memoria y recursos

### Integración
- ✅ Integración FHIR
- ✅ WebRTC para teleconsultas
- ✅ Base de datos
- ✅ Servicios externos

## 📈 Reportes y Métricas

### Cobertura de Código
Los reportes de cobertura se generan en `test/coverage/` e incluyen:
- Cobertura por líneas
- Cobertura por funciones
- Cobertura por ramas
- Reportes HTML interactivos

### Logs de Ejecución
Los logs se guardan en `test/e2e-test-results.log` con:
- Timestamp de ejecución
- Resultados por módulo
- Errores y fallos detallados
- Métricas de rendimiento

## 🚨 Solución de Problemas

### Problemas Comunes

#### Error de Conexión a Base de Datos
```bash
# Verificar configuración
npm run test:db:status

# Recrear base de datos
npm run test:db:reset
```

#### Timeouts en Pruebas
```bash
# Aumentar timeout
node test/run-e2e-tests.js all --timeout 120000
```

#### Fallos de Memoria
```bash
# Ejecutar secuencialmente
node test/run-e2e-tests.js all --bail
```

#### Conflictos de Puerto
```bash
# Verificar puertos en uso
netstat -an | findstr :3000
```

### Debugging

```bash
# Ejecutar con debug
npm run test:debug

# Logs verbosos
npm run test:e2e:all -- --verbose

# Ejecutar solo una prueba específica
npx jest --config=test/jest-e2e.json test/auth.e2e-spec.ts --testNamePattern="login"
```

## 🔄 Integración Continua

### GitHub Actions / CI/CD

```yaml
# Ejemplo de configuración para CI
- name: Run E2E Tests
  run: |
    npm run test:db:setup
    npm run test:e2e:smoke
    npm run test:e2e:all
    npm run test:db:cleanup
```

### Pre-commit Hooks

```bash
# Ejecutar smoke tests antes de commit
npm run test:e2e:smoke
```

## 📚 Mejores Prácticas

### Escritura de Pruebas
1. **Aislamiento**: Cada prueba debe ser independiente
2. **Limpieza**: Limpiar datos entre pruebas
3. **Descriptivo**: Nombres claros y descriptivos
4. **Aserciones**: Verificaciones específicas y completas

### Mantenimiento
1. **Actualización**: Mantener pruebas actualizadas con cambios de código
2. **Refactoring**: Reutilizar utilidades comunes
3. **Documentación**: Documentar casos especiales
4. **Monitoreo**: Revisar fallos y métricas regularmente

### Rendimiento
1. **Paralelización**: Usar cuando sea posible
2. **Datos mínimos**: Crear solo los datos necesarios
3. **Cleanup**: Limpiar recursos después de cada prueba
4. **Timeouts**: Configurar timeouts apropiados

## 🤝 Contribución

Para agregar nuevas pruebas:

1. Crear archivo `nuevo-modulo.e2e-spec.ts`
2. Seguir la estructura existente
3. Usar utilidades comunes de `test-utils.ts`
4. Agregar script en `package.json`
5. Documentar en este README

## 📞 Soporte

Para problemas o preguntas sobre las pruebas E2E:
- Revisar logs en `test/e2e-test-results.log`
- Verificar configuración de base de datos
- Consultar documentación de Jest
- Revisar issues conocidos en el proyecto