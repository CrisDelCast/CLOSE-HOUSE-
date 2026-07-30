// 📄 src/pages/minuta/MinutaPage.tsx
import { useState, useEffect, useCallback } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../api/axios';
import { fetchVehicleReports, type VehicleReport } from '../../api/vehicle-reports';

interface VehicleInfo {
  apartmentNumber?: string;
  owners?: string[];
  vehicleId?: string;
}

// Tipado para los estados de cada parte del checklist
type ChecklistStatus = 'bien' | 'regular' | 'mal';

interface ChecklistItemState {
  status: ChecklistStatus;
  observations: string;
}

const VEHICLE_PARTS = [
  { key: 'vidrios', label: '🪟 Vidrios' },
  { key: 'carroceria', label: '🚗 Carrocería' },
  { key: 'luces', label: '💡 Luces' },
  { key: 'llantas', label: '🛞 Llantas' },
  { key: 'espejos', label: '🪞 Espejos' },
] as const;

const createInitialForm = () => ({
  plate: '',
  vehicleId: '',
  status: 'BIEN',
  observations: '',
  checklist: {
    vidrios: { status: 'bien' as ChecklistStatus, observations: '' },
    carroceria: { status: 'bien' as ChecklistStatus, observations: '' },
    luces: { status: 'bien' as ChecklistStatus, observations: '' },
    llantas: { status: 'bien' as ChecklistStatus, observations: '' },
    espejos: { status: 'bien' as ChecklistStatus, observations: '' },
  },
});

const CHECKLIST_LABELS: Record<string, string> = {
  vidrios: 'Vidrios',
  carroceria: 'Carrocería',
  luces: 'Luces',
  llantas: 'Llantas',
  espejos: 'Espejos',
};

