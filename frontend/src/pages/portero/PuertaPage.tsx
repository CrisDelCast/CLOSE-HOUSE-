import { useState, useEffect } from 'react';
import axios from '../../api/axios';

export default function PuertaDashboard() {
  // Estados para controlar los modales
  const [activeModal, setActiveModal] = useState<'vehicle' | 'correspondence' | 'contractor' | null>(null);

  // Estados compartidos: Lista de apartamentos del tenant cargados al abrir los modales correspondientes
  const [tenantApartments, setTenantApartments] = useState<any[]>([]);
  const [isLoadingApartments, setIsLoadingApartments] = useState(false);

  // Estados para Modal 1: Consultar Vehículo / Propietario
  const [queryType, setQueryType] = useState<'plate' | 'document'>('plate');
  const [queryValue, setQueryValue] = useState('');
  const [queryResult, setQueryResult] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [queryError, setQueryError] = useState('');

  // Estados para Modal 2: Control de Correspondencia
  const [corrForm, setCorrForm] = useState({
    packageType: 'CAJA',
    provider: '',
    apartmentId: '',
  });
  const [corrLoading, setCorrLoading] = useState(false);
  const [corrMessage, setCorrMessage] = useState('');
  const [corrApartmentFilter, setCorrApartmentFilter] = useState('');

  // Estados para Modal 3: Control de Acceso Contratistas
  const [contractorForm, setContractorForm] = useState({
    company: '',
    documentNumber: '',
    fullName: '',
    time: '',
    apartmentId: '',
    procedureType: 'RECONEXION',
  });
  const [contractorLoading, setContractorLoading] = useState(false);
  const [contractorMessage, setContractorMessage] = useState('');
  const [contractorApartmentFilter, setContractorApartmentFilter] = useState('');

  // Listas de opciones requeridas
  const PACKAGE_TYPES = [
    'CAJA', 'COMIDA', 'MEDICAMENTO', 'CAPACITACIONES', 
    'SERVICIOS PUBLICOS', 'IMPUESTOS', 'BOLSAS', 'SOBRES', 'CARTA ADMINISTRACION'
  ];

  const PROCEDURE_TYPES = [
    'RECONEXION', 'CORTE', 'INSTALACION', 'INSPECCION', 'REPARACION'
  ];

  // Función para obtener dinámicamente el tenantId desde el token JWT o localStorage
  const getTenantId = () => {
    // 1. Intentar buscar en localStorage directamente si tu app lo guarda ahí
    const storedTenantId = localStorage.getItem('tenantId');
    if (storedTenantId) return storedTenantId;

    // 2. Intentar decodificar el token JWT guardado (ej. token, access_token, user)
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    if (token) {
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const payload = JSON.parse(jsonPayload);
        if (payload.tenantId) return payload.tenantId;
      } catch (e) {
        console.error('Error al decodificar el JWT para extraer el tenantId', e);
      }
    }

    // 3. Fallback en caso de que guardes el objeto de usuario completo
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.tenantId) return user.tenantId;
      }
    } catch (e) {
      console.error('Error al leer el usuario del localStorage', e);
    }

    return null;
  };

  // Función para cargar los apartamentos del tenant actual de forma dinámica
  const fetchTenantApartments = async () => {
    setIsLoadingApartments(true);
    try {
      const tenantId = getTenantId();
      
      if (!tenantId) {
        console.error('No se encontró el tenantId en la sesión o token.');
        setIsLoadingApartments(false);
        return;
      }

      const { data } = await axios.get(`/api/properties/tenant/${tenantId}/apartments`);
      setTenantApartments(data || []);
    } catch (err) {
      console.error('Error al cargar apartamentos:', err);
    } finally {
      setIsLoadingApartments(false);
    }
  };

  // Cargar apartamentos cuando se abren los modales 2 o 3
  useEffect(() => {
    if (activeModal === 'correspondence' || activeModal === 'contractor') {
      fetchTenantApartments();
    }
  }, [activeModal]);

  // ==========================================
  // LÓGICA DE BÚSQUEDA (MODAL 1)
  // ==========================================
  const handleSearchQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryValue.trim()) return;

    setIsSearching(true);
    setQueryError('');
    setQueryResult(null);

    try {
      let endpoint = '';
      if (queryType === 'plate') {
        endpoint = `/api/properties/vehicles/plate/${encodeURIComponent(queryValue.trim().toUpperCase())}`;
      } else {
        endpoint = `/api/properties/residents/document/${encodeURIComponent(queryValue.trim())}`;
      }

      const { data } = await axios.get(endpoint);
      setQueryResult(data);
    } catch (err: any) {
      setQueryError(err.response?.data?.message || 'No se encontraron registros asociados en la base de datos de este tenant.');
    } finally {
      setIsSearching(false);
    }
  };

  // ==========================================
  // LÓGICA DE CORRESPONDENCIA (MODAL 2)
  // ==========================================
  // ==========================================
  // LÓGICA DE CORRESPONDENCIA / ALERTA (MODAL 2)
  // ==========================================
  const handleCorrespondenceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCorrLoading(true);
    setCorrMessage('');

    try {
      // Llamamos al nuevo endpoint de alerta instantánea sin persistencia
      await axios.post('/api/properties/send-alert', {
        apartmentId: corrForm.apartmentId,
        subject: `Nuevo paquete recibido: ${corrForm.packageType}`,
        message: `Se ha registrado la llegada de un paquete (${corrForm.packageType}) entregado por ${corrForm.provider}. Pase por portería a retirarlo.`,
      });

      setCorrMessage('¡Notificación enviada exitosamente al residente!');
      setCorrForm({ packageType: 'CAJA', provider: '', apartmentId: '' });
      setCorrApartmentFilter('');
    } catch (err: any) {
      setCorrMessage(err.response?.data?.message || 'Error al enviar la notificación.');
    } finally {
      setCorrLoading(false);
    }
  };
  // ==========================================
  // LÓGICA DE CONTRATISTAS (MODAL 3)
  // ==========================================
  const handleContractorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContractorLoading(true);
    setContractorMessage('');

    try {
      await axios.post('/api/contractors-access', contractorForm);
      setContractorMessage('¡Acceso de contratista registrado exitosamente!');
      setContractorForm({
        company: '',
        documentNumber: '',
        fullName: '',
        time: '',
        apartmentId: '',
        procedureType: 'RECONEXION',
      });
      setContractorApartmentFilter('');
    } catch (err: any) {
      setContractorMessage(err.response?.data?.message || 'Error al registrar el acceso.');
    } finally {
      setContractorLoading(false);
    }
  };

  // Filtrado local de apartamentos para correspondencia
  const filteredCorrApartments = tenantApartments.filter((apt: any) => {
    const term = corrApartmentFilter.toLowerCase();
    const matchNumber = apt.number?.toString().toLowerCase().includes(term);
    const matchBlock = apt.block?.toString().toLowerCase().includes(term);
    return matchNumber || matchBlock;
  });

  // Filtrado local de apartamentos para contratistas
  const filteredContractorApartments = tenantApartments.filter((apt: any) => {
    const term = contractorApartmentFilter.toLowerCase();
    const matchNumber = apt.number?.toString().toLowerCase().includes(term);
    const matchBlock = apt.block?.toString().toLowerCase().includes(term);
    return matchNumber || matchBlock;
  });

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      fontFamily: 'sans-serif',
      boxSizing: 'border-box',
      margin: 0,
      padding: '30px',
      backgroundColor: '#0c0c0e',
      backgroundImage: `
        radial-gradient(circle at 50% 50%, rgba(212, 175, 55, 0.08) 0%, rgba(12, 12, 14, 0) 70%),
        linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
      `,
      backgroundSize: '100% 100%, 24px 24px, 24px 24px',
      color: '#ffffff'
    }}>
      <style>{`
        .dashboard-card-btn {
          background: rgba(22, 22, 26, 0.95);
          border: 1px solid rgba(212, 175, 55, 0.25);
          border-radius: 16px;
          padding: 24px;
          cursor: pointer;
          transition: all 0.25s ease;
          display: flex;
          flex-direction: column;
          gap: 10px;
          text-align: left;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
        }
        .dashboard-card-btn:hover {
          border-color: #D4AF37;
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(212, 175, 55, 0.15);
          background: rgba(28, 28, 33, 0.95);
        }
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(5px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .modal-content {
          background: rgba(22, 22, 26, 0.98);
          border: 1px solid rgba(212, 175, 55, 0.3);
          border-radius: 16px;
          width: 100%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          padding: 30px;
          box-shadow: 0 15px 40px rgba(0,0,0,0.6);
          box-sizing: border-box;
        }
        .minuta-input {
          background-color: #121214 !important;
          border: 1px solid #2e2e33 !important;
          color: #ffffff !important;
          padding: 12px 14px;
          border-radius: 8px;
          font-size: 14px;
          outline: none;
          width: 100%;
          box-sizing: border-box;
          font-family: inherit;
        }
        .minuta-input:focus {
          border-color: #D4AF37 !important;
          box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.15) !important;
        }
        .input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 16px;
        }
        .input-label {
          color: rgba(212, 175, 55, 0.9);
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .submit-btn {
          width: 100%;
          background: #D4AF37;
          color: #0c0c0e;
          border: none;
          padding: 12px;
          font-size: 14px;
          font-weight: 700;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(212, 175, 55, 0.2);
          margin-top: 10px;
        }
        .submit-btn:hover:not(:disabled) {
          background: #e5be49;
          transform: translateY(-1px);
        }
        .submit-btn:disabled {
          background: #5a4b22;
          color: #a3a3a3;
          cursor: not-allowed;
        }
        .close-modal-btn {
          background: transparent;
          border: 1px solid #2e2e33;
          color: #a3a3a3;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          float: right;
        }
        .close-modal-btn:hover {
          border-color: #D4AF37;
          color: #ffffff;
        }
      `}</style>

      {/* ENCABEZADO */}
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px', color: '#ffffff' }}>
        Dashboard Global de Monitoreo
      </h2>
      <p style={{ color: '#a3a3a3', marginBottom: '30px', fontSize: '14px' }}>
        Bienvenido al panel general. Seleccione una opción para gestionar los controles de portería.
      </p>

      {/* GRILLA DE BOTONES PRINCIPALES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
        
        {/* BOTÓN 1: CONSULTAR VEHÍCULO / PROPIETARIO */}
        <button className="dashboard-card-btn" onClick={() => setActiveModal('vehicle')}>
          <span style={{ fontSize: '24px' }}>🔍</span>
          <h3 style={{ margin: 0, color: '#D4AF37', fontSize: '16px' }}>Consultar Vehículo / Propietario</h3>
          <p style={{ margin: 0, color: '#a3a3a3', fontSize: '12px' }}>
            Verifica el registro en la base de datos del tenant por placa o cédula.
          </p>
        </button>

        {/* BOTÓN 2: CONTROL DE CORRESPONDENCIA */}
        <button className="dashboard-card-btn" onClick={() => setActiveModal('correspondence')}>
          <span style={{ fontSize: '24px' }}>📦</span>
          <h3 style={{ margin: 0, color: '#D4AF37', fontSize: '16px' }}>Control de Correspondencia</h3>
          <p style={{ margin: 0, color: '#a3a3a3', fontSize: '12px' }}>
            Registra paquetes, sobres, entregas y notifica al residente.
          </p>
        </button>

        {/* BOTÓN 3: CONTROL DE ACCESO CONTRATISTAS */}
        <button className="dashboard-card-btn" onClick={() => setActiveModal('contractor')}>
          <span style={{ fontSize: '24px' }}>🛠️</span>
          <h3 style={{ margin: 0, color: '#D4AF37', fontSize: '16px' }}>Control de Acceso Contratistas</h3>
          <p style={{ margin: 0, color: '#a3a3a3', fontSize: '12px' }}>
            Gestiona ingresos de personal externo, empresas y procedimientos.
          </p>
        </button>

      </div>

      {/* ========================================== */}
      {/* MODAL 1: CONSULTAR VEHÍCULO / PROPIETARIO */}
      {/* ========================================== */}
      {activeModal === 'vehicle' && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="close-modal-btn" onClick={() => setActiveModal(null)}>✕ Cerrar</button>
            <h3 style={{ color: '#ffffff', marginTop: 0, marginBottom: '6px' }}>Consulta de Vehículos y Propietarios</h3>
            <p style={{ color: '#a3a3a3', fontSize: '12px', marginBottom: '20px' }}>Busca información cruzada en el sistema del conjunto.</p>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <button 
                type="button" 
                onClick={() => setQueryType('plate')}
                style={{
                  flex: 1, padding: '8px', borderRadius: '6px', cursor: 'pointer',
                  background: queryType === 'plate' ? '#D4AF37' : '#121214',
                  color: queryType === 'plate' ? '#0c0c0e' : '#ffffff',
                  border: '1px solid #2e2e33', fontWeight: 'bold', fontSize: '12px'
                }}>
                Por Placa Vehicular
              </button>
              <button 
                type="button" 
                onClick={() => setQueryType('document')}
                style={{
                  flex: 1, padding: '8px', borderRadius: '6px', cursor: 'pointer',
                  background: queryType === 'document' ? '#D4AF37' : '#121214',
                  color: queryType === 'document' ? '#0c0c0e' : '#ffffff',
                  border: '1px solid #2e2e33', fontWeight: 'bold', fontSize: '12px'
                }}>
                Por Cédula Propietario
              </button>
            </div>

            <form onSubmit={handleSearchQuery}>
              <div className="input-group">
                <label className="input-label">{queryType === 'plate' ? 'Placa del Vehículo' : 'Número de Cédula'}</label>
                <input
                  className="minuta-input"
                  placeholder={queryType === 'plate' ? 'Ej. ZMX456' : 'Ej. 10203040'}
                  value={queryValue}
                  onChange={(e) => setQueryValue(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="submit-btn" disabled={isSearching}>
                {isSearching ? 'Consultando...' : 'Buscar en Base de Datos'}
              </button>
            </form>

            {queryError && <p style={{ color: '#f87171', fontSize: '12px', marginTop: '16px', textAlign: 'center' }}>{queryError}</p>}

            {queryResult && (
              <div style={{ marginTop: '20px', background: '#121214', border: '1px solid #2e2e33', borderRadius: '8px', padding: '16px', fontSize: '13px' }}>
                <p style={{ color: '#4ade80', fontWeight: 'bold', margin: '0 0 12px 0', borderBottom: '1px solid #2e2e33', paddingBottom: '8px' }}>
                  ✓ Registro Encontrado ({queryType === 'plate' ? 'Vehículo' : 'Apartamento / Propietario'}):
                </p>

                {queryType === 'plate' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: '#e5e5e5' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', background: '#1a1a1e', padding: '10px', borderRadius: '6px' }}>
                      <span style={{ color: '#a3a3a3' }}>Placa:</span>
                      <strong style={{ color: '#D4AF37', fontSize: '15px', letterSpacing: '1px' }}>{queryResult.plate}</strong>
                    </div>
                    <p style={{ margin: '4px 0' }}><strong>Marca:</strong> {queryResult.brand || 'N/A'}</p>
                    <p style={{ margin: '4px 0' }}><strong>Color:</strong> {queryResult.color || 'N/A'}</p>
                    <p style={{ margin: '4px 0' }}><strong>Parqueadero Asignado:</strong> #{queryResult.parkingSpot?.number || 'Sin parqueadero'}</p>
                    <p style={{ margin: '4px 0' }}>
                      <strong>Apartamento:</strong> {queryResult.parkingSpot?.apartment ? `${queryResult.parkingSpot.apartment.block} - Apto ${queryResult.parkingSpot.apartment.number}` : 'N/A'}
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', color: '#e5e5e5' }}>
                    <div style={{ background: '#1a1a1e', padding: '10px', borderRadius: '6px' }}>
                      <span style={{ color: '#a3a3a3', fontSize: '11px', textTransform: 'uppercase', display: 'block' }}>Apartamento:</span>
                      <strong style={{ color: '#D4AF37', fontSize: '16px' }}>
                        {queryResult.block ? `${queryResult.block} - ` : ''}Apto {queryResult.number}
                      </strong>
                    </div>

                    <div>
                      <span style={{ color: '#a3a3a3', fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold' }}>Residentes Registrados:</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                        {queryResult.residents?.map((res: any, idx: number) => (
                          <div key={idx} style={{ background: '#16161a', padding: '8px 10px', borderRadius: '6px', borderLeft: '3px solid #D4AF37' }}>
                            <p style={{ margin: 0, fontWeight: 'bold', color: '#ffffff' }}>{res.fullName}</p>
                            <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#a3a3a3' }}>
                              Cédula: {res.documentId} | Tel: {res.phone || 'No registrado'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span style={{ color: '#a3a3a3', fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold' }}>Parqueaderos y Vehículos:</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                        {queryResult.parkingSpots?.length > 0 ? (
                          queryResult.parkingSpots.map((spot: any, idx: number) => (
                            <div key={idx} style={{ background: '#16161a', padding: '8px 10px', borderRadius: '6px' }}>
                              <p style={{ margin: 0, fontWeight: 'bold', color: '#4ade80' }}>Puesto #{spot.number}</p>
                              {spot.vehicles?.length > 0 ? (
                                <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                  {spot.vehicles.map((v: any, vIdx: number) => (
                                    <span key={vIdx} style={{ background: '#222228', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', border: '1px solid #333' }}>
                                      🚗 <strong>{v.plate}</strong> ({v.brand} - {v.color})
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#737373', fontStyle: 'italic' }}>Sin vehículos parqueados</p>
                              )}
                            </div>
                          ))
                        ) : (
                          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#737373', fontStyle: 'italic' }}>Sin parqueaderos asignados</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 2: CONTROL DE CORRESPONDENCIA      */}
      {/* ========================================== */}
      {activeModal === 'correspondence' && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="close-modal-btn" onClick={() => setActiveModal(null)}>✕ Cerrar</button>
            <h3 style={{ color: '#ffffff', marginTop: 0, marginBottom: '6px' }}>Registro de Correspondencia</h3>
            <p style={{ color: '#a3a3a3', fontSize: '12px', marginBottom: '20px' }}>Filtra y selecciona el apartamento destino.</p>

            {/* FILTRADO DE APARTAMENTOS */}
            <div style={{ background: '#121214', border: '1px solid #2e2e33', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
              <label className="input-label" style={{ marginBottom: '6px', display: 'block' }}>🔍 Filtrar Apartamentos</label>
              <input
                className="minuta-input"
                placeholder="Escribe número de apto o bloque (ej. 302, Torre 1)..."
                value={corrApartmentFilter}
                onChange={(e) => setCorrApartmentFilter(e.target.value)}
              />

              <div style={{ marginTop: '10px', maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {isLoadingApartments ? (
                  <p style={{ color: '#a3a3a3', fontSize: '12px', textAlign: 'center', margin: '10px 0' }}>Cargando apartamentos...</p>
                ) : filteredCorrApartments.length > 0 ? (
                  filteredCorrApartments.map((apt: any) => {
                    const aptId = apt.id || apt._id;
                    const isSelected = corrForm.apartmentId === aptId;
                    return (
                      <div
                        key={aptId}
                        onClick={() => setCorrForm({ ...corrForm, apartmentId: aptId })}
                        style={{
                          background: isSelected ? 'rgba(212, 175, 55, 0.15)' : '#1a1a1e',
                          border: `1px solid ${isSelected ? '#D4AF37' : '#2e2e33'}`,
                          padding: '8px 10px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <span style={{ color: isSelected ? '#D4AF37' : '#ffffff', fontWeight: isSelected ? 'bold' : 'normal', fontSize: '13px' }}>
                          {apt.block ? `${apt.block} - ` : ''}Apto {apt.number}
                        </span>
                        {isSelected && <span style={{ color: '#4ade80', fontSize: '12px' }}>✓ Seleccionado</span>}
                      </div>
                    );
                  })
                ) : (
                  <p style={{ color: '#737373', fontSize: '12px', textAlign: 'center', margin: '10px 0', fontStyle: 'italic' }}>
                    No se encontraron apartamentos con ese filtro.
                  </p>
                )}
              </div>
            </div>

            <form onSubmit={handleCorrespondenceSubmit}>
              <div className="input-group">
                <label className="input-label">Tipo de Paquete</label>
                <select
                  className="minuta-input"
                  value={corrForm.packageType}
                  onChange={(e) => setCorrForm({ ...corrForm, packageType: e.target.value })}
                >
                  {PACKAGE_TYPES.map((type) => (
                    <option key={type} value={type} style={{ background: '#121214' }}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Proveedor / Quién Entrega</label>
                <input
                  className="minuta-input"
                  placeholder="Ej. Servientrega, Rappi, Coordinadora..."
                  value={corrForm.provider}
                  onChange={(e) => setCorrForm({ ...corrForm, provider: e.target.value })}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Apartamento Seleccionado (ID)</label>
                <input
                  className="minuta-input"
                  placeholder="Selecciona un apartamento de la lista superior"
                  value={corrForm.apartmentId}
                  readOnly
                  required
                  style={{ color: '#D4AF37', fontWeight: 'bold' }}
                />
              </div>

              {corrMessage && (
                <p style={{ color: corrMessage.includes('exitosamente') ? '#4ade80' : '#f87171', fontSize: '12px', textAlign: 'center' }}>
                  {corrMessage}
                </p>
              )}

              <button type="submit" className="submit-btn" disabled={corrLoading || !corrForm.apartmentId}>
                {corrLoading ? 'Registrando...' : 'Notificar / Registrar Paquete'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 3: CONTROL DE ACCESO CONTRATISTAS    */}
      {/* ========================================== */}
      {activeModal === 'contractor' && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="close-modal-btn" onClick={() => setActiveModal(null)}>✕ Cerrar</button>
            <h3 style={{ color: '#ffffff', marginTop: 0, marginBottom: '6px' }}>Acceso de Contratistas y Técnicos</h3>
            <p style={{ color: '#a3a3a3', fontSize: '12px', marginBottom: '20px' }}>Filtra y selecciona el apartamento que autoriza.</p>

            {/* FILTRADO DE APARTAMENTOS */}
            <div style={{ background: '#121214', border: '1px solid #2e2e33', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
              <label className="input-label" style={{ marginBottom: '6px', display: 'block' }}>🔍 Filtrar Apartamentos</label>
              <input
                className="minuta-input"
                placeholder="Escribe número de apto o bloque (ej. 302, Torre 1)..."
                value={contractorApartmentFilter}
                onChange={(e) => setContractorApartmentFilter(e.target.value)}
              />

              <div style={{ marginTop: '10px', maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {isLoadingApartments ? (
                  <p style={{ color: '#a3a3a3', fontSize: '12px', textAlign: 'center', margin: '10px 0' }}>Cargando apartamentos...</p>
                ) : filteredContractorApartments.length > 0 ? (
                  filteredContractorApartments.map((apt: any) => {
                    const aptId = apt.id || apt._id;
                    const isSelected = contractorForm.apartmentId === aptId;
                    return (
                      <div
                        key={aptId}
                        onClick={() => setContractorForm({ ...contractorForm, apartmentId: aptId })}
                        style={{
                          background: isSelected ? 'rgba(212, 175, 55, 0.15)' : '#1a1a1e',
                          border: `1px solid ${isSelected ? '#D4AF37' : '#2e2e33'}`,
                          padding: '8px 10px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <span style={{ color: isSelected ? '#D4AF37' : '#ffffff', fontWeight: isSelected ? 'bold' : 'normal', fontSize: '13px' }}>
                          {apt.block ? `${apt.block} - ` : ''}Apto {apt.number}
                        </span>
                        {isSelected && <span style={{ color: '#4ade80', fontSize: '12px' }}>✓ Seleccionado</span>}
                      </div>
                    );
                  })
                ) : (
                  <p style={{ color: '#737373', fontSize: '12px', textAlign: 'center', margin: '10px 0', fontStyle: 'italic' }}>
                    No se encontraron apartamentos con ese filtro.
                  </p>
                )}
              </div>
            </div>

            <form onSubmit={handleContractorSubmit}>
              <div className="input-group">
                <label className="input-label">Empresa</label>
                <input
                  className="minuta-input"
                  placeholder="Ej. Claro, Enel, Gas Natural..."
                  value={contractorForm.company}
                  onChange={(e) => setContractorForm({ ...contractorForm, company: e.target.value })}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Cédula / Documento</label>
                <input
                  className="minuta-input"
                  placeholder="Número de identificación"
                  value={contractorForm.documentNumber}
                  onChange={(e) => setContractorForm({ ...contractorForm, documentNumber: e.target.value })}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Nombre Completo</label>
                <input
                  className="minuta-input"
                  placeholder="Nombre del operario"
                  value={contractorForm.fullName}
                  onChange={(e) => setContractorForm({ ...contractorForm, fullName: e.target.value })}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Hora de Ingreso</label>
                <input
                  type="time"
                  className="minuta-input"
                  value={contractorForm.time}
                  onChange={(e) => setContractorForm({ ...contractorForm, time: e.target.value })}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Apartamento que Autoriza (ID)</label>
                <input
                  className="minuta-input"
                  placeholder="Selecciona un apartamento de la lista superior"
                  value={contractorForm.apartmentId}
                  readOnly
                  required
                  style={{ color: '#D4AF37', fontWeight: 'bold' }}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Tipo de Procedimiento</label>
                <select
                  className="minuta-input"
                  value={contractorForm.procedureType}
                  onChange={(e) => setContractorForm({ ...contractorForm, procedureType: e.target.value })}
                >
                  {PROCEDURE_TYPES.map((type) => (
                    <option key={type} value={type} style={{ background: '#121214' }}>{type}</option>
                  ))}
                </select>
              </div>

              {contractorMessage && (
                <p style={{ color: contractorMessage.includes('exitosamente') ? '#4ade80' : '#f87171', fontSize: '12px', textAlign: 'center' }}>
                  {contractorMessage}
                </p>
              )}

              <button type="submit" className="submit-btn" disabled={contractorLoading || !contractorForm.apartmentId}>
                {contractorLoading ? 'Guardando...' : 'Registrar Ingreso de Contratista'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}