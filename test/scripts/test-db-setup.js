#!/usr/bin/env node

/**
 * Script para configurar y gestionar la base de datos de pruebas
 * Uso: node test/scripts/test-db-setup.js [comando]
 * 
 * Comandos disponibles:
 * - setup: Configura la base de datos de pruebas
 * - cleanup: Limpia la base de datos de pruebas
 * - reset: Resetea la base de datos de pruebas
 * - stats: Muestra estadísticas de la base de datos
 * - backup [nombre]: Crea un backup de la base de datos
 * - restore [archivo]: Restaura un backup
 * - health: Verifica el estado de la base de datos
 */

const { DatabaseTestSetup } = require('../database-setup');

async function main() {
  const command = process.argv[2] || 'setup';
  const arg = process.argv[3];

  console.log(`🚀 Ejecutando comando: ${command}`);

  try {
    switch (command) {
      case 'setup':
        await DatabaseTestSetup.initialize();
        break;

      case 'cleanup':
        await DatabaseTestSetup.initialize();
        await DatabaseTestSetup.cleanup();
        break;

      case 'reset':
        await DatabaseTestSetup.initialize();
        await DatabaseTestSetup.reset();
        break;

      case 'stats':
        await DatabaseTestSetup.initialize();
        await DatabaseTestSetup.getStats();
        break;

      case 'backup':
        await DatabaseTestSetup.initialize();
        const backupPath = await DatabaseTestSetup.createBackup(arg);
        console.log(`✅ Backup creado en: ${backupPath}`);
        break;

      case 'restore':
        if (!arg) {
          console.error('❌ Debes especificar el archivo de backup');
          process.exit(1);
        }
        await DatabaseTestSetup.initialize();
        await DatabaseTestSetup.restoreBackup(arg);
        break;

      case 'health':
        await DatabaseTestSetup.initialize();
        const isHealthy = await DatabaseTestSetup.healthCheck();
        console.log(`🏥 Estado de la base de datos: ${isHealthy ? '✅ Saludable' : '❌ Con problemas'}`);
        if (!isHealthy) {
          process.exit(1);
        }
        break;

      default:
        console.error(`❌ Comando desconocido: ${command}`);
        console.log(`
Comandos disponibles:
  setup     - Configura la base de datos de pruebas
  cleanup   - Limpia la base de datos de pruebas
  reset     - Resetea la base de datos de pruebas
  stats     - Muestra estadísticas de la base de datos
  backup    - Crea un backup de la base de datos
  restore   - Restaura un backup
  health    - Verifica el estado de la base de datos
        `);
        process.exit(1);
    }

    await DatabaseTestSetup.close();
    console.log('✅ Comando ejecutado exitosamente');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error ejecutando comando:', error);
    await DatabaseTestSetup.close();
    process.exit(1);
  }
}

// Manejar señales de interrupción
process.on('SIGINT', async () => {
  console.log('\n🛑 Interrupción detectada, cerrando conexiones...');
  await DatabaseTestSetup.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Terminación detectada, cerrando conexiones...');
  await DatabaseTestSetup.close();
  process.exit(0);
});

// Ejecutar script
if (require.main === module) {
  main();
}

module.exports = { main };