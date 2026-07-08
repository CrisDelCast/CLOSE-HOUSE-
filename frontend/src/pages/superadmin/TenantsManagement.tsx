import React, { useState } from 'react';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  adminEmail: string;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
}

export default function TenantsManagement() {
  // Estado con lista simulada de Condominios
  const [tenants] = useState<Tenant[]>([
    { id: '1', name: 'Mansion Residencial', slug: 'mansion', adminEmail: 'admin@mansion.com', status: 'ACTIVE', createdAt: '2026-01-15' },
    { id: '2', name: 'Torres del Valle', slug: 'valle', adminEmail: 'contacto@valle.com', status: 'ACTIVE', createdAt: '2026-03-22' },
    { id: '3', name: 'Altos de la Colina', slug: 'colina', adminEmail: 'gerencia@colina.com', status: 'SUSPENDED', createdAt: '2025-11-05' },
  ]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
          Gestión de Conjuntos Residenciales (Tenants)
        </h2>
        <button style={{ background: '#2563eb', color: '#fff', padding: '10px 16px', borderRadius: '6px', border: 'none', fontWeight: '6px', cursor: 'pointer' }}>
          ➕ Crear Nuevo Conjunto
        </button>
      </div>

      {/* Tabla de Tenants */}
      <div style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f1f5f9', color: '#475569', fontWeight: 'bold' }}>
              <th style={{ padding: '12px 16px' }}>Nombre del Conjunto</th>
              <th style={{ padding: '12px 16px' }}>URL Slug</th>
              <th style={{ padding: '12px 16px' }}>Email Administrador</th>
              <th style={{ padding: '12px 16px' }}>Estado</th>
              <th style={{ padding: '12px 16px' }}>Fecha Registro</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((tenant) => (
              <tr key={tenant.id} style={{ borderBottom: '1px solid #e2e8f0', color: '#334155' }}>
                <td style={{ padding: '16px', fontWeight: '500' }}>{tenant.name}</td>
                <td style={{ padding: '16px', color: '#0284c7' }}>/{tenant.slug}</td>
                <td style={{ padding: '16px' }}>{tenant.adminEmail}</td>
                <td style={{ padding: '16px' }}>
                  <span style={{ 
                    padding: '4px 8px', 
                    borderRadius: '12px', 
                    fontSize: '12px', 
                    fontWeight: 'bold',
                    background: tenant.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2',
                    color: tenant.status === 'ACTIVE' ? '#15803d' : '#b91c1c'
                  }}>
                    {tenant.status === 'ACTIVE' ? 'Activo' : 'Suspendido'}
                  </span>
                </td>
                <td style={{ padding: '16px' }}>{tenant.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}