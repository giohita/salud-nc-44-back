#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Script para ejecutar pruebas E2E del sistema de salud
 * Soporta diferentes modos de ejecución y configuraciones
 */

class E2ETestRunner {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.testDir = __dirname;
    this.logFile = path.join(this.testDir, 'e2e-test-results.log');
    this.coverageDir = path.join(this.testDir, 'coverage');
  }

  /**
   * Ejecuta comando con logging
   */
  executeCommand(command, options = {}) {
    console.log(`🔄 Ejecutando: ${command}`);
    
    try {
      const result = execSync(command, {
        cwd: this.projectRoot,
        stdio: 'pipe',
        encoding: 'utf8',
        ...options
      });
      
      console.log(`✅ Comando completado exitosamente`);
      return { success: true, output: result };
    } catch (error) {
      console.error(`❌ Error ejecutando comando: ${error.message}`);
      return { success: false, error: error.message, output: error.stdout };
    }
  }

  /**
   * Prepara el entorno para las pruebas
   */
  async setupEnvironment() {
    console.log('🚀 Preparando entorno de pruebas...');

    // Verificar que existe la base de datos de pruebas
    const dbSetupResult = this.executeCommand('node test/scripts/test-db-setup.js setup');
    if (!dbSetupResult.success) {
      console.error('❌ Error configurando base de datos de pruebas');
      return false;
    }

    // Limpiar logs anteriores
    if (fs.existsSync(this.logFile)) {
      fs.unlinkSync(this.logFile);
    }

    // Crear directorio de coverage si no existe
    if (!fs.existsSync(this.coverageDir)) {
      fs.mkdirSync(this.coverageDir, { recursive: true });
    }

    console.log('✅ Entorno preparado correctamente');
    return true;
  }

  /**
   * Ejecuta todas las pruebas E2E
   */
  async runAllTests(options = {}) {
    const {
      coverage = false,
      verbose = false,
      parallel = false,
      timeout = 60000,
      bail = false
    } = options;

    console.log('🧪 Iniciando ejecución de pruebas E2E...');

    let jestCommand = 'npx jest --config=test/jest-e2e.json';
    
    if (coverage) {
      jestCommand += ' --coverage --coverageDirectory=test/coverage';
    }
    
    if (verbose) {
      jestCommand += ' --verbose';
    }
    
    if (parallel && !bail) {
      jestCommand += ' --maxWorkers=4';
    } else {
      jestCommand += ' --runInBand'; // Secuencial para evitar conflictos de DB
    }
    
    if (bail) {
      jestCommand += ' --bail';
    }
    
    jestCommand += ` --testTimeout=${timeout}`;

    const result = this.executeCommand(jestCommand);
    
    if (result.success) {
      console.log('✅ Todas las pruebas E2E completadas exitosamente');
      this.generateSummaryReport(result.output);
    } else {
      console.error('❌ Algunas pruebas E2E fallaron');
      this.logFailures(result.output);
    }

    return result.success;
  }

  /**
   * Ejecuta pruebas específicas por módulo
   */
  async runModuleTests(module, options = {}) {
    const moduleFiles = {
      'auth': 'auth.e2e-spec.ts',
      'users': 'users.e2e-spec.ts',
      'appointments': 'appointments.e2e-spec.ts',
      'clinical-records': 'clinical-records.e2e-spec.ts',
      'teleconsultations': 'teleconsultations.e2e-spec.ts',
      'admin': 'admin.e2e-spec.ts',
      'workflows': 'workflows.e2e-spec.ts'
    };

    const testFile = moduleFiles[module];
    if (!testFile) {
      console.error(`❌ Módulo '${module}' no encontrado. Módulos disponibles: ${Object.keys(moduleFiles).join(', ')}`);
      return false;
    }

    console.log(`🧪 Ejecutando pruebas del módulo: ${module}`);

    let jestCommand = `npx jest --config=test/jest-e2e.json test/${testFile}`;
    
    if (options.coverage) {
      jestCommand += ' --coverage --coverageDirectory=test/coverage';
    }
    
    if (options.verbose) {
      jestCommand += ' --verbose';
    }

    jestCommand += ' --runInBand'; // Siempre secuencial para módulos individuales

    const result = this.executeCommand(jestCommand);
    
    if (result.success) {
      console.log(`✅ Pruebas del módulo ${module} completadas exitosamente`);
    } else {
      console.error(`❌ Pruebas del módulo ${module} fallaron`);
    }

    return result.success;
  }

  /**
   * Ejecuta pruebas de smoke (básicas)
   */
  async runSmokeTests() {
    console.log('💨 Ejecutando pruebas de smoke...');

    const smokeTests = [
      'test/auth.e2e-spec.ts --testNamePattern="debería hacer login exitoso"',
      'test/users.e2e-spec.ts --testNamePattern="debería crear administrador"',
      'test/appointments.e2e-spec.ts --testNamePattern="debería crear cita como paciente"',
      'test/admin.e2e-spec.ts --testNamePattern="debería obtener estadísticas del dashboard"'
    ];

    let allPassed = true;

    for (const test of smokeTests) {
      const command = `npx jest --config=test/jest-e2e.json ${test} --runInBand`;
      const result = this.executeCommand(command);
      
      if (!result.success) {
        allPassed = false;
        console.error(`❌ Smoke test falló: ${test}`);
      } else {
        console.log(`✅ Smoke test pasó: ${test}`);
      }
    }

    if (allPassed) {
      console.log('✅ Todas las pruebas de smoke pasaron');
    } else {
      console.error('❌ Algunas pruebas de smoke fallaron');
    }

    return allPassed;
  }

  /**
   * Ejecuta pruebas de rendimiento
   */
  async runPerformanceTests() {
    console.log('⚡ Ejecutando pruebas de rendimiento...');

    const performanceCommand = `npx jest --config=test/jest-e2e.json --testNamePattern="Rendimiento|rendimiento|Performance|performance" --runInBand`;
    
    const result = this.executeCommand(performanceCommand);
    
    if (result.success) {
      console.log('✅ Pruebas de rendimiento completadas');
    } else {
      console.error('❌ Pruebas de rendimiento fallaron');
    }

    return result.success;
  }

  /**
   * Limpia el entorno después de las pruebas
   */
  async cleanup() {
    console.log('🧹 Limpiando entorno de pruebas...');

    const cleanupResult = this.executeCommand('node test/scripts/test-db-setup.js cleanup');
    
    if (cleanupResult.success) {
      console.log('✅ Limpieza completada');
    } else {
      console.error('❌ Error en limpieza');
    }

    return cleanupResult.success;
  }

  /**
   * Genera reporte de resumen
   */
  generateSummaryReport(output) {
    const timestamp = new Date().toISOString();
    const report = `
=== REPORTE DE PRUEBAS E2E ===
Fecha: ${timestamp}
Estado: EXITOSO

${output}

=== FIN DEL REPORTE ===
`;

    fs.writeFileSync(this.logFile, report);
    console.log(`📊 Reporte guardado en: ${this.logFile}`);
  }

  /**
   * Registra fallos
   */
  logFailures(output) {
    const timestamp = new Date().toISOString();
    const report = `
=== REPORTE DE FALLOS E2E ===
Fecha: ${timestamp}
Estado: FALLIDO

${output}

=== FIN DEL REPORTE ===
`;

    fs.writeFileSync(this.logFile, report);
    console.log(`📊 Reporte de fallos guardado en: ${this.logFile}`);
  }

  /**
   * Muestra ayuda
   */
  showHelp() {
    console.log(`
🏥 Sistema de Pruebas E2E - Portal de Salud NC-44

USO:
  node test/run-e2e-tests.js [comando] [opciones]

COMANDOS:
  all                    Ejecuta todas las pruebas E2E
  module <nombre>        Ejecuta pruebas de un módulo específico
  smoke                  Ejecuta pruebas de smoke (básicas)
  performance           Ejecuta pruebas de rendimiento
  setup                 Solo configura el entorno
  cleanup               Solo limpia el entorno
  help                  Muestra esta ayuda

MÓDULOS DISPONIBLES:
  auth                  Pruebas de autenticación
  users                 Pruebas de gestión de usuarios
  appointments          Pruebas de citas médicas
  clinical-records      Pruebas de registros clínicos
  teleconsultations     Pruebas de teleconsultas
  admin                 Pruebas administrativas
  workflows             Pruebas de flujos completos

OPCIONES:
  --coverage            Genera reporte de cobertura
  --verbose             Salida detallada
  --parallel            Ejecuta pruebas en paralelo (solo para 'all')
  --timeout <ms>        Timeout personalizado (default: 60000)
  --bail                Detiene en el primer fallo

EJEMPLOS:
  node test/run-e2e-tests.js all --coverage --verbose
  node test/run-e2e-tests.js module auth --verbose
  node test/run-e2e-tests.js smoke
  node test/run-e2e-tests.js performance
  node test/run-e2e-tests.js setup
  node test/run-e2e-tests.js cleanup

VARIABLES DE ENTORNO:
  TEST_DATABASE_URL     URL de la base de datos de pruebas
  NODE_ENV              Debe ser 'test'
  JWT_SECRET            Secret para JWT (pruebas)
`);
  }
}

