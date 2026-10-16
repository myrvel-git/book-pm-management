import React, { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import ScheduleIcon from '@mui/icons-material/Schedule';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import GroupIcon from '@mui/icons-material/Group';
import { tokens } from '../theme';
import useSchedule from '../hooks/useSchedule';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MIN_GAP = 31; // gaps must be > 30 minutes

// Workout library — durations in minutes, all fit within a gap
const WORKOUTS = [
  { name: 'Quick Bodyweight HIIT', duration: 15, desc: 'Jumping jacks, squats, push-ups, and plank rotations. No equipment needed.', intensity: 'High' },
  { name: 'Mobility & Stretch Flow', duration: 20, desc: 'Dynamic stretches and joint mobility to undo sitting through long lectures.', intensity: 'Low' },
  { name: 'Dumbbell Strength Circuit', duration: 25, desc: '3 rounds: goblet squats, rows, and shoulder press. Great for the campus gym.', intensity: 'Medium' },
  { name: 'Core & Abs Burner', duration: 10, desc: 'Crunches, leg raises, Russian twists, and planks. Hit the mat and go.', intensity: 'Medium' },
  { name: 'Treadmill Intervals', duration: 20, desc: 'Alternate 1 min sprint / 1 min walk for 10 rounds. Boosts cardio fast.', intensity: 'High' },
  { name: 'Yoga Flow & Breathwork', duration: 30, desc: 'Sun salutations and breathing exercises to reset between classes.', intensity: 'Low' },
  { name: 'Kettlebell Swing Circuit', duration: 15, desc: 'Swings, cleans, and presses in a tabata format. Packs a punch in little time.', intensity: 'High' },
  { name: 'Walking Recovery', duration: 15, desc: 'Brisk walk around campus. Low impact, clears the mind, counts as active recovery.', intensity: 'Low' },
];

// Simulated gym occupancy by hour (0-23). Static sample data — NOT live.
const SIMULATED_OCCUPANCY = {
  6: 15, 7: 25, 8: 40, 9: 55, 10: 45, 11: 35,
  12: 60, 13: 50, 14: 30, 15: 25, 16: 40, 17: 70,
  18: 85, 19: 90, 20: 75, 21: 50, 22: 30, 23: 10,
};

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToLabel(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
}

/**
 * Find free gaps between classes on a given day.
 * Returns array of { start, end, duration } in minutes.
 * Only includes gaps > 30 minutes.
 */
function findGaps(dayClasses) {
  if (dayClasses.length === 0) return [];
  const sorted = [...dayClasses].sort((a, b) => a.start - b.start);
  const gaps = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const gapStart = sorted[i].end;
    const gapEnd = sorted[i + 1].start;
    const duration = gapEnd - gapStart;
    if (duration >= MIN_GAP) {
      gaps.push({ start: gapStart, end: gapEnd, duration });
    }
  }
  return gaps;
}

function getOccupancyLevel(mins) {
  const hour = Math.floor(mins / 60);
  const pct = SIMULATED_OCCUPANCY[hour] ?? 20;
  if (pct < 35) return { label: 'Not too busy', color: '#4CAF50', pct };
  if (pct < 65) return { label: 'Moderately busy', color: '#FF9800', pct };
  return { label: 'Very busy', color: '#F44336', pct };
}

