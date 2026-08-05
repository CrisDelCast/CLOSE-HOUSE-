import { useState, useEffect } from 'react';
import axios from '../../api/axios';

export default function PuertaDashboard() {
  // Estados para controlar los modales (añadido 'visitor')
  const [activeModal, setActiveModal] = useState<'vehicle' | 'correspondence' | 'contractor' | 'visitor' | null>(null);

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
    status: 'PENDING',
  });
  const [contractorLoading, setContractorLoading] = useState(false);
  const [contractorMessage, setContractorMessage] = useState('');
  const [contractorApartmentFilter, setContractorApartmentFilter] = useState('');

  // Estados para contratistas programados del apartamento seleccionado
  const [scheduledContractors, setScheduledContractors] = useState<any[]>([]);
  const [loadingScheduled, setLoadingScheduled] = useState(false);

  // ==========================================
  // ESTADOS PARA NUEVO MODAL 4: CONTROL DE VISITANTES (PEATONAL)
  // ==========================================
  const [visitorForm, setVisitorForm] = useState({
    fullName: '',
    documentType: 'Cédula',
    documentId: '',
    apartmentId: '',
    residentId: '',
    phone: '',
    vehiclePlate: '',
    purpose: '',
    notes: '',
  });
  const [visitorLoading, setVisitorLoading] = useState(false);
  const [visitorMessage, setVisitorMessage] = useState('');
  const [visitorApartmentFilter, setVisitorApartmentFilter] = useState('');
  const [apartmentResidents, setApartmentResidents] = useState<any[]>([]);
  const [loadingResidents, setLoadingResidents] = useState(false);
  
  // 👉 Estados nuevos para consultar los visitantes específicos del residente seleccionado de forma dinámica
  const [residentVisitors, setResidentVisitors] = useState<any[]>([]);
  const [loadingResidentVisitors, setLoadingResidentVisitors] = useState(false);

  // Listas de opciones requeridas
  const PACKAGE_TYPES = [
    'CAJA', 'COMIDA', 'MEDICAMENTO', 'CAPACITACIONES', 
    'SERVICIOS PUBLICOS', 'IMPUESTOS', 'BOLSAS', 'SOBRES', 'CARTA ADMINISTRACION'
  ];

  const PROCEDURE_TYPES = [
    'RECONEXION', 'CORTE', 'INSTALACION', 'INSPECCION', 'REPARACION'
  ];

  const STATUS_TYPES = [
    { label: 'Pendiente', value: 'PENDING' },
    { label: 'Aprobado', value: 'APPROVED' },
    { label: 'No Aprobado', value: 'REJECTED' }
  ];

  const DOCUMENT_TYPES = ['Cédula', 'Pasaporte', 'Cédula Extranjería', 'Tarjeta de Identidad', 'NIT'];

  // Función para obtener dinámicamente el tenantId desde el token JWT o localStorage
  const getTenantId = () => {
    const storedTenantId = localStorage.getItem('tenantId');
    if (storedTenantId) return storedTenantId;

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

  // Cargar apartamentos cuando se abren los modales correspondientes
  useEffect(() => {
    if (activeModal === 'correspondence' || activeModal === 'contractor' || activeModal === 'visitor') {
      fetchTenantApartments();
    }
  }, [activeModal]);

  // Función para consultar contratistas del apartamento seleccionado
  const fetchScheduledContractors = async (apartmentId: string) => {
    if (!apartmentId) {
      setScheduledContractors([]);
      return;
    }

    setLoadingScheduled(true);
    try {
      const response = await axios.get(`/api/contractors-access/apartment/${apartmentId}`);
      setScheduledContractors(response.data);
    } catch (err) {
      console.error('Error al cargar contratistas programados', err);
      setScheduledContractors([]);
    } finally {
      setLoadingScheduled(false);
    }
  };

  // Función para cargar los residentes del apartamento seleccionado (para visitantes)
  const fetchApartmentResidents = async (apartmentId: string) => {
    if (!apartmentId) {
      setApartmentResidents([]);
      return;
    }

    setLoadingResidents(true);
    try {
      const response = await axios.get(`/api/properties/apartments/${apartmentId}/residents`);
      setApartmentResidents(response.data || []);
    } catch (err) {
      console.error('Error al cargar residentes del apartamento', err);
      setApartmentResidents([]);
    } finally {
      setLoadingResidents(false);
    }
  };

  // 👉 Función para buscar los visitantes asociados al residente seleccionado
  const fetchResidentVisitors = async (residentId: string) => {
    if (!residentId) {
      setResidentVisitors([]);
      return;
    }
    setLoadingResidentVisitors(true);
    try {
      const tenantId = getTenantId();
  
      const response = await axios.get(`/api/visitors`, {
        params: { 
          residentId 
        },
        headers: {
          'x-tenant-id': tenantId 
        }
      });
      setResidentVisitors(response.data || []);
    } catch (err) {
      console.error('Error al cargar los visitantes del residente:', err);
      setResidentVisitors([]);
    } finally {
      setLoadingResidentVisitors(false);
    }
  };

  // 👉 Función para marcar la salida (Check-Out) de un visitante
  const handleCheckOut = async (visitorId: string) => {
    try {
      const tenantId = getTenantId();
      
      await axios.patch(`/api/visitors/${visitorId}/check-out`, {}, {
        headers: {
          'x-tenant-id': tenantId
        }
      });

      // Recarga la lista de visitantes del residente actual para reflejar el cambio
      if (visitorForm.residentId) {
        fetchResidentVisitors(visitorForm.residentId);
      }
    } catch (error) {
      console.error('Error al registrar la salida del visitante:', error);
    }
  };

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
  // LÓGICA DE CORRESPONDENCIA / ALERTA (MODAL 2)
  // ==========================================
  const handleCorrespondenceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCorrLoading(true);
    setCorrMessage('');

    try {
      await axios.post('/api/properties/send-alert', {
        apartmentId: corrForm.apartmentId,
        subject: `📦 Nuevo paquete recibido: ${corrForm.packageType}`,
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
      const responseContractor = await axios.post('/api/contractors-access', contractorForm);
      const newContractorId = responseContractor.data.id || responseContractor.data._id;
  
      const selectedApt = tenantApartments.find(apt => (apt.id || apt._id) === contractorForm.apartmentId);
      const aptNumberStr = selectedApt ? `Apto ${selectedApt.number}` : 'su apartamento';
  
      const isLocalDev = true; 
      const ngrokUrl = 'https://starlit-handball-chief.ngrok-free.dev'; 
      const railwayUrl = import.meta.env.VITE_BACKEND_URL || 'https://motivated-kindness-production-e60a.up.railway.app/'; 
      const backendUrl = isLocalDev ? ngrokUrl : railwayUrl;
  
      await axios.post('/api/properties/send-alert', {
        apartmentId: contractorForm.apartmentId,
        isHtml: true, 
        subject: `🛠️ Autorización Requerida: Contratista ${contractorForm.company} (${contractorForm.procedureType})`,
        message: 'Solicitud de ingreso de contratista pendiente de aprobación.',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f5; border-radius: 8px; color: #18181b;">
            <h2 style="color: #27272a; margin-top: 0;">Solicitud de Ingreso a Portería</h2>
            <p>Se ha registrado una solicitud de acceso para su apartamento <strong>(${aptNumberStr})</strong>:</p>
            
            <div style="background: #ffffff; padding: 15px; border-radius: 6px; border: 1px solid #e4e4e7; margin: 15px 0;">
              <p style="margin: 5px 0;"><strong>Empresa:</strong> ${contractorForm.company}</p>
              <p style="margin: 5px 0;"><strong>Técnico:</strong> ${contractorForm.fullName}</p>
              <p style="margin: 5px 0;"><strong>Documento:</strong> ${contractorForm.documentNumber}</p>
              <p style="margin: 5px 0;"><strong>Procedimiento:</strong> ${contractorForm.procedureType}</p>
              <p style="margin: 5px 0;"><strong>Hora programada:</strong> ${contractorForm.time}</p>
            </div>
  
            <p style="text-align: center; font-weight: bold; margin: 20px 0 10px 0;">Por favor, seleccione una opción:</p>
            
            <div style="text-align: center;">
              <a href="${backendUrl}/api/contractors-access/respond?id=${newContractorId}&action=APPROVED" 
                 style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-right: 10px;">
                ✅ Aprobar Acceso
              </a>
              
              <a href="${backendUrl}/api/contractors-access/respond?id=${newContractorId}&action=REJECTED" 
                 style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                ❌ No Aprobar
              </a>
            </div>
            
            <p style="font-size: 11px; color: #71717a; text-align: center; margin-top: 25px;">
              Este es un correo automático generado por el sistema de control de portería.
            </p>
          </div>
        `
      });
  
      setContractorMessage('¡Acceso registrado y correo enviado con éxito!');
    } catch (err: any) {
      setContractorMessage(err.response?.data?.message || 'Error al procesar la solicitud.');
    } finally {
      setContractorLoading(false);
    }
  };

  // ==========================================
  // LÓGICA DE VISITANTES / PEATONAL (MODAL 4)
  // ==========================================
  const handleVisitorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVisitorLoading(true);
    setVisitorMessage('');

    try {
      const tenantId = getTenantId();

      const payload: any = {
        fullName: visitorForm.fullName,
        documentType: visitorForm.documentType,
        documentId: visitorForm.documentId,
        apartmentId: visitorForm.apartmentId,
        tenantId: tenantId,
      };

      if (visitorForm.residentId) payload.residentId = visitorForm.residentId;
      if (visitorForm.phone) payload.phone = visitorForm.phone;
      if (visitorForm.vehiclePlate) payload.vehiclePlate = visitorForm.vehiclePlate;
      if (visitorForm.purpose) payload.purpose = visitorForm.purpose;
      if (visitorForm.notes) payload.notes = visitorForm.notes;

      const responseVisitor = await axios.post('/api/visitors', payload, {
        headers: {
          'x-tenant-id': tenantId,
        },
      });

      const newVisitorId = responseVisitor.data.id || responseVisitor.data._id;

      const selectedApt = tenantApartments.find(apt => (apt.id || apt._id) === visitorForm.apartmentId);
      const aptNumberStr = selectedApt ? `Apto ${selectedApt.number}` : 'su apartamento';

      const selectedResident = apartmentResidents.find(res => (res.id || res._id) === visitorForm.residentId);
      const residentEmail = selectedResident ? selectedResident.email : null;

      // Detecta automáticamente si estás corriendo de forma local o en producción
      const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const ngrokUrl = 'https://starlit-handball-chief.ngrok-free.dev'; 
      const railwayUrl = import.meta.env.VITE_BACKEND_URL || 'https://motivated-kindness-production-e60a.up.railway.app'; 
      const backendUrl = isLocalDev ? ngrokUrl : railwayUrl;

      await axios.post('/api/properties/send-alert', {
        apartmentId: visitorForm.apartmentId,
        email: residentEmail,
        isHtml: true, 
        subject: `👤 Autorización Requerida: Visitante ${visitorForm.fullName} (${visitorForm.purpose || 'Visita'})`,
        message: 'Solicitud de ingreso de visitante pendiente de aprobación.',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f5; border-radius: 8px; color: #18181b;">
            <h2 style="color: #27272a; margin-top: 0;">Solicitud de Ingreso de Visitante</h2>
            <p>Se ha registrado un visitante en portería para su apartamento <strong>(${aptNumberStr})</strong>:</p>
            
            <div style="background: #ffffff; padding: 15px; border-radius: 6px; border: 1px solid #e4e4e7; margin: 15px 0;">
              <p style="margin: 5px 0;"><strong>Nombre:</strong> ${visitorForm.fullName}</p>
              <p style="margin: 5px 0;"><strong>Documento:</strong> ${visitorForm.documentType} - ${visitorForm.documentId}</p>
              <p style="margin: 5px 0;"><strong>Propósito:</strong> ${visitorForm.purpose || 'No especificado'}</p>
              <p style="margin: 5px 0;"><strong>Vehículo (Placa):</strong> ${visitorForm.vehiclePlate || 'Ingreso peatonal'}</p>
            </div>
  
            <p style="text-align: center; font-weight: bold; margin: 20px 0 10px 0;">Por favor, seleccione una opción:</p>
            
            <div style="text-align: center;">
              <a href="${backendUrl}/api/visitors/respond?id=${newVisitorId}&action=APPROVED" 
                 style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-right: 10px;">
                ✅ Aprobar Acceso
              </a>
              
              <a href="${backendUrl}/api/visitors/respond?id=${newVisitorId}&action=DENIED" 
                 style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                ❌ No Aprobar
              </a>
            </div>
            
            <p style="font-size: 11px; color: #71717a; text-align: center; margin-top: 25px;">
              Este es un correo automático generado por el sistema de control de portería.
            </p>
          </div>
        `
      });

      setVisitorMessage('¡Visitante registrado y notificación enviada al residente con éxito!');
      setVisitorForm({
        fullName: '',
        documentType: 'Cédula',
        documentId: '',
        apartmentId: '',
        residentId: '',
        phone: '',
        vehiclePlate: '',
        purpose: '',
        notes: '',
      });
      setVisitorApartmentFilter('');
      setApartmentResidents([]);
      setResidentVisitors([]);
    } catch (err: any) {
      setVisitorMessage(err.response?.data?.message || 'Error al registrar el visitante.');
    } finally {
      setVisitorLoading(false);
    }
  };

  // Filtrado local de apartamentos
  const filteredCorrApartments = tenantApartments.filter((apt: any) => {
    const term = corrApartmentFilter.toLowerCase();
    return apt.number?.toString().toLowerCase().includes(term) || apt.block?.toString().toLowerCase().includes(term);
  });

  const filteredContractorApartments = tenantApartments.filter((apt: any) => {
    const term = contractorApartmentFilter.toLowerCase();
    return apt.number?.toString().toLowerCase().includes(term) || apt.block?.toString().toLowerCase().includes(term);
  });

  const filteredVisitorApartments = tenantApartments.filter((apt: any) => {
    const term = visitorApartmentFilter.toLowerCase();
    return apt.number?.toString().toLowerCase().includes(term) || apt.block?.toString().toLowerCase().includes(term);
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
        input[type="time"].minuta-input::-webkit-calendar-picker-indicator {
          filter: invert(1);
          cursor: pointer;
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
        .checkout-btn {
          background: #dc2626;
          color: #ffffff;
          border: none;
          padding: 4px 8px;
          font-size: 11px;
          font-weight: bold;
          border-radius: 4px;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        .checkout-btn:hover {
          background: #b91c1c;
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

        {/* BOTÓN 4: CONTROL DE ACCESO PEATONAL (VISITANTES) */}
        <button className="dashboard-card-btn" onClick={() => setActiveModal('visitor')}>
          <span style={{ fontSize: '24px' }}>👤</span>
          <h3 style={{ margin: 0, color: '#D4AF37', fontSize: '16px' }}>Control Acceso Peatonal</h3>
          <p style={{ margin: 0, color: '#a3a3a3', fontSize: '12px' }}>
            Registra visitantes, selecciona apartamento y asócialos con el residente.
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
            <p style={{ color: '#a3a3a3', fontSize: '12px', marginBottom: '20px' }}>Filtra y selecciona el apartamento destino para notificar el paquete.</p>

            <div style={{ background: '#121214', border: '1px solid #2e2e33', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
              <label className="input-label" style={{ marginBottom: '6px', display: 'block' }}>🔍 Filtrar Apartamentos</label>
              <input
                className="minuta-input"
                placeholder="Escribe número de apto o bloque (ej. 302, Torre 1)..."
                value={corrApartmentFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setCorrApartmentFilter(val);
                  if (!val) {
                    setCorrForm(prev => ({ ...prev, apartmentId: '' }));
                  }
                }}
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
                        onClick={() => setCorrForm(prev => ({ ...prev, apartmentId: aptId }))}
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
      {/* MODAL 3: CONTROL DE ACCESO CONTRATISTAS   */}
      {/* ========================================== */}
      {activeModal === 'contractor' && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="close-modal-btn" onClick={() => setActiveModal(null)}>✕ Cerrar</button>
            <h3 style={{ color: '#ffffff', marginTop: 0, marginBottom: '6px' }}>Acceso de Contratistas y Técnicos</h3>
            <p style={{ color: '#a3a3a3', fontSize: '12px', marginBottom: '20px' }}>Filtra y selecciona el apartamento que autoriza.</p>

            <div style={{ background: '#121214', border: '1px solid #2e2e33', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
              <label className="input-label" style={{ marginBottom: '6px', display: 'block' }}>🔍 Filtrar Apartamentos</label>
              <input
                className="minuta-input"
                placeholder="Escribe número de apto o bloque (ej. 302, Torre 1)..."
                value={contractorApartmentFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setContractorApartmentFilter(val);
                  if (!val) {
                    setContractorForm(prev => ({ ...prev, apartmentId: '' }));
                    setScheduledContractors([]);
                  }
                }}
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
                        onClick={() => {
                          setContractorForm(prev => ({ ...prev, apartmentId: aptId }));
                          fetchScheduledContractors(aptId);
                        }}
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

            {contractorForm.apartmentId && (
              <div style={{ background: '#121214', border: '1px solid #2e2e33', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
                <label className="input-label" style={{ marginBottom: '6px', display: 'block' }}>📋 Contratistas Programados / Registrados</label>
                {loadingScheduled ? (
                  <p style={{ color: '#a3a3a3', fontSize: '12px', textAlign: 'center', margin: '10px 0' }}>Consultando accesos...</p>
                ) : scheduledContractors.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '120px', overflowY: 'auto' }}>
                    {scheduledContractors.map((item: any, idx: number) => (
                      <div key={idx} style={{ background: '#1a1a1e', padding: '8px', borderRadius: '6px', fontSize: '12px', borderLeft: '3px solid #D4AF37' }}>
                        <p style={{ margin: 0, fontWeight: 'bold', color: '#ffffff' }}>{item.fullName} ({item.company})</p>
                        <p style={{ margin: '2px 0 0 0', color: '#a3a3a3' }}>Hora: {item.time || 'N/A'} | Procedimiento: {item.procedureType} | Estado: <strong>{item.status}</strong></p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#737373', fontSize: '12px', textAlign: 'center', margin: '8px 0', fontStyle: 'italic' }}>
                    No hay registros previos para este apartamento.
                  </p>
                )}
              </div>
            )}

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
                <label className="input-label">Número de Documento</label>
                <input
                  className="minuta-input"
                  placeholder="Cédula del técnico"
                  value={contractorForm.documentNumber}
                  onChange={(e) => setContractorForm({ ...contractorForm, documentNumber: e.target.value })}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Nombre Completo</label>
                <input
                  className="minuta-input"
                  placeholder="Nombre del técnico"
                  value={contractorForm.fullName}
                  onChange={(e) => setContractorForm({ ...contractorForm, fullName: e.target.value })}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Hora Estimada / Programada</label>
                <input
                  type="time"
                  className="minuta-input"
                  value={contractorForm.time}
                  onChange={(e) => setContractorForm({ ...contractorForm, time: e.target.value })}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Tipo de Procedimiento</label>
                <select
                  className="minuta-input"
                  value={contractorForm.procedureType}
                  onChange={(e) => setContractorForm({ ...contractorForm, procedureType: e.target.value })}
                >
                  {PROCEDURE_TYPES.map((proc) => (
                    <option key={proc} value={proc} style={{ background: '#121214' }}>{proc}</option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Estado Inicial del Acceso</label>
                <select
                  className="minuta-input"
                  value={contractorForm.status}
                  onChange={(e) => setContractorForm({ ...contractorForm, status: e.target.value })}
                >
                  {STATUS_TYPES.map((st) => (
                    <option key={st.value} value={st.value} style={{ background: '#121214' }}>{st.label}</option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Apartamento Seleccionado (ID)</label>
                <input
                  className="minuta-input"
                  placeholder="Selecciona un apartamento de la lista superior"
                  value={contractorForm.apartmentId}
                  readOnly
                  required
                  style={{ color: '#D4AF37', fontWeight: 'bold' }}
                />
              </div>

              {contractorMessage && (
                <p style={{ color: contractorMessage.includes('exitosamente') ? '#4ade80' : '#f87171', fontSize: '12px', textAlign: 'center' }}>
                  {contractorMessage}
                </p>
              )}

              <button type="submit" className="submit-btn" disabled={contractorLoading || !contractorForm.apartmentId}>
                {contractorLoading ? 'Registrando y Notificando...' : 'Registrar Acceso y Notificar Residente'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 4: CONTROL DE ACCESO PEATONAL (VISITANTES) */}
      {/* ========================================== */}
      {activeModal === 'visitor' && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="close-modal-btn" onClick={() => setActiveModal(null)}>✕ Cerrar</button>
            <h3 style={{ color: '#ffffff', marginTop: 0, marginBottom: '6px' }}>Control de Acceso Peatonal (Visitantes)</h3>
            <p style={{ color: '#a3a3a3', fontSize: '12px', marginBottom: '20px' }}>Busca el apartamento destino, selecciona el residente anfitrión y registra al visitante.</p>

            {/* FILTRADO DE APARTAMENTOS */}
            <div style={{ background: '#121214', border: '1px solid #2e2e33', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
              <label className="input-label" style={{ marginBottom: '6px', display: 'block' }}>🔍 Filtrar Apartamento Destino *</label>
              <input
                className="minuta-input"
                placeholder="Escribe número de apto o bloque (ej. 302, Torre 1)..."
                value={visitorApartmentFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setVisitorApartmentFilter(val);
                  if (!val) {
                    setVisitorForm(prev => ({ ...prev, apartmentId: '', residentId: '' }));
                    setApartmentResidents([]);
                    setResidentVisitors([]);
                  }
                }}
              />

              <div style={{ marginTop: '10px', maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {isLoadingApartments ? (
                  <p style={{ color: '#a3a3a3', fontSize: '12px', textAlign: 'center', margin: '10px 0' }}>Cargando apartamentos...</p>
                ) : filteredVisitorApartments.length > 0 ? (
                  filteredVisitorApartments.map((apt: any) => {
                    const aptId = apt.id || apt._id;
                    const isSelected = visitorForm.apartmentId === aptId;
                    return (
                      <div
                        key={aptId}
                        onClick={() => {
                          setVisitorForm(prev => ({ ...prev, apartmentId: aptId, residentId: '' }));
                          setResidentVisitors([]);
                          fetchApartmentResidents(aptId);
                        }}
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

            <form onSubmit={handleVisitorSubmit}>
              
              {/* SELECTOR DE RESIDENTES (Depende del apartamento seleccionado) */}
              <div className="input-group">
                <label className="input-label">Residente a Visitar (Opcional)</label>
                <select
                  className="minuta-input"
                  value={visitorForm.residentId}
                  onChange={(e) => {
                    const selectedResId = e.target.value;
                    setVisitorForm({ ...visitorForm, residentId: selectedResId });
                    fetchResidentVisitors(selectedResId);
                  }}
                  disabled={!visitorForm.apartmentId || loadingResidents}
                >
                  <option value="" style={{ background: '#121214' }}>
                    {loadingResidents ? 'Cargando residentes...' : '-- Seleccione residente que recibe --'}
                  </option>
                  {apartmentResidents.map((res: any) => (
                    <option key={res.id || res._id} value={res.id || res._id} style={{ background: '#121214' }}>
                      {res.fullName} ({res.documentId || 'Sin cédula'})
                    </option>
                  ))}
                </select>
              </div>

              {/* --- VISUALIZACIÓN DINÁMICA DE VISITANTES ACTIVOS DEL RESIDENTE SELECCIONADO CON BOTÓN DE CHECK-OUT --- */}
              {visitorForm.residentId && (
                <div style={{ backgroundColor: '#18181b', border: '1px solid #27272a', padding: '12px', borderRadius: '8px', marginBottom: '15px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#D4AF37', margin: '0 0 8px 0' }}>
                    📋 Visitantes activos / pendientes para este residente:
                  </p>
                  
                  {loadingResidentVisitors ? (
                    <p style={{ fontSize: '12px', color: '#a1a1aa', margin: 0 }}>Buscando visitantes...</p>
                  ) : residentVisitors.filter(v => v.status === 'PENDING' || v.status === 'IN').length === 0 ? (
                    <p style={{ fontSize: '12px', color: '#a1a1aa', margin: 0 }}>No tiene visitantes activos en este momento.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {residentVisitors
                        .filter(v => v.status === 'PENDING' || v.status === 'IN')
                        .map(visitor => {
                          const vId = visitor.id || visitor._id;
                          return (
                            <div key={vId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#222228', padding: '8px 10px', borderRadius: '6px' }}>
                              <div style={{ fontSize: '12px', color: '#e4e4e7' }}>
                                <strong>{visitor.fullName}</strong> — 
                                <span style={{ color: visitor.status === 'IN' ? '#4ade80' : '#facc15' }}> {visitor.status}</span> 
                                {visitor.vehiclePlate ? ` (Vehículo: ${visitor.vehiclePlate})` : ' (Peatonal)'}
                              </div>
                              {visitor.status === 'IN' && (
                                <button 
                                  type="button" 
                                  className="checkout-btn"
                                  onClick={() => handleCheckOut(vId)}
                                >
                                  Marcar Salida
                                </button>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}
              
              <div className="input-group">
                <label className="input-label">Nombre Completo del Visitante</label>
                <input
                  className="minuta-input"
                  placeholder="Ej. Carlos Mendoza"
                  value={visitorForm.fullName}
                  onChange={(e) => setVisitorForm({ ...visitorForm, fullName: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="input-group">
                  <label className="input-label">Tipo de Documento</label>
                  <select
                    className="minuta-input"
                    value={visitorForm.documentType}
                    onChange={(e) => setVisitorForm({ ...visitorForm, documentType: e.target.value })}
                  >
                    {DOCUMENT_TYPES.map((doc) => (
                      <option key={doc} value={doc} style={{ background: '#121214' }}>{doc}</option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label className="input-label">Nº de Documento</label>
                  <input
                    className="minuta-input"
                    placeholder="Número de identidad"
                    value={visitorForm.documentId}
                    onChange={(e) => setVisitorForm({ ...visitorForm, documentId: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="input-group">
                  <label className="input-label">Teléfono (Opcional)</label>
                  <input
                    className="minuta-input"
                    placeholder="Ej. 3001234567"
                    value={visitorForm.phone}
                    onChange={(e) => setVisitorForm({ ...visitorForm, phone: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Placa Vehículo (Opcional)</label>
                  <input
                    className="minuta-input"
                    placeholder="Si ingresa en vehículo"
                    value={visitorForm.vehiclePlate}
                    onChange={(e) => setVisitorForm({ ...visitorForm, vehiclePlate: e.target.value })}
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Propósito de la Visita (Opcional)</label>
                <input
                  className="minuta-input"
                  placeholder="Ej. Familiar, Domicilio, Amigo..."
                  value={visitorForm.purpose}
                  onChange={(e) => setVisitorForm({ ...visitorForm, purpose: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Notas Adicionales (Opcional)</label>
                <input
                  className="minuta-input"
                  placeholder="Observaciones de ingreso..."
                  value={visitorForm.notes}
                  onChange={(e) => setVisitorForm({ ...visitorForm, notes: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Apartamento Seleccionado (ID)</label>
                <input
                  className="minuta-input"
                  placeholder="Selecciona un apartamento de la lista superior"
                  value={visitorForm.apartmentId}
                  readOnly
                  required
                  style={{ color: '#D4AF37', fontWeight: 'bold' }}
                />
              </div>

              {visitorMessage && (
                <p style={{ color: visitorMessage.includes('exitosamente') ? '#4ade80' : '#f87171', fontSize: '12px', textAlign: 'center' }}>
                  {visitorMessage}
                </p>
              )}

              <button type="submit" className="submit-btn" disabled={visitorLoading || !visitorForm.apartmentId}>
                {visitorLoading ? 'Registrando Visitante...' : 'Registrar Ingreso Peatonal'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