// Función principal
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  
  // Parsear opciones
  const options = {
    coverage: args.includes('--coverage'),
    verbose: args.includes('--verbose'),
    parallel: args.includes('--parallel'),
    bail: args.includes('--bail'),
    timeout: 60000
  };

  // Parsear timeout personalizado
  const timeoutIndex = args.indexOf('--timeout');
  if (timeoutIndex !== -1 && args[timeoutIndex + 1]) {
    options.timeout = parseInt(args[timeoutIndex + 1], 10) || 60000;
  }

  const runner = new E2ETestRunner();

  try {
    switch (command) {
      case 'all':
        await runner.setupEnvironment();
        const allSuccess = await runner.runAllTests(options);
        await runner.cleanup();
        process.exit(allSuccess ? 0 : 1);
        break;

      case 'module':
        const moduleName = args[1];
        if (!moduleName) {
          console.error('❌ Debe especificar el nombre del módulo');
          runner.showHelp();
          process.exit(1);
        }
        await runner.setupEnvironment();
        const moduleSuccess = await runner.runModuleTests(moduleName, options);
        await runner.cleanup();
        process.exit(moduleSuccess ? 0 : 1);
        break;

      case 'smoke':
        await runner.setupEnvironment();
        const smokeSuccess = await runner.runSmokeTests();
        await runner.cleanup();
        process.exit(smokeSuccess ? 0 : 1);
        break;

      case 'performance':
        await runner.setupEnvironment();
        const perfSuccess = await runner.runPerformanceTests();
        await runner.cleanup();
        process.exit(perfSuccess ? 0 : 1);
        break;

      case 'setup':
        const setupSuccess = await runner.setupEnvironment();
        process.exit(setupSuccess ? 0 : 1);
        break;

      case 'cleanup':
        const cleanupSuccess = await runner.cleanup();
        process.exit(cleanupSuccess ? 0 : 1);
        break;

      case 'help':
      default:
        runner.showHelp();
        process.exit(0);
        break;
    }
  } catch (error) {
    console.error('❌ Error ejecutando pruebas:', error.message);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = { E2ETestRunner };