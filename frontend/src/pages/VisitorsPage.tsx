import { useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  checkInVisitor,
  checkOutVisitor,
  createVisitor,
  denyVisitor,
  fetchVisitors,
} from '../api/visitors';
import { fetchResidents } from '../api/residents';
import type {
  CreateVisitorInput,
  Resident,
  Visitor,
  VisitorStatus,
} from '../types';

const visitorFormInitial: CreateVisitorInput = {
  fullName: '',
  documentType: 'CC',
  documentId: '',
  residentId: undefined,
  phone: '',
  vehiclePlate: '',
  purpose: '',
  notes: '',
};

const statusLabels: Record<VisitorStatus, string> = {
  PENDING: 'Pendiente',
  IN: 'Dentro',
  OUT: 'Salida registrada',
  DENIED: 'Rechazada',
};

const VisitorsPage = () => {
  const [form, setForm] = useState(visitorFormInitial);
  const [statusFilter, setStatusFilter] = useState<VisitorStatus | 'ALL'>(
    'PENDING',
  );
  const queryClient = useQueryClient();

  const { data: residents } = useQuery({
    queryKey: ['residents'],
    queryFn: fetchResidents,
  });

  const {
    data: visitors,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['visitors', statusFilter],
    queryFn: () =>
      fetchVisitors(statusFilter === 'ALL' ? undefined : statusFilter),
  });

  const createMutation = useMutation({
    mutationFn: createVisitor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
      setForm(visitorFormInitial);
    },
  });

  const checkInMutation = useMutation({
    mutationFn: checkInVisitor,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['visitors'] }),
  });

  const checkOutMutation = useMutation({
    mutationFn: checkOutVisitor,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['visitors'] }),
  });

  const denyMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      await denyVisitor(id, { notes });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['visitors'] }),
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createMutation.mutate({
      ...form,
      residentId: form.residentId || undefined,
      phone: form.phone || undefined,
      vehiclePlate: form.vehiclePlate || undefined,
      purpose: form.purpose || undefined,
      notes: form.notes || undefined,
    });
  };

  const handleInputChange = (
    event: ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const residentOptions = useMemo(() => residents ?? [], [residents]);

  const formatDate = (value?: string) => {
    if (!value) return 'N/D';
    return new Date(value).toLocaleString();
  };

  return (
    <div className="grid two-columns">
      <section className="card">
        <div className="card-header">
          <h2>Visitantes</h2>
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as VisitorStatus | 'ALL')
            }
          >
            <option value="ALL">Todos</option>
            <option value="PENDING">Pendientes</option>
            <option value="IN">Dentro</option>
            <option value="OUT">Con salida</option>
            <option value="DENIED">Rechazadas</option>
          </select>
        </div>

        {isLoading && <p>Cargando visitas...</p>}
        {isError && <p className="form-error">No se pudieron cargar las visitas.</p>}

        {!isLoading && visitors && visitors.length === 0 && (
          <p>No hay visitas con este estado.</p>
        )}

        {!isLoading && visitors && visitors.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Visitante</th>
                <th>Documento</th>
                <th>Residente</th>
                <th>Estado</th>
                <th>Ingreso</th>
                <th>Salida</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visitors.map((visitor: Visitor) => (
                <tr key={visitor.id}>
                  <td>
                    <strong>{visitor.fullName}</strong>
                    <br />
                    <small>{visitor.phone ?? 'Sin teléfono'}</small>
                  </td>
                  <td>
                    {visitor.documentType} - {visitor.documentId}
                    <br />
                    <small>{visitor.vehiclePlate ?? 'Sin vehículo'}</small>
                  </td>
                  <td>{visitor.resident?.fullName ?? 'Sin anfitrión'}</td>
                  <td>
                    <span className={`badge badge--${visitor.status.toLowerCase()}`}>
                      {statusLabels[visitor.status]}
                    </span>
                  </td>
                  <td>{formatDate(visitor.checkInAt)}</td>
                  <td>{formatDate(visitor.checkOutAt)}</td>
                  <td className="actions">
                    {visitor.status === 'PENDING' && (
                      <>
                        <button
                          type="button"
                          className="btn btn--small"
                          onClick={() => checkInMutation.mutate(visitor.id)}
                          disabled={checkInMutation.isPending}
                        >
                          Registrar entrada
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost btn--small"
                          onClick={() => {
                            const notes = window.prompt('Motivo del rechazo (opcional)');
                            denyMutation.mutate({ id: visitor.id, notes: notes ?? undefined });
                          }}
                          disabled={denyMutation.isPending}
                        >
                          Rechazar
                        </button>
                      </>
                    )}

                    {visitor.status === 'IN' && (
                      <button
                        type="button"
                        className="btn btn--small"
                        onClick={() => checkOutMutation.mutate(visitor.id)}
                        disabled={checkOutMutation.isPending}
                      >
                        Registrar salida
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <h2>Nueva visita</h2>
        <form onSubmit={handleSubmit} className="form-grid">
          <label>
            Nombre completo
            <input
              name="fullName"
              value={form.fullName}
              onChange={handleInputChange}
              required
            />
          </label>

          <label>
            Tipo de documento
            <input
              name="documentType"
              value={form.documentType}
              onChange={handleInputChange}
              required
            />
          </label>

          <label>
            Número de documento
            <input
              name="documentId"
              value={form.documentId}
              onChange={handleInputChange}
              required
            />
          </label>

          <label>
            Residente a visitar
            <select
              name="residentId"
              value={form.residentId ?? ''}
              onChange={handleInputChange}
            >
              <option value="">Sin anfitrión</option>
              {residentOptions.map((resident: Resident) => (
                <option key={resident.id} value={resident.id}>
                  {resident.fullName} - {resident.unitNumber}
                </option>
              ))}
            </select>
          </label>

          <label>
            Teléfono
            <input
              name="phone"
              value={form.phone ?? ''}
              onChange={handleInputChange}
              placeholder="Opcional"
            />
          </label>

          <label>
            Placa
            <input
              name="vehiclePlate"
              value={form.vehiclePlate ?? ''}
              onChange={handleInputChange}
              placeholder="Opcional"
            />
          </label>

          <label>
            Motivo
            <input
              name="purpose"
              value={form.purpose ?? ''}
              onChange={handleInputChange}
              placeholder="Opcional"
            />
          </label>

          <label>
            Notas
            <textarea
              name="notes"
              value={form.notes ?? ''}
              onChange={handleInputChange}
              rows={3}
            />
          </label>

          <button type="submit" className="btn" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Registrando...' : 'Crear visita'}
          </button>
        </form>
      </section>
    </div>
  );
};

export default VisitorsPage;

