// Military-Themed Color Palettes for SpiritAmmo

export const TACTICAL_THEME = {
  primary: '#2D5016', // Military Green
  secondary: '#8B4513', // Brown
  accent: '#FF6B35', // Orange (target/fire)
  background: '#050505', // Deepest Black/Dark
  surface: '#0D0D0D', // Deep Dark Surface (was #2C2C2C)
  text: '#FFFFFF', // White Text
  textSecondary: '#B0B0B0', // Gray Text
  success: '#32CD32', // Lime Green (hit)
  warning: '#FFD700', // Gold (caution)
  error: '#FF4500', // Red Orange (miss)
  border: '#333333', // Darker Border
  shadow: 'rgba(0, 0, 0, 0.8)',
  surfaceHighlight: '#1A1A1A', // Lighter surface for interaction
}

export const STEALTH_THEME = {
  primary: '#1C1C1E', // Almost Black
  secondary: '#48484A', // Dark Gray
  accent: '#0A84FF', // Blue Accent
  background: '#000000', // Pure Black
  surface: '#1C1C1E', // Dark Surface
  text: '#FFFFFF', // White Text
  textSecondary: '#8E8E93', // System Gray
  success: '#30D158', // Green
  warning: '#FF9F0A', // Orange
  error: '#FF453A', // Red
  border: '#38383A', // Dark Border
  shadow: 'rgba(0, 0, 0, 0.7)',
  surfaceHighlight: '#2C2C2E',
}

export const GARRISON_THEME = {
  primary: '#4A6B2A', // Olive Green
  secondary: '#8B4513', // Brown
  accent: '#FF6B35', // Orange
  background: '#F5F5F0', // Bone/Off-White
  surface: '#FFFFFF', // White
  surfaceHighlight: '#F0F0E8', // Slightly darker white for interaction
  text: '#1C1C1E', // Dark Gunmetal
  textSecondary: '#666666', // Gray
  success: '#32CD32', // Lime Green
  warning: '#FFD700', // Gold
  error: '#FF4500', // Red Orange
  border: '#E0E0E0', // Light Border
  shadow: 'rgba(0, 0, 0, 0.08)', // Softer shadow for light mode
}

// Legacy colors for backward compatibility
export const COLORS = {
  primary: {
    dark: TACTICAL_THEME.primary,
    main: TACTICAL_THEME.primary,
    light: '#4A6B2A',
  },
  secondary: {
    dark: TACTICAL_THEME.secondary,
    main: TACTICAL_THEME.secondary,
    light: '#A0522D',
  },
  accent: TACTICAL_THEME.accent,
  background: {
    dark: TACTICAL_THEME.background,
    light: GARRISON_THEME.background,
  },
  surface: {
    dark: TACTICAL_THEME.surface,
    light: GARRISON_THEME.surface,
  },
  text: {
    dark: TACTICAL_THEME.text,
    light: GARRISON_THEME.text,
  },
  success: TACTICAL_THEME.success,
  error: TACTICAL_THEME.error,
  warning: TACTICAL_THEME.warning,
  info: '#2196f3',
  disabled: '#9e9e9e',
  divider: 'rgba(0, 0, 0, 0.12)',
}

export const GRADIENTS = {
  primary: {
    dark: [TACTICAL_THEME.background, TACTICAL_THEME.primary] as const,
    light: [GARRISON_THEME.background, '#E8E8E0'] as const,
  },
  secondary: {
    dark: [TACTICAL_THEME.surface, TACTICAL_THEME.secondary] as const,
    light: [GARRISON_THEME.surface, '#F0F0E8'] as const,
  },
  tactical: {
    background: [TACTICAL_THEME.background, '#0D0D0D'] as const,
    surface: [TACTICAL_THEME.surface, TACTICAL_THEME.background] as const,
    accent: [TACTICAL_THEME.accent, '#CC5529'] as const,
  },
  stealth: {
    background: [STEALTH_THEME.background, '#0A0A0A'] as const,
    surface: [STEALTH_THEME.surface, STEALTH_THEME.background] as const,
    accent: [STEALTH_THEME.accent, '#0066CC'] as const,
  },
}

// Military Typography Scale
export const MILITARY_TYPOGRAPHY = {
  title: {
    fontSize: 32,
    fontWeight: '900' as const,
    lineHeight: 40,
    letterSpacing: 1.2,
  }, // MISSION TITLE
  heading: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 36,
    letterSpacing: 1.0,
  }, // SECTION HEADER
  subheading: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
    letterSpacing: 0.8,
  },
  body: {
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 24,
    letterSpacing: 0.3,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
    letterSpacing: 0.2,
  },
  code: {
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
    letterSpacing: 1.5,
    fontFamily: 'monospace',
  }, // TARGET COORDS
  button: {
    fontSize: 16,
    fontWeight: '700' as const,
    lineHeight: 24,
    letterSpacing: 1.0,
  },
}

// Military Rank Colors
export const RANK_COLORS = {
  recruit: '#8E8E93', // Gray
  private: '#8B4513', // Brown
  corporal: '#FFD700', // Gold
  sergeant: '#32CD32', // Lime Green
  lieutenant: '#0A84FF', // Blue
  captain: '#FF6B35', // Orange
  major: '#9932CC', // Purple
  colonel: '#FF1493', // Deep Pink
  general: '#FFD700', // Gold with special effects
}

// Accuracy/Performance Colors
export const ACCURACY_COLORS = {
  excellent: '#32CD32', // 95-100%
  good: '#FFD700', // 85-94%
  fair: '#FF9F0A', // 75-84%
  poor: '#FF453A', // Below 75%
}

// Mission Status Colors
export const MISSION_COLORS = {
  ready: '#32CD32', // Ready for deployment
  inProgress: '#FF9F0A', // Mission in progress
  completed: '#0A84FF', // Mission completed
  failed: '#FF453A', // Mission failed
  classified: '#9932CC', // Classified/locked
}
