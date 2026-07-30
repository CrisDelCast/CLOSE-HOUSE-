import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '../../context/AuthContext';
import { createTenant, fetchTenants } from '../../api/tenants';
import type { CreateTenantInput, Tenant } from '../../types';
import api from '../../api/client';
import axios from 'axios';
import logoDuxs from '../../assets/logo-duxssecurity.png';

// Interfaces locales
interface ControlPoint {
  id: string;
  name: string;
  qrCodeToken: string;
  sequenceOrder: number;
}

interface LocationImage {
  id: string;
  imageUrl: string; 
  description?: string;
  checkpointId?: string;
}

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


// Expresión regular para validar formato Slug (solo minusculas, números y guiones)
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// Expresión regular básica para emails
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Archivos de imagen permitidos y tamaño máximo (5MB)
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export default function TenantsManagement() {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  // Estados principales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [selectedTenantForPoints, setSelectedTenantForPoints] = useState<Tenant | null>(null);
  const [newPointName, setNewPointName] = useState('');
  const [pointFeedback, setPointFeedback] = useState('');

  // Estados de errores por campo
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [pointError, setPointError] = useState('');

  // Traer Tenants
  const { data: tenants, isLoading, isError } = useQuery({
    queryKey: ['tenants'],
    queryFn: fetchTenants,
  });

  const safeTenants: Tenant[] = Array.isArray(tenants) ? tenants : [];

  // Estados para imágenes de ubicación
  const [selectedTenantForImages, setSelectedTenantForImages] = useState<Tenant | null>(null);
  const [imageFiles, setImageFiles] = useState<FileList | null>(null);
  const [imageFeedback, setImageFeedback] = useState('');
  const [activeImageTab, setActiveImageTab] = useState<'upload' | 'list'>('upload');
  const [existingImages, setExistingImages] = useState<LocationImage[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);

  // Traer Puntos de Control
  const { data: controlPoints, isLoading: isLoadingPoints } = useQuery<ControlPoint[]>({
    queryKey: ['controlPoints', selectedTenantForPoints?.id || selectedTenantForImages?.id],
    queryFn: async () => {
      const tenantId = selectedTenantForPoints?.id || selectedTenantForImages?.id;
      if (!tenantId) return [];
      try {
        const { data } = await api.get(`/control-points/tenant/${tenantId}`);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Error al obtener los puntos de control:", error);
        return [];
      }
    },
    enabled: !!selectedTenantForPoints?.id || !!selectedTenantForImages?.id,
  });

  const safeControlPoints: ControlPoint[] = Array.isArray(controlPoints) ? controlPoints : [];
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);

  // ---------------------------------------------------------------------------
  // 🔍 VALIDACIONES EN FRONTEND
  // ---------------------------------------------------------------------------

  const validateTenantForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'El nombre del conjunto es obligatorio.';
    }

    const cleanSlug = formData.slug.toLowerCase().trim();
    if (!cleanSlug) {
      errors.slug = 'El URL Slug es obligatorio.';
    } else if (!SLUG_REGEX.test(cleanSlug)) {
      errors.slug = 'El slug solo puede contener letras minúsculas, números y guiones (ej: torres-del-parque).';
    }

    if (!formData.adminName.trim()) {
      errors.adminName = 'El nombre del administrador es obligatorio.';
    }

    if (!formData.adminEmail.trim()) {
      errors.adminEmail = 'El correo electrónico es obligatorio.';
    } else if (!EMAIL_REGEX.test(formData.adminEmail.trim())) {
      errors.adminEmail = 'Ingrese un correo electrónico válido.';
    }

    if (formData.totalUnits !== '' && Number(formData.totalUnits) < 0) {
      errors.totalUnits = 'Las unidades deben ser un número positivo.';
    }

    if (formData.totalParkingSlots !== '' && Number(formData.totalParkingSlots) < 0) {
      errors.totalParkingSlots = 'Los parqueaderos deben ser un número positivo.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePointForm = (): boolean => {
    if (!newPointName.trim()) {
      setPointError('El nombre del punto de control no puede estar vacío.');
      return false;
    }
    if (newPointName.trim().length < 3) {
      setPointError('El nombre debe contener al menos 3 caracteres.');
      return false;
    }
    setPointError('');
    return true;
  };

  const validateImageFiles = (files: FileList | null): boolean => {
    if (!files || files.length === 0) {
      setImageFeedback('Selecciona al menos una imagen para subir.');
      return false;
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        setImageFeedback(`El archivo "${file.name}" no es válido. Solo se admiten imágenes JPG, PNG o WEBP.`);
        return false;
      }
      if (file.size > MAX_FILE_SIZE) {
        setImageFeedback(`El archivo "${file.name}" excede el límite permitido de 5 MB.`);
        return false;
      }
    }

    setImageFeedback('');
    return true;
  };

  // ---------------------------------------------------------------------------
  // HANDLERS & MUTATIONS
  // ---------------------------------------------------------------------------

  const fetchExistingImages = async (tenantId: string) => {
    setIsLoadingImages(true);
    try {
      const { data } = await api.get(`/tenants/${tenantId}/location-images`);
      setExistingImages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error al cargar imágenes de ubicación:", error);
      setExistingImages([]);
    } finally {
      setIsLoadingImages(false);
    }
  };

  // ---------------------------------------------------------------------------
// 🔍 MUTACIÓN Y VALIDACIÓN PARA ASIGNAR CHECKPOINT A UNA IMAGEN
// ---------------------------------------------------------------------------

  const assignImageMutation = useMutation({
    mutationFn: async ({ imageId, checkpointId }: { imageId: string; checkpointId: string }) => {
      // 1. Validación en Frontend antes de llamar a la API
      if (!imageId) {
        throw new Error('El ID de la imagen es obligatorio.');
      }

      // 2. Petición PATCH enviando checkpointId en el BODY de la petición
      const { data } = await api.patch(`/tenants/location-images/${imageId}/checkpoint`, {
        checkpointId: checkpointId || null, // Si es string vacío, envía null para desasociar
      });

      return data;
    },
    onSuccess: (_, variables) => {
      // Mensaje dinámico según si asoció o desasoció
      const mensaje = variables.checkpointId 
        ? '¡Punto de control asociado correctamente!' 
        : '¡Imagen desasociada del punto de control!';
      
      // Opcional: mostrar notificación o feedback rápido
      console.log(mensaje);

      // Recargar la lista de imágenes para reflejar los cambios
      if (selectedTenantForImages) {
        fetchExistingImages(selectedTenantForImages.id);
      }
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || 'Error al asociar la imagen al punto de control.';
      alert(`❌ ${errorMsg}`);
    }
  });

  const createMutation = useMutation({
    mutationFn: createTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setIsModalOpen(false);
      setFeedback('');
      setFormErrors({});
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

  const addPointMutation = useMutation({
    mutationFn: async (payload: { name: string; sequenceOrder: number; tenantId: string }) => {
      const { data } = await api.post('/control-points', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['controlPoints', selectedTenantForPoints?.id] });
      setNewPointName('');
      setPointFeedback('');
      setPointError('');
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) {
        setPointFeedback(error.response?.data?.message || 'Error al guardar el punto de control.');
      } else {
        setPointFeedback('Ocurrió un error inesperado al guardar el punto.');
      }
    },
  });

  const uploadImagesMutation = useMutation({
    mutationFn: async ({ tenantId, files, description }: { tenantId: string; files: FileList; description?: string }) => {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('images', files[i]);
      }
      if (description) {
        formData.append('description', description);
      }

      const { data } = await api.post(`/tenants/location-images?tenantId=${tenantId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => {
      setImageFeedback('¡Imágenes subidas con éxito!');
      setImageFiles(null);
      if (selectedTenantForImages) {
        fetchExistingImages(selectedTenantForImages.id);
      }
      setTimeout(() => {
        setImageFeedback('');
        setActiveImageTab('list');
      }, 1000);
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) {
        setImageFeedback(error.response?.data?.message || 'Error al subir las imágenes.');
      } else {
        setImageFeedback('Ocurrió un error inesperado.');
      }
    },
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Limpia el error del campo específico a medida que el usuario escribe
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback('');

    // Prevenir mutación si la validación falla
    if (!validateTenantForm()) return;

    const payload: CreateTenantInput = {
      name: formData.name.trim(),
      slug: formData.slug.toLowerCase().trim(),
      phoneCode: formData.phoneCode,
      totalUnits: parseInt(formData.totalUnits) || 0,
      totalParkingSlots: parseInt(formData.totalParkingSlots) || 0,
      scheduleType: formData.scheduleType,
      adminName: formData.adminName.trim(),
      adminEmail: formData.adminEmail.trim(),
      adminPhone: formData.adminPhone.trim(),
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
    if (!selectedTenantForPoints?.id) return;

    if (!validatePointForm()) return;

    const nextSequence = safeControlPoints.length + 1;

    addPointMutation.mutate({
      name: newPointName.trim(),
      sequenceOrder: nextSequence,
      tenantId: selectedTenantForPoints.id,
    });
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (validateImageFiles(files)) {
      setImageFiles(files);
    } else {
      setImageFiles(null);
      e.target.value = ''; // Resetea el input file si no pasa la validación
    }
  };

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
      backgroundColor: '#0c0c0e',
      backgroundImage: `
        radial-gradient(circle at 50% 50%, rgba(212, 175, 55, 0.08) 0%, rgba(12, 12, 14, 0) 70%),
        linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
      `,
      backgroundSize: '100% 100%, 24px 24px, 24px 24px',
    }}>
      
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
        .custom-input.is-invalid {
          border-color: #f87171 !important;
        }
        .error-msg {
          color: #f87171;
          font-size: 12px;
          margin-top: 4px;
          display: block;
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
        .btn-gold:disabled {
          opacity: 0.6;
          cursor: not-allowed;
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
          <h2 style={{ fontSize: '36px', fontWeight: '700', color: '#ffffff', margin: 0 }}>
            Gestión de Conjuntos Residenciales
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#a3a3a3', fontSize: '16px' }}>Supervisión, infraestructura y configuración de rondas</p>
        </div>
        {user?.role === 'SUPERADMIN' && (
          <button onClick={() => setIsModalOpen(true)} className="btn-gold">
            ➕ Crear Nuevo Conjunto
          </button>
        )}
      </div>

      {isLoading && <p style={{ color: '#a3a3a3', fontSize: '14px' }}>⏳ Cargando conjuntos residenciales...</p>}
      {isError && <p style={{ color: '#f87171', fontWeight: '500' }}>❌ No se pudieron cargar los conjuntos.</p>}

      {/* Tabla de Tenants */}
      {!isLoading && tenants && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '1000px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(136, 126, 38, 0.8)', color: '#ffffff', fontWeight: '900', borderBottom: '1px solid #2e2e33', fontSize: '16px' }}>
                <th style={{ padding: '16px' }}>Nombre del Conjunto</th>
                <th style={{ padding: '16px' }}>URL Slug</th>
                <th style={{ padding: '16px' }}>Capacidad / Tipo</th>
                <th style={{ padding: '16px' }}>Administrador</th>
                <th style={{ padding: '16px' }}>Imágenes Ubicación</th>
                <th style={{ padding: '16px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {safeTenants.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#a3a3a3' }}>
                    No hay conjuntos residenciales registrados.
                  </td>
                </tr>
              ) : (
                safeTenants.map((tenant: Tenant) => (
                  <tr key={tenant.id} style={{ borderBottom: '1px solid #1c1c1f', color: '#ffffff' }}>
                    <td style={{ padding: '20px' }}>
                      <span style={goldenBadgeStyle}>{tenant.name}</span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ ...goldenBadgeStyle, fontSize: '13px', padding: '4px 8px', background: 'rgba(212, 175, 55, 0.05)' }}>
                        /{tenant.slug}
                      </span>
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#a3a3a3' }}>
                      🏢 <strong>{tenant.totalUnits}</strong> Unidades<br />
                      🚗 <strong>{tenant.totalParkingSlots}</strong> Parqueaderos
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px' }}>
                      <strong style={{ color: '#ffffff' }}>{tenant.adminName}</strong><br />
                      <span style={{ color: '#a3a3a3' }}>{tenant.adminEmail}</span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <button
                        onClick={() => {
                          setSelectedTenantForImages(tenant);
                          setActiveImageTab('upload');
                          fetchExistingImages(tenant.id);
                        }}
                        className="btn-dark-outline"
                      >
                        🖼️ Gestionar Imágenes
                      </button>
                    </td>
                    <td style={{ padding: '16px' }}>
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

      {/* 🖼️ PANEL DE GESTIÓN DE IMÁGENES Y ASOCIACIÓN A PUNTOS */}
      {selectedTenantForImages && (
        <div style={{ 
          background: 'rgba(22, 22, 26, 0.95)', 
          borderRadius: '16px', 
          padding: '24px', 
          marginTop: '24px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)', 
          border: '1px solid rgba(212, 175, 55, 0.2)',
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2e2e33', paddingBottom: '16px', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, color: '#ffffff', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              🗺️ Imágenes de Ubicación: <span style={goldenBadgeStyle}>{selectedTenantForImages.name}</span>
            </h3>
            <button 
              onClick={() => { setSelectedTenantForImages(null); setImageFeedback(''); }} 
              style={{ background: '#f87171', color: '#0c0c0e', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: '700' }}
            >
              Cerrar Panel
            </button>
          </div>

          {/* Botones de pestañas internas */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button
              onClick={() => setActiveImageTab('upload')}
              className={activeImageTab === 'upload' ? 'btn-gold' : 'btn-dark-outline'}
            >
              ➕ Subir Nuevas
            </button>
            <button
              onClick={() => {
                setActiveImageTab('list');
                fetchExistingImages(selectedTenantForImages.id);
              }}
              className={activeImageTab === 'list' ? 'btn-gold' : 'btn-dark-outline'}
            >
              👁️ Ver y Asociar a Puntos ({existingImages.length})
            </button>
          </div>

          {activeImageTab === 'upload' ? (
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!validateImageFiles(imageFiles)) return;
              uploadImagesMutation.mutate({
                tenantId: selectedTenantForImages.id,
                files: imageFiles!,
                description: 'Plano o imagen operativa'
              });
            }} style={{ maxWidth: '500px' }}>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'rgba(212, 175, 55, 0.9)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Seleccionar Archivos (JPG, PNG, WEBP - Max 5MB)
                </label>
                <input 
                  type="file" 
                  multiple 
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange} 
                  className="custom-input"
                  style={{ padding: '8px' }}
                />
              </div>

              {imageFeedback && (
                <p style={{ color: imageFeedback.includes('éxito') ? '#34d399' : '#f87171', fontSize: '13px', marginBottom: '12px' }}>
                  {imageFeedback}
                </p>
              )}

              <button 
                type="submit" 
                disabled={uploadImagesMutation.isPending || !imageFiles}
                className="btn-gold"
                style={{ width: '100%' }}
              >
                {uploadImagesMutation.isPending ? 'Subiendo a Cloudinary...' : 'Guardar y Subir Imágenes'}
              </button>
            </form>
          ) : (
            /* SECCIÓN DE VISUALIZACIÓN Y ASOCIACIÓN */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
            {existingImages.map((img) => (
              <div key={img.id} style={{ background: '#121214', border: '1px solid #2e2e33', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                
                {/* IMAGEN: Al dar clic se abre en tamaño real */}
                <img 
                  src={img.imageUrl} 
                  alt="Ubicación" 
                  onClick={() => setPreviewImage(img.imageUrl)}
                  style={{ 
                    width: '100%', 
                    height: '180px', 
                    objectFit: 'contain', // Mantiene la proporción original sin recortar
                    background: '#0c0c0e', 
                    borderRadius: '8px', 
                    border: '1px solid #2e2e33',
                    cursor: 'pointer'
                  }} 
                  title="Haz clic para ver en tamaño completo"
                />
                
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#D4AF37', fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase' }}>
                    Asociar a Punto de Control:
                  </label>
                  
                  <select
                    defaultValue={img.checkpointId || ''}
                    disabled={assignImageMutation.isPending}
                    onChange={(e) => {
                      const newCheckpointId = e.target.value;
                      const currentCheckpointId = img.checkpointId || '';

                      if (newCheckpointId === currentCheckpointId) return;

                      assignImageMutation.mutate({
                        imageId: img.id,
                        checkpointId: newCheckpointId,
                      });
                    }}
                    style={{ 
                      width: '100%', 
                      background: '#1c1c1f', 
                      color: '#fff', 
                      border: '1px solid #2e2e33', 
                      padding: '8px', 
                      borderRadius: '6px', 
                      fontSize: '13px',
                      opacity: assignImageMutation.isPending ? 0.6 : 1,
                      cursor: assignImageMutation.isPending ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <option value="">-- Sin asignar (Plano general) --</option>
                    {safeControlPoints.map((cp) => (
                      <option key={cp.id} value={cp.id}>
                        #{cp.sequenceOrder} - {cp.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
             
          )}
        </div>
      )}

      {/* 📍 SECCIÓN: CONFIGURACIÓN DE CÓDIGOS QR */}
      {selectedTenantForPoints && (
        <div style={{ 
          background: 'rgba(22, 22, 26, 0.95)', 
          borderRadius: '16px', 
          padding: '24px', 
          marginTop: '24px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)', 
          border: '1px solid rgba(212, 175, 55, 0.2)',
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2e2e33', paddingBottom: '16px', marginBottom: '24px' }}>
            <h3 style={{ margin: 0, color: '#ffffff', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              📍 Configuración de Códigos QR: <span style={goldenBadgeStyle}>{selectedTenantForPoints.name}</span>
            </h3>
            <button 
              onClick={() => { setSelectedTenantForPoints(null); setPointError(''); setPointFeedback(''); }} 
              style={{ background: '#f87171', color: '#0c0c0e', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: '700' }}
            >
              Cerrar Panel
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '24px' }}>
            <div style={{ background: '#121214', padding: '20px', borderRadius: '12px', border: '1px solid #2e2e33' }}>
              <h4 style={{ margin: '0 0 16px 0', color: '#D4AF37', fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Registrar Nuevo Punto</h4>
              <form onSubmit={handleAddPointSubmit}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'rgba(212, 175, 55, 0.9)', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Nombre de la ubicación física
                  </label>
                  <input 
                    type="text" 
                    value={newPointName} 
                    onChange={(e) => {
                      setNewPointName(e.target.value);
                      if (pointError) setPointError('');
                    }} 
                    placeholder="Ej: Acceso Vehicular Sótano 1" 
                    className={`custom-input ${pointError ? 'is-invalid' : ''}`}
                  />
                  {pointError && <span className="error-msg">{pointError}</span>}
                </div>
                <div style={{ marginBottom: '16px', fontSize: '13px', color: '#a3a3a3' }}>
                  Siguiente orden sugerido: <strong style={{ color: '#D4AF37' }}>#{safeControlPoints.length + 1}</strong>
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

            <div>
              <h4 style={{ margin: '0 0 16px 0', color: 'rgba(212, 175, 55, 0.9)', fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Puntos Físicos e Impresión de QR</h4>
              {isLoadingPoints ? (
                <p style={{ color: '#a3a3a3' }}>Cargando puntos de control...</p>
              ) : safeControlPoints.length === 0 ? (
                <p style={{ color: '#a3a3a3', fontStyle: 'italic' }}>Aún no has creado puntos de control para este conjunto.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {safeControlPoints.map((point) => {
                    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(point.qrCodeToken)}`;
                    
                    return (
                      <div key={point.id} style={{ border: '1px solid #2e2e33', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#121214' }}>
                        <span style={{ background: 'rgba(212, 175, 55, 0.1)', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', color: '#D4AF37', marginBottom: '10px', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
                          Punto #{point.sequenceOrder}
                        </span>
                        
                        <strong style={{ ...goldenBadgeStyle, fontSize: '13px', textAlign: 'center', marginBottom: '14px', width: '90%', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {point.name}
                        </strong>
                        
                        <div style={{ background: '#ffffff', padding: '8px', borderRadius: '8px', display: 'inline-block', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                          <img 
                            src={qrUrl} 
                            alt={`QR ${point.name}`} 
                            style={{ width: '130px', height: '130px', display: 'block' }} 
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}