import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Database, LogOut, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getInitials, getAvatarColor } from '../types/auth';
import AssignmentModal from '../components/dashboard/AssignmentModal';
import RepositoryUploadModal from '../components/dashboard/RepositoryUploadModal';
import DashboardHeaderStats from '../components/dashboard/DashboardHeaderStats';
import ActiveAssignmentCard from '../components/dashboard/ActiveAssignmentCard';
import RepositoriesSection from '../components/dashboard/RepositoriesSection';
import ArchivedAssignmentsSection from '../components/dashboard/ArchivedAssignmentsSection';
import { useDashboardData } from '../hooks/useDashboardData';
import ConfirmModal from '../components/ui/ConfirmModal';
import { useToast } from '../components/ui/Toast';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import type {
  Assignment,
  AssignmentFilter,
  AssignmentFormState,
  DashboardStats,
} from '../types/dashboard';

const DEFAULT_ASSIGNMENT_FORM: AssignmentFormState = {
  title: '',
  course_code: '',
  language: 'JAVA',
  deadline: '',
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user, logout } = useAuth();

  const {
    assignments,
    repos,
    loading,
    fetchAssignments,
    saveAssignment,
    archiveAssignment,
    uploadRepo,
    deleteRepo,
    extractErrorMessage,
  } = useDashboardData(navigate);

  const [confirmArchive, setConfirmArchive] = useState<{ id: string } | null>(null);
  const [confirmRepoDelete, setConfirmRepoDelete] = useState<{ id: string; name: string } | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [newAssignment, setNewAssignment] = useState<AssignmentFormState>(DEFAULT_ASSIGNMENT_FORM);
  const [boilerplateFile, setBoilerplateFile] = useState<File | null>(null);
  const [createError, setCreateError] = useState('');

  const [isRepoModalOpen, setIsRepoModalOpen] = useState(false);
  const [repoUploadName, setRepoUploadName] = useState('');
  const [repoUploadLanguage, setRepoUploadLanguage] = useState<'JAVA' | 'CPP' | 'C'>('JAVA');
  const [repoUploadFile, setRepoUploadFile] = useState<File | null>(null);
  const [repoImportToActive, setRepoImportToActive] = useState(true);
  const [repoUploading, setRepoUploading] = useState(false);
  const [repoUploadError, setRepoUploadError] = useState('');

  const [assignmentQuery, setAssignmentQuery] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>('All');

  const formatDeadline = (deadline: string) => {
    const dt = new Date(deadline);
    if (Number.isNaN(dt.getTime())) {
      return 'Invalid deadline';
    }

    return new Intl.DateTimeFormat([], {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/Toronto',
      timeZoneName: 'short',
    }).format(dt);
  };

  const handleLogout = () => {
    logout();
    navigate('/instructor/login');
  };

  const openCreateModal = () => {
    setEditingAssignment(null);
    setNewAssignment(DEFAULT_ASSIGNMENT_FORM);
    setBoilerplateFile(null);
    setCreateError('');
    setIsModalOpen(true);
  };

  const handleArchive = (assignmentId: string) => {
    setConfirmArchive({ id: assignmentId });
  };

  const doArchive = async () => {
    if (!confirmArchive) return;
    const { id } = confirmArchive;
    setConfirmArchive(null);
    try {
      await archiveAssignment(id);
    } catch (error) {
      showToast(extractErrorMessage(error, 'Failed to archive assignment.'), 'error');
    }
  };

  const openEditModal = (assignment: Assignment) => {
    let deadlineLocal = '';

    if (assignment.deadline) {
      const dt = new Date(assignment.deadline);
      const pad = (value: number) => value.toString().padStart(2, '0');
      deadlineLocal = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    }

    setEditingAssignment(assignment);
    setNewAssignment({
      title: assignment.title || '',
      course_code: assignment.course || '',
      language: assignment.language || 'JAVA',
      deadline: deadlineLocal,
    });
    setBoilerplateFile(null);
    setCreateError('');
    setIsModalOpen(true);
  };

  const handleCreateAssignment = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setCreateError('');
      await saveAssignment(newAssignment, boilerplateFile, editingAssignment?.id);

      setIsModalOpen(false);
      setEditingAssignment(null);
      setNewAssignment(DEFAULT_ASSIGNMENT_FORM);
      setBoilerplateFile(null);
    } catch (error) {
      setCreateError(
        extractErrorMessage(
          error,
          editingAssignment ? 'Failed to update assignment.' : 'Failed to create assignment.'
        )
      );
    }
  };

  const handleRepoUpload = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!repoUploadFile) {
      setRepoUploadError('Please select a zip file');
      return;
    }

    try {
      setRepoUploading(true);
      setRepoUploadError('');
      const result = await uploadRepo({
        name: repoUploadName,
        language: repoUploadLanguage,
        file: repoUploadFile,
        import_to_assignment: repoImportToActive,
      });

      if (repoImportToActive) {
        await fetchAssignments();
        if (result?.imported_to_assignment_title) {
          showToast(`Created active assignment: ${result.imported_to_assignment_title}`, 'success');
        }
      }

      setIsRepoModalOpen(false);
      setRepoUploadName('');
      setRepoUploadFile(null);
      setRepoImportToActive(false);
    } catch (error) {
      setRepoUploadError(extractErrorMessage(error, 'Failed to upload repository'));
    } finally {
      setRepoUploading(false);
    }
  };

  const handleRepoDelete = (repoId: string, repoName: string) => {
    setConfirmRepoDelete({ id: repoId, name: repoName });
  };

  const doRepoDelete = async () => {
    if (!confirmRepoDelete) return;
    const { id } = confirmRepoDelete;
    setConfirmRepoDelete(null);
    try {
      await deleteRepo(id);
    } catch (error) {
      showToast(extractErrorMessage(error, 'Failed to delete repository'), 'error');
    }
  };

  const activeAssignments = useMemo(
    () => assignments.filter((assignment) => assignment.status !== 'Archived'),
    [assignments]
  );

  const filteredActiveAssignments = useMemo(() => {
    return activeAssignments.filter((assignment) => {
      const normalizedQuery = assignmentQuery.trim().toLowerCase();
      const matchesQuery =
        !normalizedQuery ||
        assignment.title?.toLowerCase().includes(normalizedQuery) ||
        assignment.course?.toLowerCase().includes(normalizedQuery) ||
        assignment.access_key?.toLowerCase().includes(normalizedQuery);

      const matchesFilter =
        assignmentFilter === 'All' ||
        (assignmentFilter === 'Open' && assignment.status === 'Open') ||
        (assignmentFilter === 'Closed' && assignment.status === 'Closed');

      return matchesQuery && matchesFilter;
    });
  }, [activeAssignments, assignmentFilter, assignmentQuery]);

  const dashboardStats: DashboardStats = useMemo(() => {
    const totalSubmissions = activeAssignments.reduce(
      (sum, assignment) => sum + Number(assignment.count || 0),
      0
    );
    const totalRiskFlags = activeAssignments.reduce(
      (sum, assignment) => sum + Number(assignment.flags || 0),
      0
    );

    return {
      activeCount: activeAssignments.length,
      totalSubmissions,
      totalRiskFlags,
      repoCount: repos.length,
    };
  }, [activeAssignments, repos.length]);

  const archivedAssignments = useMemo(
    () => assignments.filter((assignment) => assignment.status === 'Archived'),
    [assignments]
  );

  return (
    <div className="main-content" style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <ConfirmModal
        open={!!confirmArchive}
        title="Archive Assignment"
        message="This action is IRREVERSIBLE. All student identities (names and IDs) will be permanently deleted. Code files will be preserved for future repository comparisons."
        confirmLabel="Archive"
        danger
        onConfirm={doArchive}
        onCancel={() => setConfirmArchive(null)}
      />
      <ConfirmModal
        open={!!confirmRepoDelete}
        title={`Delete "${confirmRepoDelete?.name ?? ''}"`}
        message="This will permanently remove all stored files."
        confirmLabel="Delete"
        danger
        onConfirm={doRepoDelete}
        onCancel={() => setConfirmRepoDelete(null)}
      />
      <AssignmentModal
        isOpen={isModalOpen}
        editingAssignment={editingAssignment}
        formState={newAssignment}
        boilerplateFile={boilerplateFile}
        createError={createError}
        onFormChange={setNewAssignment}
        onBoilerplateChange={setBoilerplateFile}
        onClose={() => {
          setIsModalOpen(false);
          setEditingAssignment(null);
        }}
        onSubmit={handleCreateAssignment}
      />

      <RepositoryUploadModal
        isOpen={isRepoModalOpen}
        uploadName={repoUploadName}
        uploadLanguage={repoUploadLanguage}
        uploadFile={repoUploadFile}
        uploadError={repoUploadError}
        uploading={repoUploading}
        importToActive={repoImportToActive}
        onNameChange={setRepoUploadName}
        onLanguageChange={setRepoUploadLanguage}
        onFileChange={setRepoUploadFile}
        onImportToActiveChange={setRepoImportToActive}
        onSubmit={handleRepoUpload}
        onClose={() => {
          setIsRepoModalOpen(false);
          setRepoUploadError('');
          setRepoImportToActive(false);
        }}
      />

      <nav
        style={{
          padding: '0.65rem 1rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem 0.8rem',
          background: 'var(--bg-surface)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
          <ShieldCheck size={18} />
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Instructor View</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Personalized greeting */}
          {user && (
            <button
              onClick={() => navigate('/instructor/profile')}
              className="btn btn-outline"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: getAvatarColor(user.email),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.55rem',
                  fontWeight: 700,
                  color: 'white',
                  flexShrink: 0,
                }}
              >
                {getInitials(user)}
              </div>
              <span>
                Hello, <strong>{user.first_name ?? user.username}</strong>
              </span>
              <User size={13} />
            </button>
          )}
          <button
            onClick={() => navigate('/instructor/repositories')}
            className="btn btn-outline"
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
          >
            <Database size={14} /> Repositories
          </button>
          <button
            onClick={handleLogout}
            className="btn btn-outline"
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </nav>

      <main style={{ padding: '1rem 0.75rem 2rem', maxWidth: '1200px', margin: '0 auto', width: '100%', flex: 1 }}>
        <DashboardHeaderStats
          stats={dashboardStats}
          assignmentQuery={assignmentQuery}
          assignmentFilter={assignmentFilter}
          onAssignmentQueryChange={setAssignmentQuery}
          onAssignmentFilterChange={setAssignmentFilter}
          onClearFilters={() => {
            setAssignmentQuery('');
            setAssignmentFilter('All');
          }}
          onOpenCreateModal={openCreateModal}
          onOpenRepoUploadModal={() => {
            setRepoUploadError('');
            setRepoImportToActive(false);
            setIsRepoModalOpen(true);
          }}
        />

        {loading ? (
          <LoadingSpinner label="Loading assignments..." />
        ) : assignments.length === 0 ? (
          <div className="glass-card" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <BookOpen size={48} style={{ opacity: 0.3, margin: '0 auto 1rem auto' }} />
            <h3>No Assignments Yet</h3>
            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
              Click "New Assignment" to start accepting student code submissions.
            </p>
          </div>
        ) : (
          <>
            {activeAssignments.length > 0 &&
              (filteredActiveAssignments.length === 0 ? (
                <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <h3 style={{ fontSize: '1.05rem', marginBottom: '0.35rem' }}>
                    No assignments match your filters
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-tertiary)' }}>
                    Try clearing search or switching the status filter.
                  </p>
                </div>
              ) : (
                <>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      margin: '0.25rem 0 0.75rem',
                    }}
                  >
                    <h2
                      style={{
                        fontSize: '1.05rem',
                        margin: 0,
                        color: 'var(--text-secondary)',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                      }}
                    >
                      Active Assignments
                    <span
                      style={{
                        fontSize: '0.75rem',
                        background: 'var(--bg-surface-highest)',
                        color: 'var(--text-secondary)',
                        borderRadius: 'var(--radius-full)',
                        padding: '0.15rem 0.55rem',
                        fontWeight: 700,
                      }}
                    >
                      {filteredActiveAssignments.length}
                    </span>
                    </h2>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                    {filteredActiveAssignments.map((assignment, index) => (
                      <ActiveAssignmentCard
                        key={assignment.id}
                        assignment={assignment}
                        index={index}
                        formatDeadline={formatDeadline}
                        openEditModal={openEditModal}
                        onArchive={handleArchive}
                      />
                    ))}
                  </div>
                </>
              ))}

            <RepositoriesSection
                repos={repos}
                onUpload={() => {
                  setRepoUploadError('');
                  setIsRepoModalOpen(true);
                }}
                onDelete={handleRepoDelete}
            />

            {archivedAssignments.length > 0 && (
              <ArchivedAssignmentsSection
                assignments={archivedAssignments}
                formatDeadline={formatDeadline}
                navigate={navigate}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
