import { useState, useEffect, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTenants } from '../../api/tenants';
import {
  fetchApartmentsWithDetails,
  createApartment,
  createParkingSpot,
  createVehicle,
} from '../../api/apartments';
import { createResident } from '../../api/residents';
import { useAuthContext } from '../../context/AuthContext';
import type { Tenant, Apartment } from '../../types';
import styles from './ResidentsPage.module.css';

type ModalView = 'unit' | 'detail' | 'add-resident' | 'add-vehicle';

const RESIDENT_FIELD_LABELS: Record<string, string> = {
  id: 'ID',
  tenantId: 'Conjunto',
  fullName: 'Nombre completo',
  documentId: 'Documento',
  email: 'Correo',
  phone: 'Teléfono',
  apartmentId: 'Apartamento',
  createdAt: 'Fecha de registro',
};

const VEHICLE_FIELD_LABELS: Record<string, string> = {
  id: 'ID',
  plate: 'Placa',
  brand: 'Marca',
  color: 'Color',
  tenantId: 'Conjunto',
  parkingSpotId: 'Parqueadero',
};

const ResidentsPage = () => {
  const queryClient = useQueryClient();
  const { switchTenant } = useAuthContext();

  const { data: tenants } = useQuery({ queryKey: ['tenants'], queryFn: fetchTenants });
  const [activeTenantId, setActiveTenantId] = useState<string>('');
  const [selectedApto, setSelectedApto] = useState<Apartment | null>(null);
  const [modalView, setModalView] = useState<ModalView>('unit');
  const [infoDetail, setInfoDetail] = useState<{ type: 'resident' | 'vehicle'; data: Record<string, unknown> } | null>(null);
  const [showCreateAptoModal, setShowCreateAptoModal] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [formError, setFormError] = useState('');

  const [aptoForm, setAptoForm] = useState({ block: '', number: '' });
  const [residentForm, setResidentForm] = useState({
    fullName: '',
    documentId: '',
    email: '',
    phone: '',
  });
  const [vehicleForm, setVehicleForm] = useState({
    plate: '',
    brand: '',
    color: '',
    parkingSpotId: '',
    newParkingNumber: '',
  });

  const safeTenants: Tenant[] = Array.isArray(tenants) ? tenants : [];

  useEffect(() => {
    if (safeTenants.length > 0 && !activeTenantId) {
      setActiveTenantId(safeTenants[0].id);
    }
  }, [safeTenants, activeTenantId]);

  useEffect(() => {
    if (activeTenantId) {
      switchTenant(activeTenantId);
    }
  }, [activeTenantId, switchTenant]);

  const { data: apartments, isLoading: isLoadingAptos } = useQuery({
    queryKey: ['apartments-details', activeTenantId],
    queryFn: () => fetchApartmentsWithDetails(activeTenantId),
    enabled: !!activeTenantId,
  });

  const invalidateApartments = () => {
    queryClient.invalidateQueries({ queryKey: ['apartments-details', activeTenantId] });
  };

  const extractErrorMessage = (error: unknown): string => {
    if (error && typeof error === 'object' && 'response' in error) {
      const response = (error as { response?: { data?: { message?: string | string[] } } }).response;
      const message = response?.data?.message;
      if (Array.isArray(message)) return message.join(', ');
      if (typeof message === 'string') return message;
    }
    return 'Ocurrió un error inesperado. Intenta de nuevo.';
  };

  const createAptoMutation = useMutation({
    mutationFn: createApartment,
    onSuccess: () => {
      invalidateApartments();
      setShowCreateAptoModal(false);
      setAptoForm({ block: '', number: '' });
      setFeedback('Apartamento creado correctamente.');
      setFormError('');
    },
    onError: (error) => setFormError(extractErrorMessage(error)),
  });

  const createResidentMutation = useMutation({
    mutationFn: (data: Parameters<typeof createResident>[0]) => createResident(data, activeTenantId),
    onSuccess: (newResident) => {
      invalidateApartments();
      setSelectedApto((prev) =>
        prev
          ? { ...prev, residents: [...(prev.residents ?? []), newResident] }
          : prev,
      );
      setResidentForm({ fullName: '', documentId: '', email: '', phone: '' });
      setModalView('unit');
      setFeedback('Residente registrado correctamente.');
      setFormError('');
    },
    onError: (error) => setFormError(extractErrorMessage(error)),
  });

  const createVehicleMutation = useMutation({
    mutationFn: async () => {
      if (!selectedApto) throw new Error('No hay apartamento seleccionado.');

      let parkingSpotId = vehicleForm.parkingSpotId;

      if (!parkingSpotId) {
        const spotNumber = vehicleForm.newParkingNumber.trim();
        if (!spotNumber) {
          throw new Error('Indica el número del parqueadero.');
        }
        const spot = await createParkingSpot({
          tenantId: activeTenantId,
          apartmentId: selectedApto.id,
          number: spotNumber,
        });
        parkingSpotId = spot.id;
      }

      return createVehicle({
        tenantId: activeTenantId,
        parkingSpotId,
        plate: vehicleForm.plate.trim(),
        brand: vehicleForm.brand.trim() || undefined,
        color: vehicleForm.color.trim() || undefined,
      });
    },
    onSuccess: async () => {
      setVehicleForm({ plate: '', brand: '', color: '', parkingSpotId: '', newParkingNumber: '' });
      setModalView('unit');
      setFeedback('Vehículo registrado correctamente.');
      setFormError('');

      const updated = await queryClient.fetchQuery({
        queryKey: ['apartments-details', activeTenantId],
        queryFn: () => fetchApartmentsWithDetails(activeTenantId),
      });
      const refreshed = updated.find((a) => a.id === selectedApto?.id);
      if (refreshed) setSelectedApto(refreshed);
    },
    onError: (error) => setFormError(extractErrorMessage(error)),
  });

  const handleTenantChange = (tenantId: string) => {
    setActiveTenantId(tenantId);
    setSelectedApto(null);
    setFeedback('');
    setFormError('');
  };

  const closeUnitModal = () => {
    setSelectedApto(null);
    setModalView('unit');
    setInfoDetail(null);
    setFormError('');
  };

  const openApartmentModal = (apto: Apartment) => {
    setSelectedApto(apto);
    setModalView('unit');
    setInfoDetail(null);
    setFormError('');
    setVehicleForm({
      plate: '',
      brand: '',
      color: '',
      parkingSpotId: apto.parkingSpots?.[0]?.id ?? '',
      newParkingNumber: '',
    });
  };

  const handleCreateApartment = (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!aptoForm.number.trim()) {
      setFormError('El número de apartamento es obligatorio.');
      return;
    }
    createAptoMutation.mutate({
      tenantId: activeTenantId,
      number: aptoForm.number.trim(),
      block: aptoForm.block.trim() || undefined,
    });
  };

  const handleCreateResident = (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!selectedApto) return;
    createResidentMutation.mutate({
      ...residentForm,
      fullName: residentForm.fullName.trim(),
      documentId: residentForm.documentId.trim(),
      email: residentForm.email.trim(),
      phone: residentForm.phone.trim() || undefined,
      apartmentId: selectedApto.id,
    });
  };

  const handleCreateVehicle = (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!vehicleForm.plate.trim()) {
      setFormError('La placa es obligatoria.');
      return;
    }
    createVehicleMutation.mutate();
  };

  const formatDetailLabel = (type: 'resident' | 'vehicle', key: string) => {
    const labels = type === 'resident' ? RESIDENT_FIELD_LABELS : VEHICLE_FIELD_LABELS;
    return labels[key] ?? key;
  };

  const existingParkingSpots = selectedApto?.parkingSpots ?? [];
  const isSubmitting =
    createAptoMutation.isPending || createResidentMutation.isPending || createVehicleMutation.isPending;

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.tenantSwitcherContainer}>
        <div className={styles.headerRow}>
          <h3>Gestión de Unidades</h3>
          {activeTenantId && (
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={() => {
                setShowCreateAptoModal(true);
                setFormError('');
                setAptoForm({ block: '', number: '' });
              }}
            >
              + Crear apartamento
            </button>
          )}
        </div>
        <select
          value={activeTenantId}
          onChange={(e) => handleTenantChange(e.target.value)}
          className={styles.tenantSelect}
        >
          {safeTenants.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        {feedback && <p className={styles.feedback}>{feedback}</p>}
      </div>

      {isLoadingAptos ? (
        <p className={styles.emptyState}>Cargando apartamentos...</p>
      ) : apartments && apartments.length > 0 ? (
        <div className={styles.apartmentsGrid}>
          {apartments.map((apto) => (
            <div key={apto.id} className={styles.apartmentCard} onClick={() => openApartmentModal(apto)}>
              <div className={styles.cardHeader}>
                <span className={styles.blockBadge}>{apto.block || 'Sin bloque'}</span>
                <span className={styles.unitNumber}>Apto {apto.number}</span>
              </div>
              <div className={styles.cardMeta}>
                <span>{apto.residents?.length ?? 0} residentes</span>
                <span>
                  {apto.parkingSpots?.flatMap((s) => s.vehicles ?? []).length ?? 0} vehículos
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.emptyState}>
          No hay apartamentos registrados en este conjunto. Usa &quot;Crear apartamento&quot; para empezar.
        </p>
      )}

      {showCreateAptoModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateAptoModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button type="button" className={styles.closeBtn} onClick={() => setShowCreateAptoModal(false)}>
              ✕
            </button>
            <h2 className={styles.modalTitle}>Nuevo apartamento</h2>
            <form onSubmit={handleCreateApartment} className={styles.form}>
              <label className={styles.label}>
                Bloque / Torre
                <input
                  type="text"
                  value={aptoForm.block}
                  onChange={(e) => setAptoForm((prev) => ({ ...prev, block: e.target.value }))}
                  className={styles.input}
                  placeholder="Ej: Torre A"
                />
              </label>
              <label className={styles.label}>
                Número de apartamento *
                <input
                  type="text"
                  required
                  value={aptoForm.number}
                  onChange={(e) => setAptoForm((prev) => ({ ...prev, number: e.target.value }))}
                  className={styles.input}
                  placeholder="Ej: 302"
                />
              </label>
              {formError && <p className={styles.errorMsg}>{formError}</p>}
              <button type="submit" className={styles.primaryBtn} disabled={isSubmitting}>
                {createAptoMutation.isPending ? 'Guardando...' : 'Registrar apartamento'}
              </button>
            </form>
          </div>
        </div>
      )}

      {selectedApto && (
        <div className={styles.modalOverlay} onClick={closeUnitModal}>
          <div className={styles.modalContentWide} onClick={(e) => e.stopPropagation()}>
            <button type="button" className={styles.closeBtn} onClick={closeUnitModal}>
              ✕
            </button>

            {modalView === 'unit' && !infoDetail && (
              <>
                <h2 className={styles.modalTitle}>
                  {selectedApto.block ? `${selectedApto.block} - ` : ''}Apto {selectedApto.number}
                </h2>
                <div className={styles.modalGrid}>
                  <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                      <h4>Residentes</h4>
                      <button
                        type="button"
                        className={styles.linkBtn}
                        onClick={() => {
                          setModalView('add-resident');
                          setFormError('');
                        }}
                      >
                        + Agregar
                      </button>
                    </div>
                    {selectedApto.residents && selectedApto.residents.length > 0 ? (
                      selectedApto.residents.map((r) => (
                        <div
                          key={r.id}
                          className={styles.clickableItem}
                          onClick={() => setInfoDetail({ type: 'resident', data: r as unknown as Record<string, unknown> })}
                        >
                          {r.fullName}
                        </div>
                      ))
                    ) : (
                      <p className={styles.emptyHint}>Sin residentes registrados</p>
                    )}
                  </div>
                  <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                      <h4>Vehículos</h4>
                      <button
                        type="button"
                        className={styles.linkBtn}
                        onClick={() => {
                          setModalView('add-vehicle');
                          setFormError('');
                          setVehicleForm((prev) => ({
                            ...prev,
                            parkingSpotId: selectedApto.parkingSpots?.[0]?.id ?? '',
                          }));
                        }}
                      >
                        + Agregar
                      </button>
                    </div>
                    {selectedApto.parkingSpots?.flatMap((s) => s.vehicles || []).length ? (
                      selectedApto.parkingSpots.flatMap((s) => s.vehicles || []).map((v) => (
                        <div
                          key={v.id}
                          className={styles.clickableBadge}
                          onClick={() => setInfoDetail({ type: 'vehicle', data: v as unknown as Record<string, unknown> })}
                        >
                          {v.plate}
                        </div>
                      ))
                    ) : (
                      <p className={styles.emptyHint}>Sin vehículos registrados</p>
                    )}
                  </div>
                </div>
              </>
            )}

            {modalView === 'add-resident' && (
              <div className={styles.formView}>
                <button type="button" className={styles.backBtn} onClick={() => setModalView('unit')}>
                  ← Volver a la unidad
                </button>
                <h3>Registrar residente</h3>
                <form onSubmit={handleCreateResident} className={styles.form}>
                  <label className={styles.label}>
                    Nombre completo *
                    <input
                      type="text"
                      required
                      value={residentForm.fullName}
                      onChange={(e) => setResidentForm((prev) => ({ ...prev, fullName: e.target.value }))}
                      className={styles.input}
                    />
                  </label>
                  <label className={styles.label}>
                    Documento *
                    <input
                      type="text"
                      required
                      value={residentForm.documentId}
                      onChange={(e) => setResidentForm((prev) => ({ ...prev, documentId: e.target.value }))}
                      className={styles.input}
                    />
                  </label>
                  <label className={styles.label}>
                    Correo *
                    <input
                      type="email"
                      required
                      value={residentForm.email}
                      onChange={(e) => setResidentForm((prev) => ({ ...prev, email: e.target.value }))}
                      className={styles.input}
                    />
                  </label>
                  <label className={styles.label}>
                    Teléfono
                    <input
                      type="text"
                      value={residentForm.phone}
                      onChange={(e) => setResidentForm((prev) => ({ ...prev, phone: e.target.value }))}
                      className={styles.input}
                    />
                  </label>
                  {formError && <p className={styles.errorMsg}>{formError}</p>}
                  <button type="submit" className={styles.primaryBtn} disabled={isSubmitting}>
                    {createResidentMutation.isPending ? 'Guardando...' : 'Registrar residente'}
                  </button>
                </form>
              </div>
            )}

            {modalView === 'add-vehicle' && (
              <div className={styles.formView}>
                <button type="button" className={styles.backBtn} onClick={() => setModalView('unit')}>
                  ← Volver a la unidad
                </button>
                <h3>Registrar vehículo</h3>
                <form onSubmit={handleCreateVehicle} className={styles.form}>
                  <label className={styles.label}>
                    Placa *
                    <input
                      type="text"
                      required
                      value={vehicleForm.plate}
                      onChange={(e) => setVehicleForm((prev) => ({ ...prev, plate: e.target.value.toUpperCase() }))}
                      className={styles.input}
                      placeholder="Ej: ABC123"
                    />
                  </label>
                  <label className={styles.label}>
                    Marca
                    <input
                      type="text"
                      value={vehicleForm.brand}
                      onChange={(e) => setVehicleForm((prev) => ({ ...prev, brand: e.target.value }))}
                      className={styles.input}
                    />
                  </label>
                  <label className={styles.label}>
                    Color
                    <input
                      type="text"
                      value={vehicleForm.color}
                      onChange={(e) => setVehicleForm((prev) => ({ ...prev, color: e.target.value }))}
                      className={styles.input}
                    />
                  </label>

                  {existingParkingSpots.length > 0 ? (
                    <label className={styles.label}>
                      Parqueadero asignado
                      <select
                        value={vehicleForm.parkingSpotId}
                        onChange={(e) =>
                          setVehicleForm((prev) => ({ ...prev, parkingSpotId: e.target.value, newParkingNumber: '' }))
                        }
                        className={styles.input}
                      >
                        <option value="">— Crear nuevo parqueadero —</option>
                        {existingParkingSpots.map((spot) => (
                          <option key={spot.id} value={spot.id}>
                            {spot.number}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}

                  {!vehicleForm.parkingSpotId && (
                    <label className={styles.label}>
                      Número de parqueadero *
                      <input
                        type="text"
                        value={vehicleForm.newParkingNumber}
                        onChange={(e) => setVehicleForm((prev) => ({ ...prev, newParkingNumber: e.target.value }))}
                        className={styles.input}
                        placeholder="Ej: P-102"
                      />
                    </label>
                  )}

                  {formError && <p className={styles.errorMsg}>{formError}</p>}
                  <button type="submit" className={styles.primaryBtn} disabled={isSubmitting}>
                    {createVehicleMutation.isPending ? 'Guardando...' : 'Registrar vehículo'}
                  </button>
                </form>
              </div>
            )}

            {infoDetail && (
              <div className={styles.detailView}>
                <button type="button" className={styles.backBtn} onClick={() => setInfoDetail(null)}>
                  ← Volver a la unidad
                </button>
                <h3>{infoDetail.type === 'resident' ? 'Información del residente' : 'Detalle del vehículo'}</h3>
                <div className={styles.detailBody}>
                  {Object.entries(infoDetail.data)
                    .filter(([key]) => !['apartment'].includes(key))
                    .map(([key, val]) => (
                      <p key={key}>
                        <strong>{formatDetailLabel(infoDetail.type, key)}:</strong>{' '}
                        {val != null ? String(val) : '—'}
                      </p>
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
