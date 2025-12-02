import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createResident, fetchResidents } from '../api/residents';
import type { CreateResidentInput, Resident } from '../types';

const initialForm: CreateResidentInput = {
  fullName: '',
  documentId: '',
  email: '',
  unitNumber: '',
  phone: '',
  vehiclePlate: '',
};

const ResidentsPage = () => {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['residents'],
    queryFn: fetchResidents,
  });

  const [form, setForm] = useState(initialForm);
  const [feedback, setFeedback] = useState('');

  const createMutation = useMutation({
    mutationFn: createResident,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      setForm(initialForm);
      setFeedback('Residente creado correctamente.');
    },
    onError: () => {
      setFeedback('No se pudo crear el residente.');
    },
  });

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback('');
    createMutation.mutate(form);
  };

  return (
    <div className="grid two-columns">
      <section className="card">
        <h2>Residentes</h2>
        {isLoading && <p>Cargando residentes...</p>}
        {isError && <p className="form-error">No se pudieron cargar los residentes.</p>}
        {!isLoading && data?.length === 0 && <p>No hay residentes registrados.</p>}
        {!isLoading && data && data.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Documento</th>
                <th>Apartamento</th>
                <th>Teléfono</th>
                <th>Vehículo</th>
              </tr>
            </thead>
            <tbody>
              {data.map((resident: Resident) => (
                <tr key={resident.id}>
                  <td>
                    <strong>{resident.fullName}</strong>
                    <br />
                    <small>{resident.email}</small>
                  </td>
                  <td>{resident.documentId}</td>
                  <td>{resident.unitNumber}</td>
                  <td>{resident.phone ?? 'N/D'}</td>
                  <td>{resident.vehiclePlate ?? 'N/D'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <h2>Nuevo residente</h2>
        <form onSubmit={handleSubmit} className="form-grid">
          <label>
            Nombre completo
            <input
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Documento
            <input
              name="documentId"
              value={form.documentId}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Correo
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Apartamento
            <input
              name="unitNumber"
              value={form.unitNumber}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Teléfono
            <input
              name="phone"
              value={form.phone ?? ''}
              onChange={handleChange}
              placeholder="Opcional"
            />
          </label>

          <label>
            Placa
            <input
              name="vehiclePlate"
              value={form.vehiclePlate ?? ''}
              onChange={handleChange}
              placeholder="Opcional"
            />
          </label>

          {feedback && <p className="form-feedback">{feedback}</p>}

          <button type="submit" className="btn" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Guardando...' : 'Crear residente'}
          </button>
        </form>
      </section>
    </div>
  );
};

export default ResidentsPage;

