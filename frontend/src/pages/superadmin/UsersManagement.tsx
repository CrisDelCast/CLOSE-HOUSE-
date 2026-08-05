import { useState, useEffect, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTenants } from '../../api/tenants';
import { fetchUsersByTenant, createUser, updateUser, deleteUser } from '../../api/users';
import { useAuthContext } from '../../context/AuthContext';
import type { Tenant, User, UserRole, CreateUserInput, UpdateUserInput } from '../../types';
import styles from './UsersManagement.module.css';

type FormMode = 'create' | 'edit';

const MANAGED_ROLES: Exclude<UserRole, 'SUPERADMIN'>[] = ['ADMIN', 'PORTERO'];

const ROLE_LABELS: Record<Exclude<UserRole, 'SUPERADMIN'>, string> = {
  ADMIN: 'Administrador',
  PORTERO: 'Portero',
};

const INITIAL_FORM = {
  fullName: '',
  email: '',
  password: '',
  role: 'PORTERO' as Exclude<UserRole, 'SUPERADMIN'>,
  tenantId: '',
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

export default function UsersManagement() {
  const queryClient = useQueryClient();
  const { user: currentUser, switchTenant } = useAuthContext();

  const [activeTenantId, setActiveTenantId] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formError, setFormError] = useState('');
  const [feedback, setFeedback] = useState('');

  const { data: tenants } = useQuery({ queryKey: ['tenants'], queryFn: fetchTenants });
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

  const { data: users = [], isLoading, isError } = useQuery({
    queryKey: ['users', activeTenantId],
    queryFn: () => fetchUsersByTenant(activeTenantId),
    enabled: !!activeTenantId,
  });

  const invalidateUsers = () => {
    queryClient.invalidateQueries({ queryKey: ['users', activeTenantId] });
    if (form.tenantId && form.tenantId !== activeTenantId) {
      queryClient.invalidateQueries({ queryKey: ['users', form.tenantId] });
    }
  };

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      invalidateUsers();
      closeModal();
      setFeedback('Usuario creado correctamente.');
    },
    onError: (error) => setFormError(extractErrorMessage(error)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserInput }) => updateUser(id, data),
    onSuccess: () => {
      invalidateUsers();
      closeModal();
      setFeedback('Usuario actualizado correctamente.');
    },
    onError: (error) => setFormError(extractErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      invalidateUsers();
      setFeedback('Usuario eliminado correctamente.');
    },
    onError: (error) => setFeedback(extractErrorMessage(error)),
  });

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setForm({ ...INITIAL_FORM, tenantId: activeTenantId });
    setFormError('');
  };

  const openCreateModal = () => {
    setFormMode('create');
    setEditingUser(null);
    setForm({ ...INITIAL_FORM, tenantId: activeTenantId });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setFormMode('edit');
    setEditingUser(user);
    setForm({
      fullName: user.fullName,
      email: user.email,
      password: '',
      role: user.role === 'SUPERADMIN' ? 'ADMIN' : user.role,
      tenantId: user.tenantId,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleTenantChange = (tenantId: string) => {
    setActiveTenantId(tenantId);
    setFeedback('');
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!form.fullName.trim() || !form.email.trim()) {
      setFormError('Nombre y correo son obligatorios.');
      return;
    }

    if (formMode === 'create') {
      if (!form.password || form.password.length < 6) {
        setFormError('La contraseña debe tener al menos 6 caracteres.');
        return;
      }

      const payload: CreateUserInput = {
        tenantId: form.tenantId || activeTenantId,
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      };
      createMutation.mutate(payload);
      return;
    }

    if (!editingUser) return;

    const payload: UpdateUserInput = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      role: form.role,
      tenantId: form.tenantId,
    };

    if (form.password.trim()) {
      if (form.password.length < 6) {
        setFormError('La contraseña debe tener al menos 6 caracteres.');
        return;
      }
      payload.password = form.password;
    }

    updateMutation.mutate({ id: editingUser.id, data: payload });
  };

  const handleDelete = (user: User) => {
    const confirmed = window.confirm(
      `¿Eliminar a "${user.fullName}" (${user.email})? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;
    deleteMutation.mutate(user.id);
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const activeTenantName = safeTenants.find((t) => t.id === activeTenantId)?.name ?? '';

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.headerRow}>
        <h2>Gestión de Usuarios</h2>
        <button type="button" className={styles.primaryBtn} onClick={openCreateModal} disabled={!activeTenantId}>
          + Crear usuario
        </button>
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
      {isError && <p className={styles.errorBanner}>No se pudieron cargar los usuarios del conjunto.</p>}

      <div className={styles.tableWrapper}>
        {isLoading ? (
          <p className={styles.emptyState}>Cargando usuarios...</p>
        ) : users.length === 0 ? (
          <p className={styles.emptyState}>
            No hay usuarios registrados en {activeTenantName || 'este conjunto'}. Crea el primero con el botón superior.
          </p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.fullName}</td>
                  <td>{user.email}</td>
                  <td>
                    <span
                      className={`${styles.roleBadge} ${
                        user.role === 'ADMIN' ? styles.roleAdmin : styles.rolePortero
                      }`}
                    >
                      {ROLE_LABELS[user.role as Exclude<UserRole, 'SUPERADMIN'>] ?? user.role}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button type="button" className={styles.secondaryBtn} onClick={() => openEditModal(user)}>
                        Editar
                      </button>
                      <button
                        type="button"
                        className={styles.dangerBtn}
                        onClick={() => handleDelete(user)}
                        disabled={user.id === currentUser?.id || deleteMutation.isPending}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button type="button" className={styles.closeBtn} onClick={closeModal}>
              ✕
            </button>
            <h3 className={styles.modalTitle}>
              {formMode === 'create' ? 'Nuevo usuario' : 'Editar usuario'}
            </h3>

            <form onSubmit={handleSubmit} className={styles.form}>
              <label className={styles.label}>
                Conjunto asignado *
                <select
                  required
                  value={form.tenantId || activeTenantId}
                  onChange={(e) => setForm((prev) => ({ ...prev, tenantId: e.target.value }))}
                  className={styles.input}
                >
                  {safeTenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.label}>
                Nombre completo *
                <input
                  type="text"
                  required
                  value={form.fullName}
                  onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                  className={styles.input}
                />
              </label>

              <label className={styles.label}>
                Correo *
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  className={styles.input}
                />
              </label>

              <label className={styles.label}>
                {formMode === 'create' ? 'Contraseña *' : 'Nueva contraseña'}
                <input
                  type="password"
                  required={formMode === 'create'}
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  className={styles.input}
                  placeholder={formMode === 'edit' ? 'Dejar vacío para no cambiar' : 'Mínimo 6 caracteres'}
                />
              </label>

              <label className={styles.label}>
                Rol *
                <select
                  required
                  value={form.role}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      role: e.target.value as Exclude<UserRole, 'SUPERADMIN'>,
                    }))
                  }
                  className={styles.input}
                >
                  {MANAGED_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
              </label>

              {formError && <p className={styles.errorMsg}>{formError}</p>}

              <button type="submit" className={styles.primaryBtn} disabled={isSubmitting}>
                {isSubmitting
                  ? 'Guardando...'
                  : formMode === 'create'
                    ? 'Registrar usuario'
                    : 'Guardar cambios'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
