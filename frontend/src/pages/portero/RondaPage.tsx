import { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import axios from '../../api/axios';

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
  checks: Check[];
}

export default function RondaDashboard() {
  const [activeRound, setActiveRound] = useState<ActiveRound | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // 1. Verificar si el portero ya tiene una ronda activa al cargar el dashboard
  const checkActiveRound = async () => {
    try {
      setIsLoading(true);
      const { data } = await axios.get('/api/rounds/active');
      if (data && data.id) {
        setActiveRound(data);
      } else {
        setActiveRound(null);
      }
    } catch (err) {
      console.error("Error al obtener la ronda activa:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkActiveRound();
  }, []);

  // 2. Iniciar una nueva ronda en el servidor
  const handleStartRound = async () => {
    try {
      setStatusMessage(null);
      const { data } = await axios.post('/api/rounds/start');
      setActiveRound(data);
      setIsScanning(true); // Abre la cámara inmediatamente al iniciar
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || 'No se pudo iniciar la ronda.'
      });
    }
  };

  // 3. Controlar el ciclo de vida del Escáner QR de Cámara
  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;

    if (isScanning) {
      scanner = new Html5QrcodeScanner(
        "reader",
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          rememberLastUsedCamera: true,
          // 💡 CONFIGURACIÓN CLAVE: Obliga al navegador a usar el lente trasero directamente
          videoConstraints: {
            facingMode: "environment"
          }
        },
        /* verbose= */ false
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

          setStatusMessage({
            type: 'success',
            text: `✅ ${data.message}`
          });

          if (data.roundCompleted) {
            setActiveRound(null);
          } else {
            await checkActiveRound();
          }

        } catch (err: any) {
          setStatusMessage({
            type: 'error',
            text: err.response?.data?.message || 'Error al procesar el código QR.'
          });
        }
      };

      const onScanFailure = () => { /* Ignorar ruido de frames */ };

      scanner.render(onScanSuccess, onScanFailure);
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(err => console.error("Error al desmontar escáner:", err));
      }
    };
  }, [isScanning]);

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
            <p style={{ color: '#475569', fontSize: '15px', marginTop: '12px' }}>
              Puntos completados: <strong>{activeRound.checks?.length || 0}</strong>
            </p>
          </div>
        ) : (
          <div>
            <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '4px 12px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold' }}>
              🔴 Fuera de Ronda
            </span>
            <p style={{ color: '#64748b', fontSize: '14px', marginTop: '12px' }}>
              Inicia una nueva ronda antes de comenzar a patrullar.
            </p>
            <button 
              onClick={handleStartRound}
              style={{ background: '#2563eb', color: '#fff', padding: '12px 24px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', width: '100%', marginTop: '8px' }}
            >
              🚀 Iniciar Nueva Ronda
            </button>
          </div>
        )}
      </div>

      {/* Visor de Feedback / Respuestas del Backend */}
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
        <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '1px solid #cbd5e1' }}>
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
    </div>
  );
}