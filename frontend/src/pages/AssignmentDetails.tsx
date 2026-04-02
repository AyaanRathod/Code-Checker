import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { generatePDFReport } from '../lib/generatePDFReport';
import { motion } from 'framer-motion';
import SubmissionsTab from '../components/assignment-details/SubmissionsTab';
import AnalyticsOverviewTab from '../components/assignment-details/AnalyticsOverviewTab';
import AssignmentDetailsHeader from '../components/assignment-details/AssignmentDetailsHeader';
import AssignmentDetailsSidebar from '../components/assignment-details/AssignmentDetailsSidebar';
import PairwiseResultsTab from '../components/assignment-details/PairwiseResultsTab';
import RepositorySelectionModal from '../components/assignment-details/RepositorySelectionModal';
import SimilarityMatrixTab from '../components/assignment-details/SimilarityMatrixTab';
import CollusionClusterTab from '../components/assignment-details/CollusionClusterTab';
import { useAssignmentDetailsData } from '../hooks/useAssignmentDetailsData';
import type { AssignmentDetailsLocationState, TabView } from '../components/assignment-details/types';

const TAB_QUERY_KEY = 'tab';
const TAB_STORAGE_PREFIX = 'assignmentDetailsActiveTab:';

const isValidTab = (value: string | null): value is TabView => {
  return value === 'submissions' || value === 'overview' || value === 'results' || value === 'clusters' || value === 'heatmap';
};

const AssignmentDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const skipUrlSyncRef = React.useRef(false);
  const [activeTab, setActiveTab] = useState<TabView>(() => {
    const queryTab = searchParams.get(TAB_QUERY_KEY);
    if (isValidTab(queryTab)) return queryTab;

    const stateTab = (location.state as AssignmentDetailsLocationState | null)?.initialTab;
    if (stateTab && isValidTab(stateTab)) return stateTab;

    if (id) {
      const storedTab = localStorage.getItem(`${TAB_STORAGE_PREFIX}${id}`);
      if (isValidTab(storedTab)) return storedTab;
    }

    return 'submissions';
  });

  useEffect(() => {
    const queryTab = new URLSearchParams(location.search).get(TAB_QUERY_KEY);
    if (skipUrlSyncRef.current) {
      skipUrlSyncRef.current = false;
      return;
    }
    if (isValidTab(queryTab) && queryTab !== activeTab) {
      setActiveTab(queryTab);
    }
  }, [location.search, activeTab]);

  useEffect(() => {
    if (!id) return;
    localStorage.setItem(`${TAB_STORAGE_PREFIX}${id}`, activeTab);
  }, [id, activeTab]);

  const handleTabChange = (tab: TabView) => {
    skipUrlSyncRef.current = true;
    setActiveTab(tab);
    const next = new URLSearchParams(location.search);
    next.set(TAB_QUERY_KEY, tab);
    setSearchParams(next, { replace: true });
  };

  const {
    assignment,
    comparisons,
    submissions,
    repositories,
    loading,
    triggering,
    downloading,
    selectedSimilarityRange,
    similaritySortOrder,
    showAnalysisMenu,
    showRepoModal,
    selectedRepoIds,
    isMobileLayout,
    isSidebarCollapsed,
    metrics,
    filteredAndSortedComparisons,
    formatBytes,
    setSelectedSimilarityRange,
    setSimilaritySortOrder,
    setShowAnalysisMenu,
    setShowRepoModal,
    setSelectedRepoIds,
    setIsSidebarCollapsed,
    runAnalysis,
    downloadSubmissions,
  } = useAssignmentDetailsData({
    assignmentId: id,
    navigate,
  });

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading assignment details...</div>;
  if (!assignment) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>Assignment not found.</div>;

  return (
    <div className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>

      <RepositorySelectionModal
        isOpen={showRepoModal}
        repositories={repositories}
        selectedRepoIds={selectedRepoIds}
        onClose={() => setShowRepoModal(false)}
        onToggleRepo={(repoId) => {
          setSelectedRepoIds((prev) => (prev.includes(repoId) ? prev.filter((item) => item !== repoId) : [...prev, repoId]));
        }}
        onRunAnalysis={() => runAnalysis(selectedRepoIds)}
      />

      <AssignmentDetailsHeader
        assignment={assignment}
        comparisonsCount={comparisons.length}
        repositoriesCount={repositories.length}
        triggering={triggering}
        downloading={downloading}
        isMobileLayout={isMobileLayout}
        showAnalysisMenu={showAnalysisMenu}
        onBack={() => navigate('/instructor/dashboard')}
        onDownloadSubmissions={downloadSubmissions}
        onDownloadPDF={() => generatePDFReport(
          assignment,
          submissions,
          comparisons,
          metrics,
          [user?.title, user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || 'Instructor',
        )}
        onRunAnalysis={() => runAnalysis()}
        onToggleAnalysisMenu={() => setShowAnalysisMenu((prev) => !prev)}
        onCloseAnalysisMenu={() => setShowAnalysisMenu(false)}
        onOpenRepoModal={() => {
          setShowAnalysisMenu(false);
          setSelectedRepoIds([]);
          setShowRepoModal(true);
        }}
      />

      {/* Main Layout Area */}
      <div style={{ display: 'flex', flexDirection: isMobileLayout ? 'column' : 'row', flex: 1, overflow: 'hidden' }}>

        <AssignmentDetailsSidebar
          activeTab={activeTab}
          submissionsCount={submissions.length}
          assignmentStatus={assignment.status}
          isMobileLayout={isMobileLayout}
          isSidebarCollapsed={isSidebarCollapsed}
          onTabChange={handleTabChange}
          onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
        />

        {/* Right Content Area */}
        <div style={{ flex: 1, padding: isMobileLayout ? '0.85rem' : '1.5rem 2rem', overflowY: 'auto' }}>

            <TabPanel activeTab={activeTab} target="submissions">
              <SubmissionsTab submissions={submissions} formatBytes={formatBytes} isMobileLayout={isMobileLayout} />
            </TabPanel>

            <TabPanel activeTab={activeTab} target="overview">
              <AnalyticsOverviewTab metrics={metrics} isMobileLayout={isMobileLayout} />
            </TabPanel>

            <TabPanel activeTab={activeTab} target="results">
              <PairwiseResultsTab
                isMobileLayout={isMobileLayout}
                comparisons={filteredAndSortedComparisons}
                selectedSimilarityRange={selectedSimilarityRange}
                similaritySortOrder={similaritySortOrder}
                onSimilarityRangeChange={setSelectedSimilarityRange}
                onToggleSimilaritySort={() => setSimilaritySortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
              />
            </TabPanel>

            <TabPanel activeTab={activeTab} target="clusters">
              <CollusionClusterTab
                comparisons={comparisons}
                onInspectComparison={(comparisonId) => navigate(`/instructor/compare/${comparisonId}`)}
              />
            </TabPanel>

            <TabPanel activeTab={activeTab} target="heatmap">
              <SimilarityMatrixTab
                comparisons={comparisons}
                onInspectComparison={(comparisonId) => navigate(`/instructor/compare/${comparisonId}`)}
              />
            </TabPanel>

        </div>
      </div>
      <style>{`
        .table-row-hover:hover {
          background-color: var(--bg-surface-raised);
        }
        .heatmap-cell {
          position: relative;
        }
        .heatmap-cell:hover {
          transform: scale(1.2);
          box-shadow: 0 4px 12px rgba(0,0,0,0.18);
          z-index: 10;
          filter: brightness(1.08);
        }
        .sidebar-tab {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.7rem 0.85rem;
          background: transparent;
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          font-weight: 500;
          font-size: 0.88rem;
          transition: all var(--transition-fast);
          text-align: left;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .sidebar-tab:hover {
          background: rgba(0,0,0,0.03);
          color: var(--text-primary);
        }
        .sidebar-tab.active {
          background: var(--bg-surface);
          color: var(--brand-red);
          font-weight: 600;
          box-shadow: var(--shadow-sm);
        }
      `}</style>
    </div>
  );
};

const TabPanel: React.FC<{ activeTab: TabView; target: TabView; children: React.ReactNode }> = ({ activeTab, target, children }) => {
  const isActive = activeTab === target;
  // Keep the component mounted once visited so expensive tabs (heatmap, clusters)
  // don't recompute every time the user switches away and back.
  const hasEverBeenActive = React.useRef(isActive);
  if (isActive) hasEverBeenActive.current = true;

  if (!hasEverBeenActive.current) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
      style={{ minHeight: '100%', display: isActive ? undefined : 'none' }}
    >
      {children}
    </motion.div>
  );
};

export default AssignmentDetails;
