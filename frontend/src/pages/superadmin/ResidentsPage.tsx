import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTenants } from '../../api/tenants'; 
import { fetchApartmentsWithDetails } from '../../api/apartments';
import type { Tenant, Apartment } from '../../types';
import styles from './ResidentsPage.module.css';

const ResidentsPage = () => {
  const { data: tenants } = useQuery({ queryKey: ['tenants'], queryFn: fetchTenants });
  const [activeTenantId, setActiveTenantId] = useState<string>('');
  const [selectedApto, setSelectedApto] = useState<Apartment | null>(null);
  const [infoDetail, setInfoDetail] = useState<{type: 'resident' | 'vehicle', data: any} | null>(null);

  const safeTenants: Tenant[] = Array.isArray(tenants) ? tenants : [];
  
  useEffect(() => {
    if (safeTenants.length > 0 && !activeTenantId) setActiveTenantId(safeTenants[0].id);
  }, [safeTenants, activeTenantId]);

  const { data: apartments } = useQuery({
    queryKey: ['apartments-details', activeTenantId],
    queryFn: () => fetchApartmentsWithDetails(activeTenantId),
    enabled: !!activeTenantId,
  });

  const closeModal = () => {
    setSelectedApto(null);
    setInfoDetail(null);
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.tenantSwitcherContainer}>
        <h3>Gestión de Unidades</h3>
        <select value={activeTenantId} onChange={(e) => setActiveTenantId(e.target.value)} className={styles.tenantSelect}>
          {safeTenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      <div className={styles.apartmentsGrid}>
        {apartments?.map((apto) => (
          <div key={apto.id} className={styles.apartmentCard} onClick={() => setSelectedApto(apto)}>
            <div className={styles.cardHeader}>
              <span className={styles.blockBadge}>{apto.block}</span>
              <span className={styles.unitNumber}>Apto {apto.number}</span>
            </div>
          </div>
        ))}
      </div>

      {selectedApto && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={closeModal}>✕</button>

            {!infoDetail ? (
              <>
                <h2 className={styles.modalTitle}>{selectedApto.block} {selectedApto.number}</h2>
                <div className={styles.modalGrid}>
                  <div className={styles.section}>
                    <h4>Residentes</h4>
                    {selectedApto.residents?.map(r => (
                      <div key={r.id} className={styles.clickableItem} onClick={() => setInfoDetail({type: 'resident', data: r})}>
                        {r.fullName}
                      </div>
                    ))}
                  </div>
                  <div className={styles.section}>
                    <h4>Vehículos</h4>
                    {selectedApto.parkingSpots?.flatMap(s => s.vehicles || []).map(v => (
                      <div key={v.id} className={styles.clickableBadge} onClick={() => setInfoDetail({type: 'vehicle', data: v})}>
                        {v.plate}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className={styles.detailView}>
                <button className={styles.backBtn} onClick={() => setInfoDetail(null)}>← Volver a la unidad</button>
                <h3>{infoDetail.type === 'resident' ? 'Información del Residente' : 'Detalle del Vehículo'}</h3>
                <div className={styles.detailBody}>
                  {Object.entries(infoDetail.data).map(([key, val]: any) => (
                    <p key={key}><strong>{key}:</strong> {String(val)}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResidentsPage;