// 📄 src/components/rounds/RondaDashboard.tsx
import { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import axios from '../../api/axios';
import { useAuth } from '../../hooks/useAuth';

interface ControlPoint {
  id: string;
  name: string;
  sequenceOrder: number;
}

interface LocationImage {
  id: string;
  imageUrl: string;
  description?: string;
  checkpointId?: string | null;
}

interface Check {
  id: string;
  scannedAt: string;
  controlPoint: ControlPoint;
}

interface ActiveRound {
  id: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  startedAt: string;
  timeBetweenPoints?: number;
  checks: Check[];
}

export default function RondaDashboard() {
  const { user } = useAuth();
  const tenantId = user?.tenantId;

  const [activeRound, setActiveRound] = useState<ActiveRound | null>(null);
  const [controlPoints, setControlPoints] = useState<ControlPoint[]>([]);
  const [tenantImages, setTenantImages] = useState<LocationImage[]>([]);
  
  const [selectedPointForModal, setSelectedPointForModal] = useState<ControlPoint | null>(null);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  
  const [abandonNotes, setAbandonNotes] = useState('');
  const [wasRoundAbandoned, setWasRoundAbandoned] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // 🏷️ Estado para saber si la cámara abrió para ronda normal o para una acción Master específica ('ENTRY' | 'EXIT')
  const [activeMasterAction, setActiveMasterAction] = useState<'ENTRY' | 'EXIT' | null>(null);

  const fetchControlPoints = async () => {
    if (!tenantId) return;
    try {
      const pointsRes = await axios.get(`/api/control-points/tenant/${tenantId}`);
      const sortedPoints = pointsRes.data.sort((a: ControlPoint, b: ControlPoint) => a.sequenceOrder - b.sequenceOrder);
      setControlPoints(sortedPoints);
    } catch (error) {
      console.error("Error al cargar los puntos de control:", error);
    }
  };

  const fetchTenantImages = async () => {
    if (!tenantId) return;
    try {
      const { data } = await axios.get(`/api/tenants/${tenantId}/location-images`);
      setTenantImages(data || []);
    } catch (error) {
      console.error("Error al obtener las imágenes del tenant:", error);
    }
  };

  const checkActiveRound = async (isInitial = false) => {
    try {
      if (isInitial) setIsLoading(true);
      const { data } = await axios.get('/api/rounds/active');
      
      if (data && data.id) {
        if (data.status === 'ABANDONED') {
          setActiveRound(null);
          setWasRoundAbandoned(true);
        } else {
          setActiveRound(data);
          setWasRoundAbandoned(false);
        }
      } else {
        if (isInitial) {
          setActiveRound(null);
          setRemainingTime(null);
        }
      }
    } catch (err: any) {
      console.error("Error al obtener la ronda activa:", err);
      if (isInitial) {
        setActiveRound(null);
      }
    } finally {
      if (isInitial) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      checkActiveRound(true);
      fetchControlPoints();
      fetchTenantImages();
    } else if (user === null || user === undefined) {
      const timer = setTimeout(() => setIsLoading(false), 500); 
      return () => clearTimeout(timer);
    }
  }, [tenantId, user]);

  useEffect(() => {
    if (!activeRound || activeRound.status !== 'IN_PROGRESS' || !activeRound.startedAt) return;

    const maxMinutes = activeRound.timeBetweenPoints ?? 10;
    const totalAllowedMs = maxMinutes * 60 * 1000;
    const referenceTime = new Date(activeRound.startedAt).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const elapsedMs = now - referenceTime;
      const remainingMs = totalAllowedMs - elapsedMs;

      if (remainingMs <= 0) {
        setRemainingTime(0);
        setActiveRound(null);
        setWasRoundAbandoned(true);
        setStatusMessage({
          type: 'error',
          text: '⚠️ Tu ronda ha expirado por superar el tiempo límite y ha sido marcada como ABANDONADA.'
        });
      } else {
        setRemainingTime(Math.floor(remainingMs / 1000));
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [activeRound]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRound = async () => {
    try {
      setStatusMessage(null);
      const { data } = await axios.post('/api/rounds/start', {
        notes: abandonNotes
      });

      setActiveRound(data);
      setAbandonNotes('');
      setWasRoundAbandoned(false);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || 'No se pudo iniciar la ronda.'
      });
    }
  };

  const isNextNormalPoint = (pointId: string) => {
    const normalList = controlPoints.filter(p => {
      const name = p.name.toUpperCase();
      return !name.includes('MASTER') && !name.includes('EXTERNO');
    });

    const scannedIds = activeRound?.checks?.map(c => c.controlPoint?.id) || [];
    const nextPoint = normalList.find(p => !scannedIds.includes(p.id));
    return nextPoint ? nextPoint.id === pointId : false;
  };

  // 📷 Lógica del Scanner con redirección de endpoint según el contexto (Normal vs Master Entry/Exit)
  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    let timer: ReturnType<typeof setTimeout>;

    if (isScanning) {
      timer = setTimeout(() => {
        const container = document.getElementById("reader");  
        if (!container) return;

        scanner = new Html5QrcodeScanner(
          "reader",
          { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            rememberLastUsedCamera: true,
            videoConstraints: { facingMode: "environment" }
          },
          false
        );

        const onScanSuccess = async (decodedText: string) => {
          setStatusMessage({ type: 'info', text: 'Procesando lectura...' });
          
          if (scanner) {
            try {
              await scanner.clear();
            } catch (e) {
              console.error("Error al limpiar el scanner:", e);
            }
          }
          setIsScanning(false);

          try {
            let endpoint = '/api/rounds/scan';
            if (activeMasterAction === 'ENTRY') {
              endpoint = '/api/rounds/scan-master-entry'; // 👈 Endpoint dedicado para Ingreso
            } else if (activeMasterAction === 'EXIT') {
              endpoint = '/api/rounds/scan-master-exit';  // 👈 Endpoint dedicado para Salida
            }

            const { data } = await axios.post(endpoint, { qrCodeToken: decodedText });

            setActiveMasterAction(null);

            if (data.roundCompleted) {
              setActiveRound(null);
              setStatusMessage({
                type: 'success',
                text: `🎉 ¡COMPLETADA! ${data.message || 'Has finalizado exitosamente todos los puntos de la ronda.'}`
              });
            } else {
              setStatusMessage({
                type: 'success',
                text: `✅ ${data.message || 'Punto registrado con éxito'}`
              });

              if (data.round && data.round.id) {
                setActiveRound(data.round);
              } else {
                await checkActiveRound(false);
              }
            }

          } catch (err: any) {
            setActiveMasterAction(null);
            setStatusMessage({
              type: 'error',
              text: err.response?.data?.message || 'Error al procesar el código QR.'
            });
          }
        };

        scanner.render(onScanSuccess, () => {});
      }, 100);
    }

    return () => {
      clearTimeout(timer);
      if (scanner) {
        scanner.clear().catch((err) => {
          console.error("Fallo al limpiar el scanner en unmount:", err);
        });
      }
    };
  }, [isScanning, activeMasterAction]);

  const isPointScanned = (pointId: string) => {
    if (!activeRound || !activeRound.checks) return false;
    return activeRound.checks.some(check => check.controlPoint?.id === pointId);
  };

  const getExternalPointVisits = (pointId: string) => {
    if (!activeRound || !activeRound.checks) return 0;
    return activeRound.checks.filter(c => c.controlPoint?.id === pointId).length;
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: '#64748b', fontWeight: '500' }}>
        ⏳ Cargando estado del turno...
      </div>
    );
  }

  const normalPoints = controlPoints.filter(p => {
    const name = p.name.toUpperCase();
    return !name.includes('MASTER') && !name.includes('EXTERNO');
  });

  const masterPoints = controlPoints.filter(p => p.name.toUpperCase().includes('MASTER'));
  const externalPoints = controlPoints.filter(p => p.name.toUpperCase().includes('EXTERNO'));

  const completedNormalCount = activeRound?.checks?.filter(
    c => {
      const name = c.controlPoint?.name.toUpperCase() || '';
      return !name.includes('MASTER') && !name.includes('EXTERNO');
    }
  ).length || 0;

  const imagesForSelectedPoint = selectedPointForModal
    ? tenantImages.filter(img => img.checkpointId === selectedPointForModal.id)
    : [];

  return (
    <div style={{ maxWidth: '500px', margin: '20px auto', padding: '16px', fontFamily: 'sans-serif' }}>
      
      {/* Tarjeta de estado de ronda */}
      <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '1px solid #cbd5e1', textAlign: 'center', marginBottom: '16px' }}>
        <h2 style={{ color: '#1e293b', margin: '0 0 10px 0' }}>🛡️ Ronda de Seguridad</h2>
        
        {activeRound ? (
          <div>
            <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 12px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold' }}>
              🟢 Ronda en Curso (IN_PROGRESS)
            </span>
            
            <div style={{ marginTop: '12px', background: '#f8fafc', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '13px', color: '#64748b' }}>Tiempo límite de la ronda:</span>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: remainingTime !== null && remainingTime < 300 ? '#dc2626' : '#0f766e' }}>
                {remainingTime !== null && remainingTime > 0 ? formatTime(remainingTime) : '00:00'}
              </div>
            </div>

            <p style={{ color: '#475569', fontSize: '15px', marginTop: '12px' }}>
              Puntos completados: <strong>{completedNormalCount} / {normalPoints.length}</strong>
            </p>
          </div>
        ) : (
          <div>
            <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '4px 12px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold' }}>
              {wasRoundAbandoned ? '⚠️ Ronda Abandonada / Expirada (ABANDONED)' : '🔴 Fuera de Ronda'}
            </span>

            {wasRoundAbandoned ? (
              <div style={{ marginTop: '12px' }}>
                <p style={{ color: '#b91c1c', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                  El sistema marcó la ronda anterior como ABANDONED. Ingresa una observación opcional:
                </p>
                <textarea
                  placeholder="Ej: Novedad atendiendo la garita..."
                  value={abandonNotes}
                  onChange={(e) => setAbandonNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    marginBottom: '12px',
                    minHeight: '70px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    fontFamily: 'sans-serif'
                  }}
                />
              </div>
            ) : (
              <p style={{ color: '#64748b', fontSize: '14px', marginTop: '12px', marginBottom: '16px' }}>
                Inicia una nueva ronda antes de comenzar a patrullar.
              </p>
            )}

            <button 
              onClick={handleStartRound}
              style={{ background: '#2563eb', color: '#fff', padding: '12px 24px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', width: '100%', marginTop: '8px' }}
            >
              🚀 Iniciar Nueva Ronda
            </button>
          </div>
        )}
      </div>

      {/* Visor de Feedback */}
      {statusMessage && (
        <div style={{ 
          padding: '16px', 
          borderRadius: '8px', 
          marginBottom: '16px', 
          fontWeight: '500',
          fontSize: '14px',
          textAlign: 'center',
          background: statusMessage.type === 'success' ? '#dcfce7' : statusMessage.type === 'error' ? '#fee2e2' : '#f1f5f9',
          color: statusMessage.type === 'success' ? '#15803d' : statusMessage.type === 'error' ? '#b91c1c' : '#475569',
          border: `1px solid ${statusMessage.type === 'success' ? '#bbf7d0' : statusMessage.type === 'error' ? '#fecaca' : '#e2e8f0'}`
        }}>
          {statusMessage.text}
        </div>
      )}

      {/* Cámara / Lector QR */}
      {activeRound && (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '1px solid #cbd5e1', marginBottom: '16px' }}>
          {isScanning ? (
            <div>
              <h3 style={{ fontSize: '16px', color: '#334155', textAlign: 'center', marginTop: 0, marginBottom: '12px' }}>
                {activeMasterAction === 'ENTRY' ? 'Escaneando QR para Ingreso' : activeMasterAction === 'EXIT' ? 'Escaneando QR para Salida' : 'Apunta al código QR físico del punto'}
              </h3>
              <div style={{ textAlign: 'center', padding: '12px 0', color: '#64748b', fontSize: '13px', fontStyle: 'italic' }}>
                Iniciando cámara... Por favor otorga permisos si el navegador lo solicita.
              </div>
              <div id="reader" style={{ width: '100%' }}></div>
              <button 
                onClick={() => { setIsScanning(false); setActiveMasterAction(null); }}
                style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', marginTop: '12px', width: '100%', fontWeight: 'bold' }}
              >
                Cancelar Cámara
              </button>
            </div>
          ) : (
            <button 
              onClick={() => { setActiveMasterAction(null); setStatusMessage(null); setIsScanning(true); }}
              style={{ background: '#0f766e', color: '#fff', padding: '12px 24px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', width: '100%' }}
            >
              📷 Abrir Cámara y Escanear Siguiente Punto
            </button>
          )}
        </div>
      )}

      {/* Listado de la Ruta de Patrullaje */}
      {controlPoints.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* PUNTOS NORMALES */}
          <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '1px solid #cbd5e1' }}>
            <h3 style={{ color: '#1e293b', margin: '0 0 16px 0', fontSize: '16px' }}>🗺️ Ruta de Patrullaje (Secuencial)</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {normalPoints.map((point, index) => {
                const completado = isPointScanned(point.id);
                const esSiguiente = isNextNormalPoint(point.id);
                const pointImages = tenantImages.filter(img => img.checkpointId === point.id);
                const hasImages = pointImages.length > 0;

                return (
                  <div 
                    key={point.id} 
                    onClick={() => setSelectedPointForModal(point)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      padding: '12px', 
                      borderRadius: '8px', 
                      background: completado ? '#f0fdf4' : esSiguiente ? '#eff6ff' : '#f8fafc',
                      border: `1px solid ${completado ? '#bbf7d0' : esSiguiente ? '#bfdbfe' : '#e2e8f0'}`,
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ 
                      width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px', fontSize: '12px',
                      background: completado ? '#22c55e' : esSiguiente ? '#3b82f6' : '#cbd5e1', color: '#fff', fontWeight: 'bold'
                    }}>
                      {completado ? '✓' : index + 1}
                    </div>

                    <span style={{ 
                      color: completado ? '#166534' : esSiguiente ? '#1e40af' : '#334155', 
                      fontWeight: completado || esSiguiente ? 'bold' : 'normal',
                      flex: 1
                    }}>
                      {point.name}
                      {hasImages && (
                        <span style={{ marginLeft: '6px', fontSize: '12px', background: '#e2e8f0', padding: '2px 6px', borderRadius: '10px' }}>
                          📷 {pointImages.length}
                        </span>
                      )}
                    </span>

                    <span style={{ fontSize: '12px', fontWeight: '600', color: completado ? '#15803d' : esSiguiente ? '#2563eb' : '#64748b' }}>
                      {completado ? 'Completado' : esSiguiente ? 'Siguiente' : 'Pendiente'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* PUNTOS MASTER */}
          {masterPoints.length > 0 && (
            <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '1px solid #d946ef' }}>
              <h3 style={{ color: '#86198f', margin: '0 0 8px 0', fontSize: '16px' }}>⭐ Punto Master (Control de Acceso y Notificación)</h3>
              <p style={{ fontSize: '13px', color: '#701a75', marginTop: 0, marginBottom: '12px' }}>
                Selecciona la acción para registrar Ingreso/Salida utilizando la cámara, o bien escanealo como parte normal de la ronda.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {masterPoints.map((point) => {
                  const completado = isPointScanned(point.id);
                  const pointImages = tenantImages.filter(img => img.checkpointId === point.id);
                  const hasImages = pointImages.length > 0;

                  return (
                    <div 
                      key={point.id} 
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        padding: '12px 16px', 
                        borderRadius: '8px', 
                        background: '#fdf4ff',
                        border: '1px dashed #d946ef',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => setSelectedPointForModal(point)}>
                          <div style={{ 
                            width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px', fontSize: '14px',
                            background: '#d946ef', color: '#fff'
                          }}>
                            ⭐
                          </div>
                          <span style={{ color: '#86198f', fontWeight: 'bold', fontSize: '14px' }}>
                            {point.name}
                            {hasImages && (
                              <span style={{ marginLeft: '6px', fontSize: '12px', background: '#f5d0fe', padding: '2px 6px', borderRadius: '10px' }}>
                                📷 {pointImages.length}
                              </span>
                            )}
                          </span>
                        </div>
                        <span style={{ fontSize: '11px', background: '#fae8ff', color: '#a21caf', padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>
                          {completado ? 'Escaneado en la ronda' : 'Libre / Comodín'}
                        </span>
                      </div>

                      {/* Botones independientes que configuran la ruta hacia su endpoint específico */}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <button
                          onClick={() => {
                            setActiveMasterAction('ENTRY');
                            setStatusMessage(null);
                            setIsScanning(true);
                          }}
                          style={{
                            flex: 1,
                            background: '#15803d',
                            color: '#fff',
                            border: 'none',
                            padding: '8px',
                            borderRadius: '6px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '13px'
                          }}
                        >
                          📥 Registrar Ingreso
                        </button>
                        <button
                          onClick={() => {
                            setActiveMasterAction('EXIT');
                            setStatusMessage(null);
                            setIsScanning(true);
                          }}
                          style={{
                            flex: 1,
                            background: '#b91c1c',
                            color: '#fff',
                            border: 'none',
                            padding: '8px',
                            borderRadius: '6px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '13px'
                          }}
                        >
                          📤 Registrar Salida
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PUNTOS EXTERNOS */}
          {externalPoints.length > 0 && (
            <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '1px solid #38bdf8' }}>
              <h3 style={{ color: '#0369a1', margin: '0 0 8px 0', fontSize: '16px' }}>🌐 Puntos Externos (2 veces al día)</h3>
              <p style={{ fontSize: '13px', color: '#0284c7', marginTop: 0, marginBottom: '12px' }}>
                Debes completarlos un máximo de 2 veces al día.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {externalPoints.map((point) => {
                  const visitsCount = getExternalPointVisits(point.id);
                  const isCompletedLimit = visitsCount >= 2;
                  const pointImages = tenantImages.filter(img => img.checkpointId === point.id);
                  const hasImages = pointImages.length > 0;

                  return (
                    <div 
                      key={point.id} 
                      onClick={() => setSelectedPointForModal(point)}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        padding: '12px 16px', 
                        borderRadius: '8px', 
                        background: isCompletedLimit ? '#f0fdf4' : '#f0f9ff',
                        border: `1px dashed ${isCompletedLimit ? '#22c55e' : '#38bdf8'}`,
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ 
                          width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px', fontSize: '14px',
                          background: isCompletedLimit ? '#22c55e' : '#0284c7', color: '#fff'
                        }}>
                          🌐
                        </div>
                        <span style={{ color: isCompletedLimit ? '#166534' : '#0369a1', fontWeight: 'bold', fontSize: '14px' }}>
                          {point.name}
                          {hasImages && (
                            <span style={{ marginLeft: '6px', fontSize: '12px', background: '#bae6fd', padding: '2px 6px', borderRadius: '10px' }}>
                              📷 {pointImages.length}
                            </span>
                          )}
                        </span>
                      </div>
                      <span style={{ 
                        fontSize: '11px', 
                        background: isCompletedLimit ? '#dcfce7' : '#e0f2fe', 
                        color: isCompletedLimit ? '#15803d' : '#0369a1', 
                        padding: '4px 8px', 
                        borderRadius: '4px', 
                        fontWeight: '600' 
                      }}>
                        Visitas hoy: {visitsCount} / 2
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}

      {/* 🖼️ MODAL / VISOR DE IMÁGENES */}
      {selectedPointForModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            maxWidth: '450px',
            width: '100%',
            maxHeight: '85vh',
            overflowY: 'auto',
            padding: '20px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px' }}>
                📍 {selectedPointForModal.name}
              </h3>
              <button 
                onClick={() => setSelectedPointForModal(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                ✕
              </button>
            </div>

            {imagesForSelectedPoint.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                  Imágenes de referencia asignadas a este punto ({imagesForSelectedPoint.length}):
                </p>
                {imagesForSelectedPoint.map((img) => (
                  <div key={img.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: '#f8fafc' }}>
                    <img 
                      src={img.imageUrl} 
                      alt={img.description || 'Punto de control'} 
                      style={{ width: '100%', height: 'auto', display: 'block', maxHeight: 'none', objectFit: 'contain' }} 
                    />
                    {img.description && (
                      <p style={{ padding: '8px 12px', margin: 0, fontSize: '13px', color: '#334155' }}>
                        {img.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b' }}>
                <p style={{ fontSize: '32px', margin: '0 0 8px 0' }}>📷</p>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>
                  No hay imágenes de referencia asociadas a este punto.
                </p>
              </div>
            )}

            <button
              onClick={() => setSelectedPointForModal(null)}
              style={{
                marginTop: '20px',
                width: '100%',
                padding: '10px',
                background: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

    </div>
  );
}