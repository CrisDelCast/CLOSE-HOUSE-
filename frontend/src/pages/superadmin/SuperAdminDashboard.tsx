
export default function SuperAdminDashboard() {
  // Datos simulados para las tarjetas métricas
  const stats = [
    { title: 'Total Conjuntos (Tenants)', value: '14', icon: '🏢', color: '#3b82f6' },
    { title: 'Residentes Totales', value: '1,240', icon: '👥', color: '#10b981' },
    { title: 'Visitantes Registrados Hoy', value: '85', icon: '🚗', color: '#f59e0b' },
    { title: 'Estado del Sistema', value: 'Óptimo (100%)', icon: '⚡', color: '#8b5cf6' },
  ];

  return (
    <div>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', color: '#1e293b' }}>
        Dashboard Global de Monitoreo
      </h2>
      <p style={{ color: '#64748b', marginBottom: '30px' }}>
        Bienvenido al panel general. Aquí tienes una vista consolidada de la plataforma multi-tenant.
      </p>

      {/* Grid de Tarjetas Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        {stats.map((stat, idx) => (
          <div 
            key={idx} 
            style={{ 
              background: '#fff', 
              padding: '20px', 
              borderRadius: '8px', 
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              borderLeft: `5px solid ${stat.color}`
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748b', fontWeight: '500' }}>{stat.title}</span>
              <span style={{ fontSize: '24px' }}>{stat.icon}</span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '10px', color: '#0f172a' }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}