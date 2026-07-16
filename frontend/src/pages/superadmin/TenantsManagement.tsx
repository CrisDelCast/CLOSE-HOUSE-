import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '../../context/AuthContext';
import { createTenant, fetchTenants } from '../../api/tenants';
import type { CreateTenantInput, Tenant } from '../../types';
import axios from 'axios';

// Interfaces locales para los Puntos de Control
interface ControlPoint {
  id: string;
  name: string;
  qrCodeToken: string;
  sequenceOrder: number;
}

// Estado inicial para el formulario
const INITIAL_FORM_STATE = {
  name: '',
  slug: '',
  phoneCode: '+57',
  totalUnits: '',
  totalParkingSlots: '',
  scheduleType: '24/7',
  adminName: '',
  adminEmail: '',
  adminPhone: '',
  rulesText: '',
  totalRoundPoints: '5',
  timePerPoint: '5',
  timeBetweenPoints: '60',
  vehicleControlSchedule: '22:00 a 05:00',
};

export default function TenantsManagement() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  // Estados
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [selectedTenantForPoints, setSelectedTenantForPoints] = useState<Tenant | null>(null);
  const [newPointName, setNewPointName] = useState('');
  const [pointFeedback, setPointFeedback] = useState('');

  // Traer Tenants
  const { data: tenants, isLoading, isError } = useQuery({
    queryKey: ['tenants'],
    queryFn: fetchTenants,
  });

  const safeTenants: Tenant[] = Array.isArray(tenants) ? tenants : [];

  // Traer Puntos de Control
  const { data: controlPoints, isLoading: isLoadingPoints } = useQuery<ControlPoint[]>({
    queryKey: ['controlPoints', selectedTenantForPoints?.id],
    queryFn: async () => {
      if (!selectedTenantForPoints?.id) return [];
      try {
        const { data } = await axios.get(`/api/control-points/tenant/${selectedTenantForPoints.id}`);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Error al obtener los puntos de control:", error);
        return [];
      }
    },
    enabled: !!selectedTenantForPoints?.id,
  });

  const safeControlPoints: ControlPoint[] = Array.isArray(controlPoints) ? controlPoints : [];

  const [formData, setFormData] = useState(INITIAL_FORM_STATE);

  // Mutación para crear Tenant
  const createMutation = useMutation({
    mutationFn: createTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setIsModalOpen(false);
      setFeedback('');
      setFormData(INITIAL_FORM_STATE);
      alert('¡Conjunto Residencial y Configuración de Rondas creados con éxito!');
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) {
        setFeedback(error.response?.data?.message || 'Error al registrar el conjunto.');
      } else {
        setFeedback('Ocurrió un error inesperado.');
      }
    },
  });

  // Mutación para agregar punto
  const addPointMutation = useMutation({
    mutationFn: async (payload: { name: string; sequenceOrder: number; tenantId: string }) => {
      const { data } = await axios.post('/api/control-points', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['controlPoints', selectedTenantForPoints?.id] });
      setNewPointName('');
      setPointFeedback('');
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) {
        setPointFeedback(error.response?.data?.message || 'Error al guardar el punto de control.');
      } else {
        setPointFeedback('Ocurrió un error inesperado al guardar el punto.');
      }
    },
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback('');

    const payload: CreateTenantInput = {
      name: formData.name,
      slug: formData.slug.toLowerCase().trim(),
      phoneCode: formData.phoneCode,
      totalUnits: parseInt(formData.totalUnits) || 0,
      totalParkingSlots: parseInt(formData.totalParkingSlots) || 0,
      scheduleType: formData.scheduleType,
      adminName: formData.adminName,
      adminEmail: formData.adminEmail,
      adminPhone: formData.adminPhone,
      rulesText: formData.rulesText || undefined,
      roundConfig: {
        totalRoundPoints: parseInt(formData.totalRoundPoints) || 5,
        timePerPoint: parseInt(formData.timePerPoint) || 5,
        timeBetweenPoints: parseInt(formData.timeBetweenPoints) || 60,
        vehicleControlSchedule: formData.vehicleControlSchedule,
      }
    };

    createMutation.mutate(payload);
  };

  const handleAddPointSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedTenantForPoints?.id || !newPointName.trim()) return;

    const nextSequence = safeControlPoints.length + 1;

    addPointMutation.mutate({
      name: newPointName.trim(),
      sequenceOrder: nextSequence,
      tenantId: selectedTenantForPoints.id,
    });
  };

  // Estilo unificado de "Cuadrito Dorado" con los colores del Login
  const goldenBadgeStyle = {
    display: 'inline-block',
    background: 'rgba(212, 175, 55, 0.12)',
    color: '#D4AF37', 
    border: '1px solid rgba(212, 175, 55, 0.4)',
    padding: '6px 12px',
    borderRadius: '8px',
    fontWeight: 'bold' as const,
    boxShadow: '0 2px 8px rgba(212, 175, 55, 0.05)',
    letterSpacing: '0.5px'
  };

  return (
    <div style={{ 
      padding: '24px', 
      fontFamily: 'sans-serif', 
      boxSizing: 'border-box',
      minHeight: '100vh',
      color: '#ffffff',
      // Mismo fondo sofisticado del Login:
      backgroundColor: '#0c0c0e',
      backgroundImage: `
        radial-gradient(circle at 50% 50%, rgba(212, 175, 55, 0.08) 0%, rgba(12, 12, 14, 0) 70%),
        linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
      `,
      backgroundSize: '100% 100%, 24px 24px, 24px 24px',
    }}>
      
      {/* Estilos dinámicos para coherencia en inputs y efectos hover */}
      <style>{`
        .custom-input {
          background-color: #121214 !important;
          border: 1px solid #2e2e33 !important;
          color: #ffffff !important;
          padding: 10px 12px;
          border-radius: 8px;
          font-size: 14px;
          outline: none;
          transition: all 0.2s ease;
          box-sizing: border-box;
          width: 100%;
        }
        .custom-input:focus {
          border-color: #D4AF37 !important;
          box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.15) !important;
        }
        .btn-gold {
          background: #D4AF37;
          color: #0c0c0e;
          border: none;
          padding: 10px 16px;
          font-size: 14px;
          font-weight: 700;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(212, 175, 55, 0.2);
        }
        .btn-gold:hover:not(:disabled) {
          background: #e5be49;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(212, 175, 55, 0.3);
        }
        .btn-gold:active:not(:disabled) {
          transform: translateY(1px) scale(0.98);
        }
        .btn-dark-outline {
          background: rgba(22, 22, 26, 0.8);
          color: #a3a3a3;
          border: 1px solid #2e2e33;
          padding: 8px 14px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-dark-outline:hover {
          color: #ffffff;
          border-color: #D4AF37;
        }
      `}</style>

      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h2 style={{ fontSize: '50px', fontWeight: '700', color: '#ffffff', margin: 0, letterSpacing: '0.5px' }}>
            Gestión de Conjuntos Residenciales
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#a3a3a3', fontSize: '30px' }}>Supervisión, infraestructura y configuración de rondas</p>
        </div>
        {user?.role === 'SUPERADMIN' && (
          <button onClick={() => setIsModalOpen(true)} className="btn-gold">
            ➕ Crear Nuevo Conjunto
          </button>
        )}
      </div>

      {/* Estados de Carga y Error */}
      {isLoading && <p style={{ color: '#a3a3a3', fontSize: '14px' }}>⏳ Cargando conjuntos residenciales desde Neon...</p>}
      {isError && <p style={{ color: '#f87171', fontWeight: '500' }}>❌ No se pudieron cargar los conjuntos.</p>}

      {/* Tabla de Tenants */}
      {!isLoading && tenants && (
        <div style={{ 
          background: 'rgba(26, 25, 25, 0.95)', 
          borderRadius: '16px', 
          border: '1px solid rgba(212, 175, 55, 0.15)', 
          overflow: 'hidden', 
          marginBottom: '30px', 
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(8px)'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(136, 126, 38, 0.8)', color: '#ffffff', fontWeight: '900', borderBottom: '1px solid #2e2e33', fontSize: '30px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                <th style={{ padding: '16px' ,color: '#ffffff',fontSize: '18px'}}>Nombre del Conjunto</th>
                <th style={{ padding: '16px',color: '#ffffff',fontSize: '18px' }}>URL Slug</th>
                <th style={{ padding: '16px',color: '#ffffff',fontSize: '18px' }}>Capacidad / Tipo</th>
                <th style={{ padding: '16px',color: '#ffffff',fontSize: '18px' }}>Administrador</th>
                <th style={{ padding: '16px',color: '#ffffff',fontSize: '18px'}}>Estado</th>
                <th style={{ padding: '16px',color: '#ffffff',fontSize: '18px'}}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {safeTenants.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#a3a3a3' }}>
                    No hay conjuntos residenciales registrados en el sistema.
                  </td>
                </tr>
              ) : (
                safeTenants.map((tenant: Tenant) => (
                  <tr key={tenant.id} style={{ borderBottom: '1px solid #1c1c1f', color: '#ffffff' }}>
                    {/* Nombre en Cuadrito Dorado del Login */}
                    <td style={{ padding: '20x' }}>
                      <span style={goldenBadgeStyle}>
                        {tenant.name}
                      </span>
                    </td>
                    {/* Slug con badge */}
                    <td style={{ padding: '16px' }}>
                      <span style={{ ...goldenBadgeStyle, fontSize: '20px', padding: '4px 8px', background: 'rgba(212, 175, 55, 0.05)' }}>
                        /{tenant.slug}
                      </span>
                    </td>
                    <td style={{ padding: '16px', fontSize: '16px', color: '#a3a3a3' }}>
                      🏢 <strong>{tenant.totalUnits}</strong> Unidades<br />
                      🚗 <strong>{tenant.totalParkingSlots}</strong> Parqueaderos
                    </td>
                    <td style={{ padding: '16px', fontSize: '16px' }}>
                      <strong style={{ color: '#ffffff' }}>{tenant.adminName}</strong><br />
                      <span style={{ color: '#a3a3a3' }}>{tenant.adminEmail}</span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ 
                        padding: '6px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
                        background: tenant.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: tenant.status === 'ACTIVE' ? '#34d399' : '#f87171',
                        border: tenant.status === 'ACTIVE' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)'
                      }}>
                        {tenant.status === 'ACTIVE' ? '🟢 Activo' : '🔴 Suspendido'}
                      </span>
                    </td>
                    <td style={{ padding: '16px'}}>
                      <button
                        onClick={() => setSelectedTenantForPoints(tenant)}
                        className="btn-dark-outline"
                      >
                        ⚙️ Configurar Puntos QR
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 📍 SECCIÓN: CONFIGURACIÓN DE CÓDIGOS QR (Coherente con Login) */}
      {selectedTenantForPoints && (
        <div style={{ 
          background: 'rgba(22, 22, 26, 0.95)', 
          borderRadius: '16px', 
          padding: '24px', 
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)', 
          border: '1px solid rgba(212, 175, 55, 0.2)',
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2e2e33', paddingBottom: '16px', marginBottom: '24px' }}>
            <h3 style={{ margin: 0, color: '#ffffff', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              📍 Configuración de Códigos QR: <span style={goldenBadgeStyle}>{selectedTenantForPoints.name}</span>
            </h3>
            <button 
              onClick={() => setSelectedTenantForPoints(null)} 
              style={{ background: '#f87171', color: '#0c0c0e', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: '700' }}
            >
              Cerrar Panel
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '24px' }}>
            {/* Formulario Lateral */}
            <div style={{ background: '#121214', padding: '20px', borderRadius: '12px', border: '1px solid #2e2e33' }}>
              <h4 style={{ margin: '0 0 16px 0', color: '#D4AF37', fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Registrar Nuevo Punto</h4>
              <form onSubmit={handleAddPointSubmit}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'rgba(212, 175, 55, 0.9)', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Nombre de la ubicación física
                  </label>
                  <input 
                    type="text" 
                    required 
                    value={newPointName} 
                    onChange={(e) => setNewPointName(e.target.value)} 
                    placeholder="Ej: Acceso Vehicular Sótano 1" 
                    className="custom-input"
                  />
                </div>
                <div style={{ marginBottom: '16px', fontSize: '13px', color: '#a3a3a3' }}>
                  Siguiente orden de escaneo sugerido: <strong style={{ color: '#D4AF37' }}>#{safeControlPoints.length + 1}</strong>
                </div>

                {pointFeedback && <p style={{ color: '#f87171', fontSize: '13px', marginBottom: '12px' }}>{pointFeedback}</p>}

                <button 
                  type="submit" 
                  disabled={addPointMutation.isPending}
                  className="btn-gold"
                  style={{ width: '100%' }}
                >
                  {addPointMutation.isPending ? 'Guardando...' : 'Generar Punto y QR'}
                </button>
              </form>
            </div>

            {/* Listado de Puntos con su QR */}
            <div>
              <h4 style={{ margin: '0 0 16px 0', color: 'rgba(212, 175, 55, 0.9)', fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Puntos Físicos e Impresión de QR</h4>
              {isLoadingPoints ? (
                <p style={{ color: '#a3a3a3' }}>Cargando puntos de control...</p>
              ) : safeControlPoints.length === 0 ? (
                <p style={{ color: '#a3a3a3', fontStyle: 'italic' }}>Aún no has creado puntos de control para este conjunto residencial.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {safeControlPoints.map((point) => {
                    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(point.qrCodeToken)}`;
                    
                    return (
                      <div key={point.id} style={{ border: '1px solid #2e2e33', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#121214' }}>
                        <span style={{ background: 'rgba(212, 175, 55, 0.1)', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', color: '#D4AF37', marginBottom: '10px', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
                          Punto #{point.sequenceOrder}
                        </span>
                        
                        {/* Nombre del Punto */}
                        <strong style={{ ...goldenBadgeStyle, fontSize: '13px', textAlign: 'center', marginBottom: '14px', width: '90%', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {point.name}
                        </strong>
                        
                        {/* Contenedor blanco para lectura del scanner */}
                        <div style={{ background: '#ffffff', padding: '8px', borderRadius: '8px', display: 'inline-block', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                          <img 
                            src={qrUrl} 
                            alt={`QR ${point.name}`} 
                            style={{ width: '130px', height: '130px', display: 'block' }} 
                          />
                        </div>
                        
                        <span style={{ fontSize: '10px', color: '#5a4b22', marginTop: '10px', fontFamily: 'monospace' }}>
                          {point.qrCodeToken.substring(0, 16)}...
                        </span>
                        
                        <button 
                          onClick={() => {
                            const win = window.open();
                            if (win) {
                              // 1. Definimos la URL del logo de la empresa (Usa la misma ruta/importación que en el Login)
                              const logoUrl = "/Logo Duxs Security (1).png"; 

                              win.document.write(`
                                <!DOCTYPE html>
                                <html>
                                  <head>
                                    <title>QR - ${point.name}</title>
                                    <style>
                                      /* Estilo general para visualización en pantalla (Premium Dark) */
                                      body {
                                        background-color: #0c0c0e;
                                        color: #ffffff;
                                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                                        margin: 0;
                                        padding: 40px 20px;
                                        display: flex;
                                        justify-content: center;
                                        align-items: center;
                                        min-height: 100vh;
                                        box-sizing: border-box;
                                      }

                                      .print-card {
                                        background: #121214;
                                        border: 2px solid #D4AF37;
                                        border-radius: 20px;
                                        padding: 40px;
                                        max-width: 450px;
                                        width: 100%;
                                        text-align: center;
                                        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 40px rgba(212, 175, 55, 0.05);
                                        box-sizing: border-box;
                                      }

                                      .logo-container {
                                        display: flex;
                                        justify-content: center;
                                        margin-bottom: 50px;
                                      }

                                      .logo-img {
                                        max-width: 1300px;
                                        height: 300px;
                                        object-fit: contain;
                                      }

                                      .badge-point {
                                        display: inline-block;
                                        background: rgba(212, 175, 55, 0.12);
                                        color: #D4AF37;
                                        border: 1px solid rgba(212, 175, 55, 0.4);
                                        padding: 6px 14px;
                                        border-radius: 30px;
                                        font-size: 12px;
                                        font-weight: bold;
                                        letter-spacing: 1px;
                                        text-transform: uppercase;
                                        margin-bottom: 20px;
                                      }

                                      h1 {
                                        font-size: 24px;
                                        margin: 0 0 8px 0;
                                        color: #ffffff;
                                        font-weight: 700;
                                      }

                                      h3 {
                                        font-size: 14px;
                                        color: #a3a3a3;
                                        margin: 0 0 24px 0;
                                        text-transform: uppercase;
                                        letter-spacing: 1.5px;
                                      }

                                      .qr-container {
                                        background: #ffffff;
                                        padding: 16px;
                                        border-radius: 16px;
                                        display: inline-block;
                                        box-shadow: 0 8px 24px rgba(0,0,0,0.3);
                                        margin-bottom: 24px;
                                        border: 1px solid rgba(212, 175, 55, 0.2);
                                      }

                                      .qr-img {
                                        width: 220px;
                                        height: 220px;
                                        display: block;
                                      }

                                      .instruction {
                                        font-size: 13px;
                                        color: #a3a3a3;
                                        line-height: 1.5;
                                        margin: 0;
                                      }

                                      .footer-token {
                                        font-family: monospace;
                                        font-size: 10px;
                                        color: #5a4b22;
                                        margin-top: 15px;
                                        word-break: break-all;
                                      }

                                      /* 🖨️ REGLAS DE OPTIMIZACIÓN PARA IMPRESIÓN (Ahorro de tinta y legibilidad) */
                                      @media print {
                                        body {
                                          background: #ffffff;
                                          color: #000000;
                                          padding: 0;
                                        }
                                        .print-card {
                                          background: #ffffff;
                                          border: 1px solid #000000;
                                          box-shadow: none;
                                          padding: 20px;
                                          max-width: 100%;
                                        }
                                        h1 {
                                          color: #000000;
                                        }
                                        h3, .instruction {
                                          color: #4b5563;
                                        }
                                        .badge-point {
                                          background: #f3f4f6;
                                          color: #000000;
                                          border-color: #000000;
                                        }
                                        .qr-container {
                                          box-shadow: none;
                                          border: 1px solid #e5e7eb;
                                        }
                                        .footer-token {
                                          color: #9ca3af;
                                        }
                                      }
                                    </style>
                                  </head>
                                  <body>
                                    <div class="print-card">
                                      <div class="logo-container">
                                        <img class="logo-img" src="${logoUrl}" alt="Logo Empresa" onerror="this.style.display='none';" />
                                      </div>

                                      <span class="badge-point">Punto de Control #${point.sequenceOrder}</span>

                                      <h1>${point.name}</h1>
                                      <h3>${selectedTenantForPoints?.name}</h3>

                                      <div class="qr-container">
                                        <img class="qr-img" src="${qrUrl}" alt="QR ${point.name}" />
                                      </div>

                                      <p class="instruction">
                                        Escanee este código únicamente desde la app de portería autorizada para registrar su ronda de seguridad.
                                      </p>
                                      
                                      <div class="footer-token">
                                        ID: ${point.qrCodeToken}
                                      </div>
                                    </div>

                                    <script>
                                      // Ejecuta el comando de impresión una vez los recursos (incluyendo el logo y el QR) estén cargados
                                      window.onload = function() {
                                        window.print();
                                      };
                                    </script>
                                  </body>
                                </html>
                              `);
                              win.document.close();
                            } else {
                              alert("Habilita las ventanas emergentes en tu navegador para imprimir.");
                            }
                          }}
                          className="btn-dark-outline"
                          style={{ marginTop: '14px', width: '100%' }}
                        >
                          🖨️ Imprimir QR
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORMULARIO DE CREACIÓN */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(12, 12, 14, 0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px', backdropFilter: 'blur(8px)' }}>
          <div style={{ background: 'rgba(22, 22, 26, 0.98)', borderRadius: '16px', width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)', border: '1px solid rgba(212, 175, 55, 0.25)' }}>
            
            <div style={{ padding: '20px', borderBottom: '1px solid #2e2e33', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '20px', color: '#ffffff', fontWeight: '700' }}>Registrar Nuevo Conjunto Residencial</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#a3a3a3' }}>✕</button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
              
              <h4 style={{ margin: '0 0 12px 0', color: '#D4AF37', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #2e2e33', paddingBottom: '6px' }}>🏢 Datos e Infraestructura</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'rgba(212, 175, 55, 0.9)', textTransform: 'uppercase', marginBottom: '4px' }}>Nombre</label>
                  <input type="text" name="name" required value={formData.name} onChange={handleChange} className="custom-input" placeholder="Ej: Altos del Limonar" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'rgba(212, 175, 55, 0.9)', textTransform: 'uppercase', marginBottom: '4px' }}>Slug URL (Único)</label>
                  <input type="text" name="slug" required value={formData.slug} onChange={handleChange} className="custom-input" placeholder="Ej: limonar" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'rgba(212, 175, 55, 0.9)', textTransform: 'uppercase', marginBottom: '4px' }}>Total Unidades/Aptos</label>
                  <input type="number" name="totalUnits" required value={formData.totalUnits} onChange={handleChange} className="custom-input" placeholder="Ej: 160" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'rgba(212, 175, 55, 0.9)', textTransform: 'uppercase', marginBottom: '4px' }}>Total Parqueaderos</label>
                  <input type="number" name="totalParkingSlots" required value={formData.totalParkingSlots} onChange={handleChange} className="custom-input" placeholder="Ej: 90" />
                </div>
              </div>

              <h4 style={{ margin: '16px 0 12px 0', color: '#D4AF37', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #2e2e33', paddingBottom: '6px' }}>📞 Datos de la Administración</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'rgba(212, 175, 55, 0.9)', textTransform: 'uppercase', marginBottom: '4px' }}>Nombre Completo Admin</label>
                  <input type="text" name="adminName" required value={formData.adminName} onChange={handleChange} className="custom-input" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'rgba(212, 175, 55, 0.9)', textTransform: 'uppercase', marginBottom: '4px' }}>Email Admin</label>
                  <input type="email" name="adminEmail" required value={formData.adminEmail} onChange={handleChange} className="custom-input" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'rgba(212, 175, 55, 0.9)', textTransform: 'uppercase', marginBottom: '4px' }}>Teléfono Admin</label>
                  <input type="text" name="adminPhone" required value={formData.adminPhone} onChange={handleChange} className="custom-input" />
                </div>
              </div>

              <h4 style={{ margin: '16px 0 12px 0', color: '#fbbf24', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid rgba(212, 175, 55, 0.2)', paddingBottom: '6px' }}>🚨 Configuración Inicial de Rondas</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px', background: 'rgba(212, 175, 55, 0.05)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(212, 175, 55, 0.15)' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#D4AF37', textTransform: 'uppercase', marginBottom: '4px' }}>Cantidad de puntos de la ronda (Marcaciones)</label>
                  <input type="number" name="totalRoundPoints" required value={formData.totalRoundPoints} onChange={handleChange} className="custom-input" style={{ borderColor: 'rgba(212, 175, 55, 0.3) !important' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#D4AF37', textTransform: 'uppercase', marginBottom: '4px' }}>Minutos por punto de marcado</label>
                  <input type="number" name="timePerPoint" required value={formData.timePerPoint} onChange={handleChange} className="custom-input" style={{ borderColor: 'rgba(212, 175, 55, 0.3) !important' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#D4AF37', textTransform: 'uppercase', marginBottom: '4px' }}>Minutos de descanso entre rondas</label>
                  <input type="number" name="timeBetweenPoints" required value={formData.timeBetweenPoints} onChange={handleChange} className="custom-input" style={{ borderColor: 'rgba(212, 175, 55, 0.3) !important' }} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#D4AF37', textTransform: 'uppercase', marginBottom: '4px' }}>Horario Control Vehicular Obligatorio</label>
                  <input type="text" name="vehicleControlSchedule" required value={formData.vehicleControlSchedule} onChange={handleChange} className="custom-input" style={{ borderColor: 'rgba(212, 175, 55, 0.3) !important' }} />
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'rgba(212, 175, 55, 0.9)', textTransform: 'uppercase', marginBottom: '4px' }}>Normas Internas / Reglamento (Opcional)</label>
                <textarea name="rulesText" value={formData.rulesText} onChange={handleChange} rows={3} className="custom-input" style={{ resize: 'vertical' }} placeholder="Reglas básicas de convivencia o control..." />
              </div>

              {feedback && <p style={{ color: '#f87171', fontSize: '14px', marginBottom: '16px', fontWeight: '500' }}>{feedback}</p>}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '1px solid #2e2e33' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ background: '#2e2e33', color: '#a3a3a3', padding: '10px 18px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={createMutation.isPending} className="btn-gold" style={{ padding: '10px 22px' }}>
                  {createMutation.isPending ? 'Guardando...' : 'Guardar Conjunto'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}