export default function GapFinder() {
  const { classes, addClass, updateClass, removeClass } = useSchedule();
  const [form, setForm] = useState({ name: '', day: '1', start: '', end: '' });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [selectedDay, setSelectedDay] = useState(1);

  // Group classes by day
  const classesByDay = useMemo(() => {
    const map = {};
    for (let i = 0; i < 7; i++) map[i] = [];
    classes.forEach((c) => {
      if (map[c.day]) map[c.day].push(c);
    });
    Object.values(map).forEach((arr) => arr.sort((a, b) => a.start - b.start));
    return map;
  }, [classes]);

  const todayClasses = classesByDay[selectedDay] || [];
  const gaps = useMemo(() => findGaps(todayClasses), [todayClasses]);

  function validateAndSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) {
      setError('Please enter a class name.');
      return;
    }
    if (!form.start || !form.end) {
      setError('Please enter both a start time and an end time.');
      return;
    }

    const startMin = timeToMinutes(form.start);
    const endMin = timeToMinutes(form.end);
    const dayNum = parseInt(form.day, 10);

    if (endMin <= startMin) {
      setError('End time must be after the start time.');
      return;
    }

    // Check for overlaps with existing classes on the same day
    const dayClasses = classes.filter((c) => c.day === dayNum && c.id !== editingId);
    const overlaps = dayClasses.some((c) => {
      return startMin < c.end && endMin > c.start;
    });

    if (overlaps) {
      setError('This class overlaps with another class on the same day. Please adjust the times.');
      return;
    }

    const classData = {
      name: form.name.trim(),
      day: dayNum,
      start: startMin,
      end: endMin,
    };

    if (editingId) {
      updateClass(editingId, classData);
      setEditingId(null);
    } else {
      addClass(classData);
    }

    setForm({ name: '', day: String(selectedDay), start: '', end: '' });
  }

  function handleEdit(cls) {
    setEditingId(cls.id);
    setForm({
      name: cls.name,
      day: String(cls.day),
      start: `${String(Math.floor(cls.start / 60)).padStart(2, '0')}:${String(cls.start % 60).padStart(2, '0')}`,
      end: `${String(Math.floor(cls.end / 60)).padStart(2, '0')}:${String(cls.end % 60).padStart(2, '0')}`,
    });
    setSelectedDay(cls.day);
    setError('');
  }

  function handleCancelEdit() {
    setEditingId(null);
    setForm({ name: '', day: String(selectedDay), start: '', end: '' });
    setError('');
  }

  function handleDayChange(day) {
    setSelectedDay(day);
    if (!editingId) {
      setForm((f) => ({ ...f, day: String(day) }));
    }
  }

  // Get workouts that fit within a gap
  function workoutsForGap(gap) {
    return WORKOUTS.filter((w) => w.duration <= gap.duration).sort((a, b) => a.duration - b.duration);
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', px: 2, py: 3 }}>
      <Typography variant="h5" sx={{ mb: 1, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 1 }}>
        <FitnessCenterIcon /> Smart Gap Finder
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Enter your class schedule and we'll find free gaps with workout suggestions that fit. All data stays on your device.
      </Typography>

      {/* Day selector */}
      <Box sx={{ display: 'flex', gap: 0.5, mb: 3, flexWrap: 'wrap' }}>
        {DAYS.map((day, i) => (
          <Chip
            key={i}
            label={DAY_ABBR[i]}
            onClick={() => handleDayChange(i)}
            variant={selectedDay === i ? 'filled' : 'outlined'}
            color="primary"
            size="small"
            sx={{
              fontFamily: '"Space Grotesk", sans-serif',
              fontWeight: 600,
              minWidth: 48,
            }}
            id={`gap-day-${DAY_ABBR[i].toLowerCase()}`}
          />
        ))}
      </Box>

      <Grid container spacing={3}>
        {/* Left column: Class form + list */}
        <Grid size={{ xs: 12, md: 5 }}>
          {/* Class entry form */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 1.5, fontSize: '0.95rem' }}>
              {editingId ? 'Edit Class' : 'Add a Class'}
            </Typography>
            <Card component="form" onSubmit={validateAndSubmit} sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Class name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Intro to Biology"
                fullWidth
                size="small"
                id="gap-class-name"
              />
              <FormControl fullWidth size="small">
                <InputLabel>Day</InputLabel>
                <Select
                  value={form.day}
                  onChange={(e) => setForm({ ...form, day: e.target.value })}
                  label="Day"
                  id="gap-class-day"
                >
                  {DAYS.map((day, i) => (
                    <MenuItem key={i} value={String(i)}>{day}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <TextField
                  label="Start time"
                  type="time"
                  value={form.start}
                  onChange={(e) => setForm({ ...form, start: e.target.value })}
                  fullWidth
                  size="small"
                  slotProps={{ inputLabel: { shrink: true } }}
                  id="gap-class-start"
                />
                <TextField
                  label="End time"
                  type="time"
                  value={form.end}
                  onChange={(e) => setForm({ ...form, end: e.target.value })}
                  fullWidth
                  size="small"
                  slotProps={{ inputLabel: { shrink: true } }}
                  id="gap-class-end"
                />
              </Box>

              {error && (
                <Alert severity="error" sx={{ fontSize: '0.85rem' }} id="gap-error">
                  {error}
                </Alert>
              )}

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  type="submit"
                  variant="contained"
                  size="small"
                  fullWidth
                  id="gap-class-submit"
                >
                  {editingId ? 'Save' : 'Add class'}
                </Button>
                {editingId && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleCancelEdit}
                    id="gap-class-cancel"
                  >
                    Cancel
                  </Button>
                )}
              </Box>
            </Card>
          </Box>

          {/* Class list for selected day */}
          <Box>
            <Typography variant="subtitle1" sx={{ mb: 1.5, fontSize: '0.95rem' }}>
              {DAYS[selectedDay]}'s Classes
            </Typography>
            {todayClasses.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                No classes added for this day yet.
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {todayClasses.map((cls) => (
                  <Box
                    key={cls.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 1.5,
                      borderRadius: 1.5,
                      border: `1px solid ${tokens.borderViolet}`,
                      backgroundColor: tokens.accentDim08,
                    }}
                  >
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"Space Grotesk", sans-serif' }}>
                        {cls.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <AccessTimeIcon sx={{ fontSize: 12 }} />
                        {minutesToLabel(cls.start)} — {minutesToLabel(cls.end)}
                      </Typography>
                    </Box>
                    <Box>
                      <IconButton size="small" onClick={() => handleEdit(cls)} aria-label="Edit class" id={`gap-edit-${cls.id}`}>
                        <EditIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                      <IconButton size="small" onClick={() => removeClass(cls.id)} aria-label="Delete class" id={`gap-delete-${cls.id}`}>
                        <DeleteIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Grid>

        {/* Right column: Gaps + workout suggestions */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Typography variant="subtitle1" sx={{ mb: 1.5, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 1 }}>
            <ScheduleIcon /> Free Gaps on {DAYS[selectedDay]}
          </Typography>

          {gaps.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center', border: `1px dashed ${tokens.borderViolet}`, borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {todayClasses.length === 0
                  ? 'Add classes to see free gaps between them.'
                  : 'No free gaps over 30 minutes found between your classes.'}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {gaps.map((gap, gi) => {
                const workouts = workoutsForGap(gap);
                const occ = getOccupancyLevel(gap.start);
                return (
                  <Box
                    key={gi}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      border: `1px solid ${tokens.borderViolet}`,
                      backgroundColor: '#14141C',
                    }}
                  >
                    {/* Gap header */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontSize: '0.9rem', fontFamily: '"Space Grotesk", sans-serif' }}>
                          {minutesToLabel(gap.start)} — {minutesToLabel(gap.end)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {gap.duration} min free gap
                        </Typography>
                      </Box>
                      {/* Simulated occupancy */}
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          backgroundColor: 'rgba(255,255,255,0.05)',
                        }}
                      >
                        <GroupIcon sx={{ fontSize: 14, color: occ.color }} />
                        <Typography variant="caption" sx={{ color: occ.color, fontWeight: 600 }}>
                          {occ.label} · ~{occ.pct}%
                        </Typography>
                      </Box>
                    </Box>

                    <Divider sx={{ mb: 1.5, borderColor: tokens.borderViolet }} />

                    {/* Workout suggestions */}
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      Workouts that fit in this gap:
                    </Typography>
                    {workouts.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        No standard workout fits in {gap.duration} minutes.
                      </Typography>
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {workouts.map((w, wi) => (
                          <Box
                            key={wi}
                            sx={{
                              p: 1.5,
                              borderRadius: 1.5,
                              backgroundColor: tokens.accentDim08,
                              border: `1px solid ${tokens.borderViolet}`,
                              transition: 'border-color 0.2s ease, background-color 0.2s ease',
                              '&:hover': {
                                borderColor: tokens.accentBorder40,
                                backgroundColor: tokens.accentDim12,
                              },
                            }}
                          >
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"Space Grotesk", sans-serif', fontSize: '0.85rem' }}>
                                {w.name}
                              </Typography>
                              <Chip
                                label={`${w.duration} min`}
                                size="small"
                                sx={{
                                  height: 20,
                                  fontSize: '0.7rem',
                                  fontFamily: '"Space Grotesk", sans-serif',
                                  fontWeight: 600,
                                  backgroundColor: tokens.accentDim15,
                                  color: tokens.violetBright,
                                }}
                              />
                            </Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.4, mb: 0.5 }}>
                              {w.desc}
                            </Typography>
                            <Chip
                              label={w.intensity}
                              size="small"
                              variant="outlined"
                              sx={{
                                height: 18,
                                fontSize: '0.65rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                              }}
                            />
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Box>
          )}

          {/* Occupancy disclaimer */}
          <Alert severity="info" sx={{ mt: 2, fontSize: '0.8rem' }} icon={<GroupIcon />}>
            Gym occupancy estimates are simulated sample data for demonstration only. They are not live data or accurate predictions of actual gym usage.
          </Alert>
        </Grid>
      </Grid>
    </Box>
  );
}
