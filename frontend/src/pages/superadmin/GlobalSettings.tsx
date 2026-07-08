

export default function GlobalSettings() {
  return (
    <div>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', color: '#1e293b' }}>
        Configuración General del Sistema
      </h2>
      
      <div style={{ background: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '600px' }}>
        
        {/* Opción 1 */}
        <div>
          <label style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>
            Nombre de la Aplicación Global
          </label>
          <input 
            type="text" 
            defaultValue="Control de Acceso Multi-Tenant" 
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} 
          />
        </div>

        {/* Opción 2 */}
        <div>
          <label style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>
            Modo Mantenimiento de la Plataforma
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input type="checkbox" id="maintenance" style={{ width: '18px', height: '18px' }} />
            <label htmlFor="maintenance" style={{ color: '#475569' }}>Activar (Bloquea el acceso temporal a porteros y administradores)</label>
          </div>
        </div>

        {/* Opción 3 */}
        <div>
          <label style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>
            Límite Máximo de Residentes por Conjunto (Por Defecto)
          </label>
          <input 
            type="number" 
            defaultValue={500} 
            style={{ width: '120px', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} 
          />
        </div>

        {/* Botón de Guardar */}
        <div style={{ marginTop: '10px' }}>
          <button style={{ background: '#10b981', color: '#fff', padding: '10px 20px', borderRadius: '6px', border: 'none', fontWeight: '600', cursor: 'pointer' }}>
            💾 Guardar Configuración Maestra
          </button>
        </div>

      </div>
    </div>
  );
}