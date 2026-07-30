import { useState, useEffect, useCallback } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createGeneralReport,
  fetchGeneralReports,
  type GeneralReport,
  type GeneralReportType,
} from '../../api/general-reports';

const REPORT_TYPES: { value: GeneralReportType; label: string }[] = [
  { value: 'RECIBIDO', label: 'Recibido' },
  { value: 'ENTREGA', label: 'Entrega' },
  { value: 'NOVEDAD', label: 'Novedad' },
];

const REPORT_TYPE_LABELS: Record<GeneralReportType, string> = {
  RECIBIDO: 'Recibido',
  ENTREGA: 'Entrega',
  NOVEDAD: 'Novedad',
};

const createInitialForm = () => ({
  reportType: 'NOVEDAD' as GeneralReportType,
  description: '',
});

const formatNow = () => {
  const now = new Date();
  return {
    date: now.toLocaleDateString(),
    time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
};

const MinutaGeneralPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(createInitialForm);
  const [currentDateTime, setCurrentDateTime] = useState(formatNow());

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [reports, setReports] = useState<GeneralReport[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    try {
      setIsLoadingReports(true);
      const data = await fetchGeneralReports();
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

  useEffect(() => {
    const interval = setInterval(() => setCurrentDateTime(formatNow()), 60000);
    return () => clearInterval(interval);
  }, []);

  const resetForm = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setForm(createInitialForm());
    setImageFile(null);
    setImagePreview(null);
    setCurrentDateTime(formatNow());
  };

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
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

    if (!form.description.trim()) {
      setError('Debe ingresar una descripción del reporte.');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('reportType', form.reportType);
      formData.append('description', form.description.trim());

      if (imageFile) {
        formData.append('image', imageFile);
      }

      const data = await createGeneralReport(formData);

      resetForm();
      await loadReports();

      const warnings = Array.isArray(data?.warnings) ? data.warnings.join(' ') : '';
      setSuccessMessage(
        warnings
          ? `Minuta registrada. ${warnings}`
          : '¡Minuta general registrada exitosamente!',
      );
    } catch (err: any) {
      const responseData = err.response?.data;
      const message = Array.isArray(responseData?.message)
        ? responseData.message.join(', ')
        : responseData?.message || 'No fue posible guardar la minuta general.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="minuta-container"
      style={{
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
        overflowY: 'auto',
      }}
    >
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
          min-height: 120px;
        }

        .datetime-box {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 20px;
        }

        .datetime-item {
          background: rgba(18, 18, 20, 0.8);
          border: 1px solid rgba(212, 175, 55, 0.2);
          border-radius: 8px;
          padding: 12px 14px;
        }

        .datetime-item span {
          display: block;
          color: rgba(212, 175, 55, 0.9);
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 4px;
        }

        .datetime-item strong {
          color: #ffffff;
          font-size: 14px;
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

        .type-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 6px;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .type-recibido { background: rgba(74, 222, 128, 0.15); color: #4ade80; }
        .type-entrega { background: rgba(96, 165, 250, 0.15); color: #60a5fa; }
        .type-novedad { background: rgba(250, 204, 21, 0.15); color: #facc15; }
      `}</style>

      <div style={{ width: '100%', maxWidth: '600px' }}>
        <button onClick={() => navigate(-1)} className="back-btn">
          ← Volver
        </button>
      </div>

      <form className="minuta-card" onSubmit={handleSubmit}>
        <h2 className="minuta-title">MINUTA GENERAL</h2>
        <p className="minuta-subtitle">Novedades, recibidos y entregas en portería</p>

        <div className="datetime-box">
          <div className="datetime-item">
            <span>Fecha</span>
            <strong>{currentDateTime.date}</strong>
          </div>
          <div className="datetime-item">
            <span>Hora</span>
            <strong>{currentDateTime.time}</strong>
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">Tipo de reporte</label>
          <select
            className="minuta-input"
            name="reportType"
            value={form.reportType}
            onChange={handleChange}
            required
          >
            {REPORT_TYPES.map((type) => (
              <option key={type.value} value={type.value} style={{ background: '#121214' }}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div className="input-group">
          <label className="input-label">Descripción del reporte</label>
          <textarea
            className="minuta-input"
            name="description"
            placeholder="Detalle de la novedad, recibido o entrega..."
            value={form.description}
            onChange={handleChange}
            required
          />
        </div>

        <div className="input-group">
          <label className="input-label">Evidencia fotográfica (opcional)</label>
          <div className="file-upload-box" onClick={() => document.getElementById('generalFileInput')?.click()}>
            <span style={{ color: '#a3a3a3', fontSize: '13px' }}>
              {imageFile ? `📎 ${imageFile.name}` : '📷 Toca para tomar foto o adjuntar imagen'}
            </span>
            <input
              id="generalFileInput"
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
                style={{
                  maxWidth: '100%',
                  maxHeight: '150px',
                  borderRadius: '8px',
                  border: '1px solid #2e2e33',
                }}
              />
            </div>
          )}
        </div>

        {error && <p className="error-message">{error}</p>}
        {successMessage && <p className="success-message">{successMessage}</p>}

        <button type="submit" className="submit-btn" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando registro...' : 'Registrar Minuta General'}
        </button>
      </form>

      <section className="history-card">
        <h3 className="history-title">Registros recientes</h3>

        {isLoadingReports && (
          <p style={{ color: '#a3a3a3', fontSize: '13px', textAlign: 'center' }}>Cargando historial...</p>
        )}

        {!isLoadingReports && reports.length === 0 && (
          <p style={{ color: '#a3a3a3', fontSize: '13px', textAlign: 'center' }}>
            No hay minutas generales registradas aún.
          </p>
        )}

        {!isLoadingReports &&
          reports.map((report) => {
            const isExpanded = expandedReportId === report.id;
            const typeClass = `type-badge type-${report.reportType.toLowerCase()}`;

            return (
              <div key={report.id} className="history-item">
                <div
                  className="history-item-header"
                  onClick={() => setExpandedReportId(isExpanded ? null : report.id)}
                >
                  <div>
                    <div style={{ color: '#fff', fontWeight: 600, fontSize: '13px' }}>
                      {REPORT_TYPE_LABELS[report.reportType]} · {new Date(report.createdAt).toLocaleString()}
                    </div>
                    <div style={{ color: '#a3a3a3', fontSize: '11px', marginTop: '4px' }}>
                      {report.user?.fullName || 'Portero'}
                    </div>
                  </div>
                  <span className={typeClass}>{report.reportType}</span>
                </div>

                {isExpanded && (
                  <div className="history-item-body">
                    <p><strong>Descripción:</strong> {report.description}</p>

                    {report.imageUrl && (
                      <div style={{ marginTop: '10px' }}>
                        <strong>Evidencia:</strong>
                        <div style={{ marginTop: '6px' }}>
                          <img
                            src={report.imageUrl}
                            alt="Evidencia del reporte"
                            style={{
                              maxWidth: '100%',
                              maxHeight: '180px',
                              borderRadius: '8px',
                              border: '1px solid #2e2e33',
                            }}
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

export default MinutaGeneralPage;
