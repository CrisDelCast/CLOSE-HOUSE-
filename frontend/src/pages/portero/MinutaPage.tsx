import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../api/axios';

interface VehicleInfo {
  apartmentNumber?: string;
  owners?: string[];
  vehicleId?: string; // Guardamos el ID real (UUID) del vehículo
}

const MinutaPage = () => {
  const navigate = useNavigate();
  
  // Estados para el formulario ajustados al DTO del backend
  const [form, setForm] = useState({
    plate: '',
    vehicleId: '', // Campo requerido por el backend (UUID)
    status: 'BIEN', // Ajustado a los valores del enum: BIEN, REGULAR, MAL, NOVEDAD
    observations: '',
  });

  // Datos visuales obtenidos al buscar la placa
  const [vehicleDetails, setVehicleDetails] = useState<VehicleInfo | null>(null);
  const [isSearchingPlate, setIsSearchingPlate] = useState(false);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // 🔍 Función para buscar la placa y capturar el ID (UUID) del vehículo
  const handlePlateBlur = async () => {
    const cleanPlate = form.plate.trim();
    if (!cleanPlate || cleanPlate.length < 3) return;

    setIsSearchingPlate(true);
    setVehicleDetails(null);
    setForm(prev => ({ ...prev, vehicleId: '' }));

    try {
      const { data } = await axios.get(`/api/properties/vehicles/plate/${encodeURIComponent(cleanPlate.toUpperCase())}`);
      
      if (data && data.id) {
        // Extraemos el apartamento y el parqueadero de la estructura anidada
        const apt = data.parkingSpot?.apartment;
        const parkingNumber = data.parkingSpot?.number;

        const aptText = apt 
          ? `${apt.block ? `${apt.block} - ` : ''}Apto ${apt.number}` 
          : 'No asignado';

        // Guardamos el ID (UUID) en el estado del formulario para enviarlo al backend
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

    // Validación previa para asegurar que se seleccionó un vehículo válido del sistema
    if (!form.vehicleId) {
      setError('Debe ingresar una placa válida y esperar a que el sistema la identifique.');
      return;
    }

    setIsSubmitting(true);
  
    try {
      const formData = new FormData();
      // Enviamos las propiedades exactas que exige el backend
      formData.append('vehicleId', form.vehicleId);
      formData.append('status', form.status);
      formData.append('observations', form.observations);
      
      if (imageFile) {
        formData.append('image', imageFile);
      }
 
      // 🛠️ Se añadió el header multipart/form-data para que Axios envíe correctamente el archivo binario
      await axios.post('/api/vehicle-reports', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
 
      setSuccessMessage('¡Reporte vehicular registrado exitosamente en la minuta!');
      setForm({ plate: '', vehicleId: '', status: 'BIEN', observations: '' });
      setVehicleDetails(null);
      setImageFile(null);
      setImagePreview(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'No fue posible guardar el reporte vehicular.');
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
          max-width: 550px;
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
          min-height: 100px;
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
      `}</style>

      {/* BOTÓN DE RETORNO */}
      <div style={{ width: '100%', maxWidth: '550px' }}>
        <button onClick={() => navigate(-1)} className="back-btn">
          ← Volver
        </button>
      </div>

      {/* FORMULARIO DE MINUTA VEHICULAR */}
      <form className="minuta-card" onSubmit={handleSubmit}>
        <h2 className="minuta-title">MINUTA DE VEHÍCULOS</h2>
        <p className="minuta-subtitle">Control e ingreso vehicular en portería</p>

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

        {/* SELECT: ESTADO DEL REPORTE (ENUM REQUERIDO) */}
        <div className="input-group">
          <label className="input-label">Estado del Vehículo</label>
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

        {/* TEXTAREA: OBSERVACIONES */}
        <div className="input-group">
          <label className="input-label">Observaciones</label>
          <textarea
            className="minuta-input"
            name="observations"
            placeholder="Detalles adicionales sobre el estado o novedad del vehículo..."
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
    </div>
  );
};

export default MinutaPage;