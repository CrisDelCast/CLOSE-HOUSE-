import { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import axios from '../../api/axios';
import { useAuth } from '../../hooks/useAuth';

interface ControlPoint {
  id: string;
  name: string;
  sequenceOrder: number;
}

interface Check {
  id: string;
  scannedAt: string;
  controlPoint: ControlPoint;
}

interface ActiveRound {
  id: string;
  status: string;
  startedAt: string;
  timeBetweenPoints?: number;
  checks: Check[];
}

export default function RondaDashboard() {
  const { user } = useAuth();
  const tenantId = user?.tenantId;

  const [activeRound, setActiveRound] = useState<ActiveRound | null>(null);
  const [controlPoints, setControlPoints] = useState<ControlPoint[]>([]);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  
  // 📝 Estado para almacenar la nota o reporte del guardia al expirar/abandonar
  const [abandonNotes, setAbandonNotes] = useState('');
  
  // 🚨 Bandera para saber si la ronda anterior falló/expiró y mostrar las notas
  const [wasRoundAbandoned, setWasRoundAbandoned] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Obtener puntos de control del tenant
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

  // Verificar si hay ronda activa
  const checkActiveRound = async () => {
    try {
      setIsLoading(true);
      const { data } = await axios.get('/api/rounds/active');
      
      if (data && data.id) {
        setActiveRound(data);
        // Si hay una ronda activa, asumimos que todo marcha bien de momento
        setWasRoundAbandoned(false);
      } else {
        setActiveRound(null);
        setRemainingTime(null);
      }
    } catch (err) {
      console.error("Error al obtener la ronda activa:", err);
      setActiveRound(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      checkActiveRound();
      fetchControlPoints();
    }
  }, [tenantId]);

  // ⏱️ Efecto para la cuenta regresiva en tiempo real
  useEffect(() => {
    if (!activeRound || !activeRound.startedAt) return;

    const maxMinutes = activeRound.timeBetweenPoints ?? 10;
    const startTime = new Date(activeRound.startedAt).getTime();
    const totalAllowedMs = maxMinutes * 60 * 1000;

    const updateTimer = () => {
      const now = Date.now();
      const elapsedMs = now - startTime;
      const remainingMs = totalAllowedMs - elapsedMs;

      if (remainingMs <= 0) {
        setRemainingTime(0);
        setActiveRound(null);
        
        // 🚨 Marcamos que la ronda falló/expiró para forzar la aparición de las notas
        setWasRoundAbandoned(true);

        setStatusMessage({
          type: 'error',
          text: '⚠️ El tiempo límite para completar la ronda ha expirado. La ronda ha sido cerrada.'
        });
        checkActiveRound();
      } else {
        setRemainingTime(Math.floor(remainingMs / 1000));
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [activeRound]);

  // Formatear segundos a MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRound = async () => {
    try {
      setStatusMessage(null);
      if (!user?.id || !tenantId) {
        setStatusMessage({
          type: 'error',
          text: 'Faltan datos de sesión (usuario o conjunto) para iniciar la ronda.'
        });
        return;
      }

      // Enviamos el userId, tenantId y las notas opcionales redactadas por el guardia
      const { data } = await axios.post('/api/rounds/start', {
        userId: user.id,
        tenantId: tenantId,
        notes: abandonNotes
      });

      setActiveRound(data);
      setAbandonNotes(''); // Limpiamos el campo de notas tras iniciar con éxito
      setWasRoundAbandoned(false); // Ocultamos el bloque de notas para la nueva ronda
      setIsScanning(true);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || 'No se pudo iniciar la ronda.'
      });
    }
  };

  // Ciclo de vida del escáner QR
  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;

    if (isScanning) {
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
          scanner.clear().catch(err => console.error("Error al pausar:", err));
        }
        setIsScanning(false);

        try {
          const { data } = await axios.post('/api/rounds/scan', {
            qrCodeToken: decodedText
          });

          setStatusMessage({ type: 'success', text: `✅ ${data.message}` });

          if (data.roundCompleted) {
            setActiveRound(null);
            setWasRoundAbandoned(false); // Ronda terminada con éxito, sin notas obligatorias
          } else {
            await checkActiveRound();
          }
        } catch (err: any) {
          setStatusMessage({
            type: 'error',
            text: err.response?.data?.message || 'Error al procesar el código QR.'
          });
          await checkActiveRound();
        }
      };

      const onScanFailure = () => { };
      scanner.render(onScanSuccess, onScanFailure);
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(err => console.error("Error al desmontar escáner:", err));
      }
    };
  }, [isScanning]);

  const isPointScanned = (pointId: string) => {
    if (!activeRound || !activeRound.checks) return false;
    return activeRound.checks.some(check => check.controlPoint?.id === pointId);
  };

  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Cargando estado del turno...</div>;
  }

  return (
    <div style={{ maxWidth: '500px', margin: '20px auto', padding: '16px', fontFamily: 'sans-serif' }}>
      
      {/* Tarjeta de estado de ronda */}
      <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '1px solid #cbd5e1', textAlign: 'center', marginBottom: '16px' }}>
        <h2 style={{ color: '#1e293b', margin: '0 0 10px 0' }}>🛡️ Ronda de Seguridad</h2>
        
        {activeRound ? (
          <div>
            <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 12px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold' }}>
              🟢 Ronda en Curso
            </span>
            
            {/* ⏱️ Indicador visual de tiempo restante */}
            <div style={{ marginTop: '12px', background: '#f8fafc', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '13px', color: '#64748b' }}>Tiempo límite restante:</span>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: remainingTime !== null && remainingTime < 300 ? '#dc2626' : '#0f766e' }}>
                {remainingTime !== null ? formatTime(remainingTime) : '--:--'}
              </div>
            </div>

            <p style={{ color: '#475569', fontSize: '15px', marginTop: '12px' }}>
              Puntos completados: <strong>{activeRound.checks?.length || 0} / {controlPoints.length}</strong>
            </p>
          </div>
        ) : (
          <div>
            <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '4px 12px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold' }}>
              🔴 Fuera de Ronda
            </span>

            {/* 📝 CONDICIONAL: Solo aparece si la ronda anterior falló/expiró */}
            {wasRoundAbandoned ? (
              <div style={{ marginTop: '12px' }}>
                <p style={{ color: '#b91c1c', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                  La ronda anterior expiró. Por favor, ingresa una observación o motivo por el cual no se completó a tiempo:
                </p>
                <textarea
                  placeholder="Ej: Novedad atendiendo la garita, demoras justificadas..."
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
                Haz clic en el botón para iniciar una nueva ronda de patrullaje.
              </p>
            )}

            <button 
              onClick={handleStartRound}
              style={{ background: '#2563eb', color: '#fff', padding: '12px 24px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', width: '100%' }}
            >
              🚀 Iniciar Nueva Ronda
            </button>
          </div>
        )}
      </div>

      {/* Visor de Feedback */}
      {statusMessage && (
        <div style={{ 
          padding: '16px', borderRadius: '8px', marginBottom: '16px', fontWeight: '500', fontSize: '14px', textAlign: 'center',
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
              <h3 style={{ fontSize: '16px', color: '#334155', textAlign: 'center', marginTop: 0, marginBottom: '12px' }}>Apunta al código QR físico del punto</h3>
              <div id="reader" style={{ width: '100%' }}></div>
              <button 
                onClick={() => setIsScanning(false)}
                style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', marginTop: '12px', width: '100%', fontWeight: 'bold' }}
              >
                Cancelar Cámara
              </button>
            </div>
          ) : (
            <button 
              onClick={() => { setStatusMessage(null); setIsScanning(true); }}
              style={{ background: '#0f766e', color: '#fff', padding: '12px 24px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', width: '100%' }}
            >
              📷 Abrir Cámara y Escanear Punto
            </button>
          )}
        </div>
      )}

      {/* Lista Visual de Puntos de Control */}
      {controlPoints.length > 0 && (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '1px solid #cbd5e1' }}>
          <h3 style={{ color: '#1e293b', margin: '0 0 16px 0', fontSize: '16px' }}>📍 Ruta de Patrullaje</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {controlPoints.map((point) => {
              const completado = isPointScanned(point.id);
              
              return (
                <div key={point.id} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '12px', 
                  borderRadius: '8px', 
                  background: completado ? '#f0fdf4' : '#f8fafc',
                  border: `1px solid ${completado ? '#bbf7d0' : '#e2e8f0'}`,
                  opacity: (activeRound && !completado) ? 1 : 0.7
                }}>
                  <div style={{ 
                    width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px', fontSize: '12px',
                    background: completado ? '#22c55e' : '#cbd5e1', color: '#fff'
                  }}>
                    {completado ? '✓' : point.sequenceOrder}
                  </div>
                  <span style={{ 
                    color: completado ? '#166534' : '#334155', 
                    fontWeight: completado ? 'bold' : 'normal',
                    textDecoration: completado ? 'line-through' : 'none'
                  }}>
                    {point.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}