const MinutaPage = () => {
  const navigate = useNavigate();
  
  const [form, setForm] = useState(createInitialForm);

  const [vehicleDetails, setVehicleDetails] = useState<VehicleInfo | null>(null);
  const [isSearchingPlate, setIsSearchingPlate] = useState(false);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [reports, setReports] = useState<VehicleReport[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    try {
      setIsLoadingReports(true);
      const data = await fetchVehicleReports();
      setReports(data);
    } catch {
      setReports([]);
    } finally {
      setIsLoadingReports(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const resetForm = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setForm(createInitialForm());
    setVehicleDetails(null);
    setImageFile(null);
    setImagePreview(null);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Manejador específico para actualizar el checklist de cada parte
  const handleChecklistChange = (partKey: string, field: 'status' | 'observations', value: string) => {
    setForm((prev) => ({
      ...prev,
      checklist: {
        ...prev.checklist,
        [partKey]: {
          ...(prev.checklist as any)[partKey],
          [field]: value,
        },
      },
    }));
  };

  const handlePlateBlur = async () => {
    const cleanPlate = form.plate.trim();
    if (!cleanPlate || cleanPlate.length < 3) return;

    setIsSearchingPlate(true);
    setVehicleDetails(null);
    setForm(prev => ({ ...prev, vehicleId: '' }));

    try {
      const { data } = await axios.get(`/api/properties/vehicles/plate/${encodeURIComponent(cleanPlate.toUpperCase())}`);
      
      if (data && data.id) {
        const apt = data.parkingSpot?.apartment;
        const parkingNumber = data.parkingSpot?.number;

        const aptText = apt 
          ? `${apt.block ? `${apt.block} - ` : ''}Apto ${apt.number}` 
          : 'No asignado';

        setForm(prev => ({ ...prev, vehicleId: data.id }));

        setVehicleDetails({
          apartmentNumber: aptText,
          owners: [
            `Vehículo: ${data.brand || 'N/A'} (${data.color || 'N/A'})`,
            `Parqueadero: ${parkingNumber || 'No asignado'}`
          ],
          vehicleId: data.id,
        });
      }
    } catch (err) {
      setVehicleDetails({
        apartmentNumber: 'No encontrado en el sistema',
        owners: ['Sin registros asociados para esta placa'],
      });
    } finally {
      setIsSearchingPlate(false);
    }
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');
  
    if (!form.vehicleId) {
      setError('Debe ingresar una placa válida y esperar a que el sistema la identifique.');
      return;
    }
  
    setIsSubmitting(true);
  
    try {
      const formData = new FormData();
      formData.append('vehicleId', form.vehicleId);
      formData.append('status', form.status);
      formData.append('observations', form.observations);
      
      // 🛠️ AQUÍ ESTÁ LA CLAVE: Debe ir envuelto en JSON.stringify()
      formData.append('checklist', JSON.stringify(form.checklist));
      
      if (imageFile) {
        formData.append('image', imageFile);
      }
  
      const { data } = await axios.post('/api/vehicle-reports', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
  
      resetForm();
      await loadReports();

      const warnings = Array.isArray(data?.warnings) ? data.warnings.join(' ') : '';
      setSuccessMessage(
        warnings
          ? `Reporte registrado. ${warnings}`
          : '¡Reporte vehicular y checklist registrados exitosamente!',
      );
    } catch (err: any) {
      const responseData = err.response?.data;
      const message = Array.isArray(responseData?.message)
        ? responseData.message.join(', ')
        : responseData?.message || 'No fue posible guardar el reporte vehicular.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };  

  return (
    <div className="minuta-container" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      minHeight: '100vh',
      width: '100vw',
      fontFamily: 'sans-serif',
      boxSizing: 'border-box',
      margin: 0,
      padding: '20px',
      backgroundColor: '#0c0c0e',
      backgroundImage: `
        radial-gradient(circle at 50% 50%, rgba(212, 175, 55, 0.08) 0%, rgba(12, 12, 14, 0) 70%),
        linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
      `,
      backgroundSize: '100% 100%, 24px 24px, 24px 24px',
      overflowY: 'auto'
    }}>
      
      <style>{`
        .minuta-card {
          width: 100%;
          max-width: 600px;
          background: rgba(22, 22, 26, 0.95);
          border: 1px solid rgba(212, 175, 55, 0.25);
          border-radius: 16px;
          padding: 30px 24px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 40px rgba(212, 175, 55, 0.03);
          backdrop-filter: blur(8px);
          box-sizing: border-box;
          margin-top: 20px;
        }

        .minuta-title {
          color: #ffffff;
          font-size: 22px;
          font-weight: 700;
          text-align: center;
          margin-top: 0;
          margin-bottom: 6px;
          letter-spacing: 0.5px;
        }

        .minuta-subtitle {
          color: #a3a3a3;
          font-size: 13px;
          text-align: center;
          margin-bottom: 24px;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 20px;
        }

        .input-label {
          color: rgba(212, 175, 55, 0.9);
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .minuta-input {
          background-color: #121214 !important;
          border: 1px solid #2e2e33 !important;
          color: #ffffff !important;
          padding: 12px 14px;
          border-radius: 8px;
          font-size: 14px;
          outline: none;
          transition: all 0.20s ease;
          box-sizing: border-box;
          width: 100%;
          font-family: inherit;
        }

        .minuta-input:focus {
          border-color: #D4AF37 !important;
          box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.15) !important;
        }

        textarea.minuta-input {
          resize: vertical;
          min-height: 80px;
        }

        .checklist-container {
          background: rgba(18, 18, 20, 0.9);
          border: 1px solid rgba(212, 175, 55, 0.2);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 20px;
        }

        .checklist-item {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 12px 0;
          border-bottom: 1px solid #2e2e33;
        }

        .checklist-item:last-child {
          border-bottom: none;
        }

        .checklist-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .vehicle-info-box {
          background: rgba(18, 18, 20, 0.8);
          border: 1px solid rgba(212, 175, 55, 0.2);
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 20px;
          font-size: 13px;
          color: #e5e5e5;
        }

        .vehicle-info-box p {
          margin: 4px 0;
        }

        .file-upload-box {
          border: 2px dashed rgba(212, 175, 55, 0.3);
          padding: 16px;
          border-radius: 8px;
          text-align: center;
          background: rgba(18, 18, 20, 0.5);
          cursor: pointer;
          transition: border-color 0.2s;
        }

        .file-upload-box:hover {
          border-color: #D4AF37;
        }

        .error-message {
          color: #f87171;
          background: rgba(248, 113, 113, 0.1);
          border: 1px solid rgba(248, 113, 113, 0.2);
          padding: 10px;
          border-radius: 6px;
          font-size: 12px;
          margin-bottom: 20px;
          text-align: center;
        }

        .success-message {
          color: #4ade80;
          background: rgba(74, 222, 128, 0.1);
          border: 1px solid rgba(74, 222, 128, 0.2);
          padding: 10px;
          border-radius: 6px;
          font-size: 12px;
          margin-bottom: 20px;
          text-align: center;
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
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 12px rgba(212, 175, 55, 0.2);
        }

        .submit-btn:hover:not(:disabled) {
          background: #e5be49;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(212, 175, 55, 0.3);
        }

        .submit-btn:disabled {
          background: #5a4b22;
          color: #a3a3a3;
          cursor: not-allowed;
          box-shadow: none;
        }

        .back-btn {
          background: transparent;
          border: 1px solid #2e2e33;
          color: #a3a3a3;
          padding: 8px 14px;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          align-self: flex-start;
          margin-bottom: 10px;
          transition: all 0.2s;
        }

        .back-btn:hover {
          border-color: #D4AF37;
          color: #ffffff;
        }

        .history-card {
          width: 100%;
          max-width: 600px;
          background: rgba(22, 22, 26, 0.95);
          border: 1px solid rgba(212, 175, 55, 0.25);
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          box-sizing: border-box;
          margin-top: 24px;
          margin-bottom: 40px;
        }

        .history-title {
          color: #ffffff;
          font-size: 18px;
          font-weight: 700;
          margin: 0 0 16px 0;
        }

        .history-item {
          border: 1px solid #2e2e33;
          border-radius: 10px;
          margin-bottom: 10px;
          overflow: hidden;
        }

        .history-item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          background: rgba(18, 18, 20, 0.8);
          cursor: pointer;
        }

        .history-item-body {
          padding: 12px 14px;
          border-top: 1px solid #2e2e33;
          font-size: 12px;
          color: #d4d4d4;
        }

        .status-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 6px;
          text-transform: uppercase;
        }

        .status-bien { background: rgba(74, 222, 128, 0.15); color: #4ade80; }
        .status-regular { background: rgba(250, 204, 21, 0.15); color: #facc15; }
        .status-mal { background: rgba(248, 113, 113, 0.15); color: #f87171; }
        .status-novedad { background: rgba(96, 165, 250, 0.15); color: #60a5fa; }
      `}</style>

      {/* BOTÓN DE RETORNO */}
      <div style={{ width: '100%', maxWidth: '600px' }}>
        <button onClick={() => navigate(-1)} className="back-btn">
          ← Volver
        </button>
      </div>

      {/* FORMULARIO DE MINUTA VEHICULAR */}
      <form className="minuta-card" onSubmit={handleSubmit}>
        <h2 className="minuta-title">MINUTA DE VEHÍCULOS</h2>
        <p className="minuta-subtitle">Control e inspección de partes en portería</p>

        {/* INPUT: PLACA CON BÚSQUEDA */}
        <div className="input-group">
          <label className="input-label">Placa del Vehículo</label>
          <input
            className="minuta-input"
            name="plate"
            placeholder="Ej. ZMX456"
            value={form.plate}
            onChange={handleChange}
            onBlur={handlePlateBlur}
            style={{ textTransform: 'uppercase' }}
            required
          />
          {isSearchingPlate && <span style={{ fontSize: '11px', color: '#D4AF37' }}>Buscando información del vehículo...</span>}
        </div>

        {/* TARJETA VISUAL: APARTAMENTO Y INFO */}
        {vehicleDetails && (
          <div className="vehicle-info-box">
            <p><strong>🏠 Apartamento:</strong> {vehicleDetails.apartmentNumber}</p>
            <p><strong>👤 INFO:</strong> {vehicleDetails.owners?.join(', ') || 'No registrado'}</p>
          </div>
        )}

        {/* SELECT: ESTADO GENERAL DEL REPORTE */}
        <div className="input-group">
          <label className="input-label">Estado General del Vehículo</label>
          <select
            className="minuta-input"
            name="status"
            value={form.status}
            onChange={handleChange}
          >
            <option value="BIEN" style={{ background: '#121214' }}>BIEN</option>
            <option value="REGULAR" style={{ background: '#121214' }}>REGULAR</option>
            <option value="MAL" style={{ background: '#121214' }}>MAL</option>
            <option value="NOVEDAD" style={{ background: '#121214' }}>NOVEDAD</option>
          </select>
        </div>

        {/* 📋 CHECKLIST PREDEFINIDO */}
        <div className="input-group">
          <label className="input-label">Checklist de Inspección (Partes del Vehículo)</label>
          <div className="checklist-container">
            {VEHICLE_PARTS.map((part) => {
              const partData = (form.checklist as any)[part.key];
              return (
                <div key={part.key} className="checklist-item">
                  <div className="checklist-row">
                    <span style={{ color: '#ffffff', fontSize: '13px', fontWeight: '600', minWidth: '110px' }}>
                      {part.label}
                    </span>
                    <select
                      className="minuta-input"
                      style={{ padding: '8px', fontSize: '12px' }}
                      value={partData.status}
                      onChange={(e) => handleChecklistChange(part.key, 'status', e.target.value)}
                    >
                      <option value="bien">Bien</option>
                      <option value="regular">Regular</option>
                      <option value="mal">Mal</option>
                    </select>
                  </div>
                  <input
                    className="minuta-input"
                    style={{ padding: '8px', fontSize: '12px' }}
                    placeholder={`Observación para ${part.label.toLowerCase()} (opcional)`}
                    value={partData.observations}
                    onChange={(e) => handleChecklistChange(part.key, 'observations', e.target.value)}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* TEXTAREA: OBSERVACIONES GENERALES */}
        <div className="input-group">
          <label className="input-label">Observaciones Generales</label>
          <textarea
            className="minuta-input"
            name="observations"
            placeholder="Detalles adicionales generales sobre el vehículo..."
            value={form.observations}
            onChange={handleChange}
          />
        </div>

        {/* INPUT: FOTO / EVIDENCIA */}
        <div className="input-group">
          <label className="input-label">Evidencia Fotográfica (Opcional)</label>
          <div className="file-upload-box" onClick={() => document.getElementById('fileInput')?.click()}>
            <span style={{ color: '#a3a3a3', fontSize: '13px' }}>
              {imageFile ? `📎 ${imageFile.name}` : '📷 Toca para tomar foto o adjuntar imagen del vehículo'}
            </span>
            <input
              id="fileInput"
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={handleImageChange}
            />
          </div>
          {imagePreview && (
            <div style={{ marginTop: '10px', textAlign: 'center' }}>
              <img 
                src={imagePreview} 
                alt="Vista previa" 
                style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '8px', border: '1px solid #2e2e33' }} 
              />
            </div>
          )}
        </div>

        {/* MENSAJES DE ERROR O ÉXITO */}
        {error && <p className="error-message">{error}</p>}
        {successMessage && <p className="success-message">{successMessage}</p>}

        {/* BOTÓN DE GUARDAR */}
        <button type="submit" className="submit-btn" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando registro...' : 'Registrar Minuta Vehicular'}
        </button>
      </form>

      {/* HISTORIAL DE MINUTAS */}
      <section className="history-card">
        <h3 className="history-title">Registros recientes</h3>

        {isLoadingReports && (
          <p style={{ color: '#a3a3a3', fontSize: '13px', textAlign: 'center' }}>Cargando historial...</p>
        )}

        {!isLoadingReports && reports.length === 0 && (
          <p style={{ color: '#a3a3a3', fontSize: '13px', textAlign: 'center' }}>No hay minutas registradas aún.</p>
        )}

        {!isLoadingReports && reports.map((report) => {
          const isExpanded = expandedReportId === report.id;
          const statusClass = `status-badge status-${report.status.toLowerCase()}`;

          return (
            <div key={report.id} className="history-item">
              <div
                className="history-item-header"
                onClick={() => setExpandedReportId(isExpanded ? null : report.id)}
              >
                <div>
                  <div style={{ color: '#fff', fontWeight: 600, fontSize: '13px' }}>
                    {report.vehicle?.plate || 'Sin placa'} · {new Date(report.createdAt).toLocaleString()}
                  </div>
                  <div style={{ color: '#a3a3a3', fontSize: '11px', marginTop: '4px' }}>
                    {report.user?.fullName || 'Portero'} · {report.vehicle?.brand || 'N/A'} ({report.vehicle?.color || 'N/A'})
                  </div>
                </div>
                <span className={statusClass}>{report.status}</span>
              </div>

              {isExpanded && (
                <div className="history-item-body">
                  {report.observations && (
                    <p><strong>Observaciones:</strong> {report.observations}</p>
                  )}

                  {report.checklist && (
                    <div style={{ marginTop: '8px' }}>
                      <strong>Checklist:</strong>
                      <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px' }}>
                        {Object.entries(report.checklist).map(([key, detail]) => (
                          <li key={key}>
                            {CHECKLIST_LABELS[key] || key}: {detail?.status}
                            {detail?.observations ? ` — ${detail.observations}` : ''}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {report.imageUrl && (
                    <div style={{ marginTop: '10px' }}>
                      <strong>Evidencia:</strong>
                      <div style={{ marginTop: '6px' }}>
                        <img
                          src={report.imageUrl}
                          alt="Evidencia del reporte"
                          style={{ maxWidth: '100%', maxHeight: '180px', borderRadius: '8px', border: '1px solid #2e2e33' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
};

export default MinutaPage;