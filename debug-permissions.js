/**
 * Script temporal para verificar y reparar permisos de Quiz Extended
 * Ejecuta este código desde la consola del navegador en wp-admin
 */

// 1. Primero, verificamos la configuración actual
async function checkQuizExtendedPermissions() {
  try {
    console.log('🔍 Verificando configuración de Quiz Extended...');
    
    // Verificar configuración de API
    const apiConfig = window.qe_data;
    console.log('📋 Configuración de API:', apiConfig);
    
    if (!apiConfig || !apiConfig.nonce) {
      console.error('❌ No se encontró configuración de API o nonce faltante');
      return false;
    }

    // Probar endpoint de debug
    const debugUrl = `${apiConfig.api_url}/quiz-extended/v1/debug/capabilities`;
    console.log('🧪 Probando endpoint de debug:', debugUrl);
    
    const response = await fetch(debugUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': apiConfig.nonce
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Datos de permisos recibidos:', data);
      return data;
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.error(`❌ Error ${response.status}:`, errorData);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error verificando permisos:', error);
    return false;
  }
}

// 2. Función para intentar crear un curso de prueba
async function testCourseCreation() {
  try {
    console.log('🧪 Probando creación de curso...');
    
    const apiConfig = window.qe_data;
    if (!apiConfig || !apiConfig.nonce) {
      console.error('❌ No hay configuración de API disponible');
      return false;
    }
    
    const testCourse = {
      title: 'Test Course - ' + Date.now(),
      content: 'This is a test course created to verify permissions.',
      status: 'draft'
    };
    
    const createUrl = `${apiConfig.api_url}/wp/v2/qe_course`;
    console.log('🚀 Intentando crear curso en:', createUrl);
    
    const response = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': apiConfig.nonce
      },
      body: JSON.stringify(testCourse)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Curso creado exitosamente:', data);
      
      // Limpiar - eliminar el curso de prueba
      const deleteResponse = await fetch(`${createUrl}/${data.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': apiConfig.nonce
        }
      });
      
      if (deleteResponse.ok) {
        console.log('🧹 Curso de prueba eliminado');
      }
      
      return true;
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.error(`❌ Error ${response.status} creando curso:`, errorData);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error en prueba de creación:', error);
    return false;
  }
}

// 3. Función principal de diagnóstico
async function diagnoseQuizExtended() {
  console.group('🔧 Diagnóstico de Quiz Extended');
  
  console.log('1️⃣ Verificando permisos...');
  const permissionsData = await checkQuizExtendedPermissions();
  
  console.log('2️⃣ Probando creación de curso...');
  const canCreate = await testCourseCreation();
  
  console.log('📊 Resumen del diagnóstico:');
  console.log('- Debug API disponible:', !!permissionsData);
  console.log('- Puede crear cursos:', canCreate);
  
  if (permissionsData && permissionsData.success) {
    console.log('- Información de usuario:', permissionsData.data.user_debug);
    console.log('- Estado de permisos:', permissionsData.data.capabilities_status);
  }
  
  if (!canCreate) {
    console.log('💡 Reparando permisos automáticamente...');
    const fixed = await window.fixQuizExtendedPermissions();
    
    if (!fixed) {
      console.log('⚠️ Reparación automática falló. Soluciones manuales:');
      console.log('1. Ejecutar: qeDebug.fix() desde la consola');
      console.log('2. Desactivar y reactivar el plugin Quiz Extended desde wp-admin');
      console.log('3. Verificar que el usuario tenga rol de administrador');
    } else {
      console.log('✅ Permisos reparados automáticamente!');
    }
  } else {
    console.log('✅ Todo funciona correctamente!');
  }
  
  console.groupEnd();
  
  return {
    permissionsAvailable: !!permissionsData,
    canCreateCourses: canCreate,
    permissionsData
  };
}

// 4. Ejecutar diagnóstico automáticamente
console.log('🚀 Iniciando diagnóstico de Quiz Extended...');
diagnoseQuizExtended().then(results => {
  console.log('✅ Diagnóstico completado:', results);
}).catch(error => {
  console.error('❌ Error en diagnóstico:', error);
});

// 5. Función helper para activación manual de permisos
window.fixQuizExtendedPermissions = async function() {
  try {
    console.log('🔧 Intentando reparar permisos...');
    
    const apiConfig = window.qe_data;
    if (!apiConfig || !apiConfig.nonce) {
      console.error('❌ No hay configuración de API disponible');
      return false;
    }
    
    const fixUrl = `${apiConfig.api_url}/quiz-extended/v1/debug/fix-permissions`;
    console.log('🚀 Llamando endpoint de reparación:', fixUrl);
    
    const response = await fetch(fixUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': apiConfig.nonce
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Permisos reparados exitosamente:', data);
      
      // Probar de nuevo la creación
      console.log('🧪 Probando creación después de la reparación...');
      const canCreateNow = await testCourseCreation();
      console.log('✅ Puede crear cursos ahora:', canCreateNow);
      
      return canCreateNow;
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.error(`❌ Error ${response.status} reparando permisos:`, errorData);
      
      // Fallback: mostrar instrucciones manuales
      console.log('⚠️ Reparación automática falló. Para reparar permisos manualmente:');
      console.log('1. Ve a wp-admin → Plugins');
      console.log('2. Desactiva "Quiz Extended LMS"');
      console.log('3. Reactiva "Quiz Extended LMS"');
      
      return false;
    }
  } catch (error) {
    console.error('❌ Error reparando permisos:', error);
    return false;
  }
};

// Export para uso manual
window.qeDebug = {
  checkPermissions: checkQuizExtendedPermissions,
  testCreation: testCourseCreation,
  diagnose: diagnoseQuizExtended,
  fix: window.fixQuizExtendedPermissions
};