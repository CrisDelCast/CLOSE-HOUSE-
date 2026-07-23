import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCompletedRounds } from '../../api/rounds';
import { fetchTenants } from '../../api/tenants';
import axios from '../../api/axios'; // 👈 Importamos axios para traer los puntos de control
import { useAuthContext } from '../../context/AuthContext';
import type { Tenant } from '../../types';

export interface Round {
  id: string;
  tenantId: string;
  guard?: {
    fullName: string;
  };
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  startedAt: string;
  completedAt: string | null;
  // Si tu backend algún día los manda, se usarán; si no, los calculamos abajo
  completedCheckpointsCount?: number;
  totalCheckpointsCount?: number;
  checks?: Array<{
    id: string;
    controlPoint?: {
      id: string;
    };
  }>;
}

interface ControlPoint {
  id: string;
  name: string;
  sequenceOrder: number;
}

interface RoundsAuditPageProps {
  tenantId?: string;
}

export default function RoundsAuditPage({ tenantId: propTenantId }: RoundsAuditPageProps) {
  const { user } = useAuthContext();
  
  const { data: tenants } = useQuery({ 
    queryKey: ['tenants'], 
    queryFn: fetchTenants 
  });

  const safeTenants: Tenant[] = Array.isArray(tenants) ? tenants : [];
  const initialTenantId = propTenantId || user?.tenantId || (user as any)?.tenant_id || '';

  const [selectedTenantId, setSelectedTenantId] = useState<string>(initialTenantId);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedRoundId, setExpandedRoundId] = useState<string | null>(null);

  useEffect(() => {
    if (safeTenants.length > 0 && !selectedTenantId) {
      setSelectedTenantId(safeTenants[0].id);
    }
  }, [safeTenants, selectedTenantId]);

  // 1. Consultamos las rondas
  const {
    data: rounds = [],
    isLoading,
    isError,
  } = useQuery<Round[]>({
    queryKey: ['completed-rounds', selectedTenantId, startDate, endDate],
    queryFn: () => fetchCompletedRounds(selectedTenantId, { startDate, endDate }),
    enabled: !!selectedTenantId,
  });

  // 2. Consultamos la lista total de puntos de control del tenant seleccionado (igual que en Ronda)
  const { data: controlPoints = [] } = useQuery<ControlPoint[]>({
    queryKey: ['control-points', selectedTenantId],
    queryFn: async () => {
      if (!selectedTenantId) return [];
      const { data } = await axios.get(`/api/control-points/tenant/${selectedTenantId}`);
      return data;
    },
    enabled: !!selectedTenantId,
  });

  const formatDate = (value?: string | null) => {
    if (!value) return 'N/D';
    return new Date(value).toLocaleString();
  };

  const calculateDuration = (start: string, end: string | null) => {
    if (!start || !end) return 'N/D';
    const diffMs = new Date(end).getTime() - new Date(start).getTime();
    const diffMins = Math.round(diffMs / 60000);
    return `${diffMins} minutos`;
  };

  const toggleRow = (id: string) => {
    setExpandedRoundId((prev) => (prev === id ? null : id));
  };

  // 3. Calculamos el progreso exacto usando la cantidad total de puntos del tenant y los checks de la ronda
  const getRoundProgress = (round: Round) => {
    const total = controlPoints.length; // 👈 El total real de puntos configurados (ej: 5)
    const completed = round.checks?.length ?? round.completedCheckpointsCount ?? 0;
    return { completed, total };
  };

  const getStatusBadge = (status: Round['status']) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399' }}></span>
            Completada
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', background: 'rgba(212, 175, 55, 0.1)', color: '#D4AF37', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#D4AF37' }}></span>
            En Proceso
          </span>
        );
      case 'ABANDONED':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f87171' }}></span>
            Abandonada
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ 
      maxWidth: '80rem', 
      margin: '0 auto', 
      paddingBottom: '3rem',
      paddingLeft: '1rem',
      paddingRight: '1rem',
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
          padding: 10px 14px;
          border-radius: 12px;
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
        .golden-badge {
          display: inline-block;
          background: rgba(212, 175, 55, 0.12);
          color: #D4AF37; 
          border: 1px solid rgba(212, 175, 55, 0.4);
          padding: 6px 12px;
          border-radius: 8px;
          font-weight: 700;
          box-shadow: 0 2px 8px rgba(212, 175, 55, 0.05);
          letter-spacing: 0.5px;
        }
        .table-row-hover:hover {
          background-color: rgba(255, 255, 255, 0.02);
        }
        .clickable-id {
          color: #D4AF37;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.2s;
        }
        .clickable-id:hover {
          text-decoration: underline;
          color: #fcd34d;
        }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Encabezado y Filtros */}
        <div style={{ 
          background: 'rgba(22, 22, 26, 0.95)', 
          padding: '24px', 
          borderRadius: '16px', 
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)', 
          border: '1px solid rgba(212, 175, 55, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#ffffff', margin: 0, letterSpacing: '-0.025em' }}>
              Auditoría de Rondas
            </h1>
            <p style={{ fontSize: '13px', color: '#a3a3a3', margin: '4px 0 0 0' }}>
              Revisión, control y seguimiento de las rondas de vigilancia.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', paddingTop: '16px', borderTop: '1px solid #2e2e33', alignItems: 'end' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(212, 175, 55, 0.9)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Conjunto / Tenant</label>
              <select value={selectedTenantId} onChange={(e) => setSelectedTenantId(e.target.value)} className="custom-input">
                <option value="" style={{ background: '#121214', color: '#ffffff' }}>Seleccione un conjunto...</option>
                {safeTenants.map((t) => (
                  <option key={t.id} value={t.id} style={{ background: '#121214', color: '#ffffff' }}>{t.name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(212, 175, 55, 0.9)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Desde</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="custom-input" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(212, 175, 55, 0.9)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hasta</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="custom-input" />
            </div>
          </div>
        </div>

        {/* Contenido de la Tabla */}
        <div style={{ background: 'rgba(22, 22, 26, 0.95)', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.6)', border: '1px solid rgba(212, 175, 55, 0.2)', overflow: 'hidden' }}>
          
          {isLoading && (
            <div style={{ padding: '48px', textAlign: 'center', color: '#a3a3a3' }}>Cargando registros...</div>
          )}

          {!isLoading && rounds.length === 0 && (
            <div style={{ padding: '48px', textAlign: 'center', color: '#a3a3a3' }}>
              No se encontraron rondas registradas.
            </div>
          )}

          {!isLoading && !isError && rounds.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', whiteSpace: 'nowrap', minWidth: '800px' }}>
                <thead>
                  <tr style={{ background: 'rgba(136, 126, 38, 0.8)', color: '#ffffff', borderBottom: '1px solid #2e2e33', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '14px 24px' }}>ID Ronda</th>
                    <th style={{ padding: '14px 24px' }}>Guarda / Vigilante</th>
                    <th style={{ padding: '14px 24px' }}>Progreso</th>
                    <th style={{ padding: '14px 24px' }}>Estado</th>
                    <th style={{ padding: '14px 24px' }}>Iniciada</th>
                    <th style={{ padding: '14px 24px' }}>Completada</th>
                  </tr>
                </thead>
                <tbody style={{ color: '#ffffff' }}>
                  {rounds.map((round) => {
                    const { completed, total } = getRoundProgress(round);
                    
                    return (
                      <React.Fragment key={round.id}>
                        <tr className="table-row-hover" style={{ borderBottom: expandedRoundId === round.id ? 'none' : '1px solid #1c1c1f', backgroundColor: expandedRoundId === round.id ? 'rgba(255, 255, 255, 0.03)' : 'transparent' }}>
                          <td style={{ padding: '16px 24px', fontFamily: 'monospace', fontSize: '12px' }}>
                            <span className="clickable-id" onClick={() => toggleRow(round.id)}>
                              {expandedRoundId === round.id ? '▼' : '▶'} {round.id.substring(0, 8)}...
                            </span>
                          </td>
                          <td style={{ padding: '16px 24px' }}>
                            <span className="golden-badge" style={{ fontSize: '13px' }}>
                              {round.guard?.fullName ?? 'No asignado'}
                            </span>
                          </td>
                          <td style={{ padding: '16px 24px', fontSize: '14px' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#121214', border: '1px solid #2e2e33', padding: '6px 10px', borderRadius: '8px' }}>
                              <span style={{ fontWeight: '700', color: '#ffffff' }}>{completed}</span>
                              <span style={{ color: '#D4AF37', fontSize: '12px' }}>/ {total}</span>
                            </div>
                          </td>
                          <td style={{ padding: '16px 24px' }}>
                            {getStatusBadge(round.status)}
                          </td>
                          <td style={{ padding: '16px 24px', color: '#a3a3a3', fontSize: '12px' }}>
                            {formatDate(round.startedAt)}
                          </td>
                          <td style={{ padding: '16px 24px', color: '#a3a3a3', fontSize: '12px' }}>
                            {formatDate(round.completedAt)}
                          </td>
                        </tr>

                        {/* Fila expandida - Resumen del proceso */}
                        {expandedRoundId === round.id && (
                          <tr style={{ background: 'rgba(18, 18, 20, 0.8)', borderBottom: '1px solid #1c1c1f' }}>
                            <td colSpan={6} style={{ padding: '24px' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', background: '#16161a', padding: '20px', borderRadius: '12px', border: '1px solid rgba(212, 175, 55, 0.15)' }}>
                                
                                <div>
                                  <h4 style={{ color: 'rgba(212, 175, 55, 0.9)', margin: '0 0 12px 0', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Detalles de la Ronda
                                  </h4>
                                  <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#ffffff' }}>
                                    <strong>ID Completo:</strong> <span style={{ fontFamily: 'monospace', color: '#a3a3a3' }}>{round.id}</span>
                                  </p>
                                  <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#ffffff' }}>
                                    <strong>Guarda a cargo:</strong> <span style={{ color: '#a3a3a3' }}>{round.guard?.fullName ?? 'N/D'}</span>
                                  </p>
                                  <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#ffffff' }}>
                                    <strong>Tenant ID:</strong> <span style={{ fontFamily: 'monospace', color: '#a3a3a3' }}>{round.tenantId}</span>
                                  </p>
                                </div>

                                <div>
                                  <h4 style={{ color: 'rgba(212, 175, 55, 0.9)', margin: '0 0 12px 0', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Ejecución y Tiempos
                                  </h4>
                                  <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#ffffff' }}>
                                    <strong>Puntos escaneados:</strong> <span style={{ color: '#a3a3a3' }}>{completed} de {total}</span>
                                  </p>
                                  <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#ffffff' }}>
                                    <strong>Estado final:</strong> <span style={{ color: '#a3a3a3' }}>{round.status === 'ABANDONED' ? 'Incompleta (Abandonada)' : round.status === 'COMPLETED' ? 'Finalizada' : 'Aún en proceso'}</span>
                                  </p>
                                  <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#ffffff' }}>
                                    <strong>Tiempo de recorrido:</strong> <span style={{ color: '#a3a3a3' }}>{calculateDuration(round.startedAt, round.completedAt)}</span>
                                  </p>
                                </div>

                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}