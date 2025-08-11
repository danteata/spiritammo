// Military-Themed Color Palettes for SpiritAmmo

export const TACTICAL_THEME = {
  primary: '#2D5016', // Military Green
  secondary: '#8B4513', // Brown
  accent: '#FF6B35', // Orange (target/fire)
  background: '#1A1A1A', // Dark Tactical
  surface: '#2C2C2C', // Darker Surface
  text: '#FFFFFF', // White Text
  textSecondary: '#B0B0B0', // Gray Text
  success: '#32CD32', // Lime Green (hit)
  warning: '#FFD700', // Gold (caution)
  error: '#FF4500', // Red Orange (miss)
  border: '#4A4A4A', // Dark Border
  shadow: 'rgba(0, 0, 0, 0.5)',
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
}

export const LIGHT_THEME = {
  primary: '#2D5016', // Military Green
  secondary: '#4A6B2A', // Lighter Military Green
  accent: '#FF6B35', // Orange Accent
  background: '#FFFFFF', // Pure White
  surface: '#FFFFFF', // White Surface
  text: '#2D5016', // Military Green Text
  textSecondary: '#495057', // Dark Gray Text
  success: '#28A745', // Green
  warning: '#FFC107', // Amber
  error: '#DC3545', // Red
  border: '#DEE2E6', // Light Border
  shadow: 'rgba(45, 80, 22, 0.1)', // Light military green shadow
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
    light: '#FFFFFF', // Pure white background
    secondary: '#F8F9FA', // Light gray secondary
  },
  surface: {
    dark: TACTICAL_THEME.surface,
    light: '#FFFFFF', // White surface
    card: '#FFFFFF', // White cards with shadow
  },
  text: {
    dark: TACTICAL_THEME.text,
    light: '#2D5016', // Military green text for light theme
    primary: '#2D5016', // Primary military green
    secondary: '#495057', // Dark gray for secondary text
    muted: '#6C757D', // Muted gray for less important text
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
    dark: [TACTICAL_THEME.background, TACTICAL_THEME.primary],
    light: ['#FFFFFF', '#F8F9FA'], // Clean white to light gray
  },
  secondary: {
    dark: [TACTICAL_THEME.surface, TACTICAL_THEME.secondary],
    light: ['#F8F9FA', '#E9ECEF'], // Light gray gradient
  },
  tactical: {
    background: [TACTICAL_THEME.background, '#0D0D0D'],
    surface: [TACTICAL_THEME.surface, TACTICAL_THEME.background],
    accent: [TACTICAL_THEME.accent, '#CC5529'],
  },
  stealth: {
    background: [STEALTH_THEME.background, '#0A0A0A'],
    surface: [STEALTH_THEME.surface, STEALTH_THEME.background],
    accent: [STEALTH_THEME.accent, '#0066CC'],
  },
  light: {
    background: ['#FFFFFF', '#F8F9FA'], // Clean white gradient
    surface: ['#FFFFFF', '#FFFFFF'], // Pure white
    accent: ['#2D5016', '#4A6B2A'], // Military green accent
    card: ['#FFFFFF', '#F8F9FA'], // Card backgrounds
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
