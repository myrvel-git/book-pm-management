import React, { useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import SettingsIcon from '@mui/icons-material/Settings';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import DatasetIcon from '@mui/icons-material/Dataset';
import useMediaQuery from '@mui/material/useMediaQuery';
import Nav from './components/Nav';
import Dashboard from './components/Dashboard';
import LogForm from './components/LogForm';
import History from './components/History';
import WeeklySummary from './components/WeeklySummary';
import GapFinder from './components/GapFinder';
import useEntries from './hooks/useEntries';
import brand from './brand';

/**
 * Root application component.
 * Manages view state (Dashboard / Log / History) and settings dialog.
 * No router — simple tab switching for GitHub Pages compatibility.
 */
export default function App() {
  const { entries, add, update, remove, clearAll, loadSampleData } = useEntries();
  const [view, setView] = useState(0); // 0=Dashboard, 1=Log, 2=History, 3=Summary, 4=GapFinder
  const [editEntry, setEditEntry] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const isMobile = useMediaQuery('(max-width:600px)');

  // Handle log form submit (add or update)
  const handleLogSubmit = useCallback((entry) => {
    if (entry.id) {
      update(entry.id, entry);
    } else {
      add(entry);
    }
    setEditEntry(null);
  }, [add, update]);

  // Navigate to Log view with a specific type pre-selected
  const handleQuickAdd = useCallback((type) => {
    setEditEntry(null);
    setView(1);
  }, []);

  // Quick-add 250 ml water
  const handleQuickWater = useCallback(() => {
    add({
      type: 'water',
      value: 250,
      unit: 'ml',
      note: '',
      timestamp: new Date().toISOString(),
    });
  }, [add]);

  // Edit entry: switch to Log view with the entry pre-filled
  const handleEdit = useCallback((entry) => {
    setEditEntry(entry);
    setView(1);
  }, []);

  // Cancel editing
  const handleCancelEdit = useCallback(() => {
    setEditEntry(null);
  }, []);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        pb: isMobile ? '72px' : 0, // Space for bottom nav on mobile
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Nav view={view} onChangeView={setView} />

      {/* Settings button */}
      <IconButton
        onClick={() => setSettingsOpen(true)}
        aria-label="Settings"
        id="settings-button"
        sx={{
          position: 'fixed',
          top: isMobile ? 12 : 14,
          right: 16,
          zIndex: 1200,
          color: 'text.secondary',
          '&:hover': { color: 'primary.light' },
        }}
      >
        <SettingsIcon />
      </IconButton>

      {/* Main content */}
      <Box sx={{ flex: 1 }}>
        {view === 0 && (
          <Dashboard
            entries={entries}
            onQuickAdd={handleQuickAdd}
            onQuickWater={handleQuickWater}
          />
        )}
        {view === 1 && (
          <LogForm
            onSubmit={handleLogSubmit}
            editEntry={editEntry}
            onCancel={editEntry ? handleCancelEdit : undefined}
          />
        )}
        {view === 2 && (
          <History
            entries={entries}
            onEdit={handleEdit}
            onDelete={remove}
          />
        )}
        {view === 3 && <WeeklySummary />}
        {view === 4 && <GapFinder />}
      </Box>

      <Box component="footer" sx={{ py: 2, px: 3, textAlign: 'center', color: 'text.secondary', borderTop: 1, borderColor: 'divider', fontSize: '0.85rem' }}>
        {brand.name} example app for the book Practical Product Management by Guinevere Orvis.{' '}
        <Box component="a" href="https://github.com/gorvis/book-pm-management/blob/main/LICENSE" target="_blank" rel="noreferrer" sx={{ color: 'inherit', textDecoration: 'underline' }}>
          Read license.
        </Box>
      </Box>

      {/* Settings dialog */}
      <Dialog
        open={settingsOpen}
        onClose={() => { setSettingsOpen(false); setConfirmClear(false); }}
        maxWidth="xs"
        fullWidth
        id="settings-dialog"
      >
        <DialogTitle sx={{ fontFamily: '"Space Grotesk", sans-serif', textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: '1rem' }}>
          Settings
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {brand.name} stores all data in your browser. Nothing is sent to a server.
          </Typography>

          {/* Reload sample data */}
          <Button
            variant="outlined"
            startIcon={<DatasetIcon />}
            onClick={() => { loadSampleData(); setSettingsOpen(false); }}
            id="reload-sample-data-button"
          >
            Reload sample data
          </Button>

          {/* Clear all data */}
          {!confirmClear ? (
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteSweepIcon />}
              onClick={() => setConfirmClear(true)}
              id="clear-data-button"
            >
              Clear all data
            </Button>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body2" color="error">
                This will permanently delete all your entries. Are you sure?
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  color="error"
                  size="small"
                  onClick={() => { clearAll(); setSettingsOpen(false); setConfirmClear(false); }}
                  id="confirm-clear-button"
                >
                  Yes, clear all
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setConfirmClear(false)}
                  id="cancel-clear-button"
                >
                  Cancel
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setSettingsOpen(false); setConfirmClear(false); }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
