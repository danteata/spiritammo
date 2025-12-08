// Military-Themed Color Palettes for SpiritAmmo

export const TACTICAL_THEME = {
  primary: '#323232', // Deep Charcoal
  secondary: '#1A1A1A', // Darker Charcoal
  accent: '#F97316', // Vibrant Orange (Action)
  background: '#0F172A', // Slate 900 (Deep Blue/Black)
  surface: '#1E293B', // Slate 800 (Lighter Blue/Black)
  text: '#F8FAFC', // Slate 50 (Off-white)
  textSecondary: '#94A3B8', // Slate 400 (Muted Blue/Gray)
  success: '#10B981', // Emerald 500
  warning: '#F59E0B', // Amber 500
  error: '#EF4444', // Red 500
  border: '#334155', // Slate 700
  shadow: 'rgba(0, 0, 0, 0.5)',
  surfaceHighlight: '#334155', // Slate 700
  glass: 'rgba(30, 41, 59, 0.7)', // Translucent Surface
  // Contrast colors for readability
  accentContrastText: '#000000', // Black text on orange backgrounds
  surfaceContrastText: '#F8FAFC', // Existing text for surface backgrounds
  primaryContrastText: '#F8FAFC', // Existing text for primary backgrounds
}

export const STEALTH_THEME = {
  primary: '#171717', // Neutral 900
  secondary: '#262626', // Neutral 800
  accent: '#38BDF8', // Sky 400 (Cyan/Blue for stealth)
  background: '#0A0A0A', // Neutral 950
  surface: '#171717', // Neutral 900
  text: '#FAFAFA', // Neutral 50
  textSecondary: '#A3A3A3', // Neutral 400
  success: '#22C55E', // Green 500
  warning: '#EAB308', // Yellow 500
  error: '#F43F5E', // Rose 500
  border: '#262626', // Neutral 800
  shadow: 'rgba(0, 0, 0, 0.8)',
  surfaceHighlight: '#262626',
  glass: 'rgba(23, 23, 23, 0.8)',
  // Contrast colors for readability
  accentContrastText: '#000000', // Black text on cyan backgrounds
  surfaceContrastText: '#FAFAFA', // Existing text for surface backgrounds
  primaryContrastText: '#FAFAFA', // Existing text for primary backgrounds
}

export const GARRISON_THEME = {
  primary: '#F1F5F9', // Slate 100
  secondary: '#FFFFFF',
  accent: '#F97316', // Orange
  background: '#F8FAFC', // Slate 50
  surface: '#FFFFFF',
  surfaceHighlight: '#F1F5F9',
  text: '#0F172A', // Slate 900
  textSecondary: '#64748B', // Slate 500
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  border: '#E2E8F0', // Slate 200
  shadow: 'rgba(15, 23, 42, 0.05)',
  glass: 'rgba(255, 255, 255, 0.8)',
  // Contrast colors for readability
  accentContrastText: '#000000', // Black text on orange backgrounds
  surfaceContrastText: '#0F172A', // Dark text for surface backgrounds
  primaryContrastText: '#0F172A', // Dark text for primary backgrounds
}

export const JUNGLE_THEME = {
  primary: '#1E3A1E', // Classic Military Green (Base)
  secondary: '#0F1C0F', // Darker shades
  accent: '#4ADE80', // Bright Green (HUD/Terminal style)
  background: '#1A2F1C', // Deep Hunter Green (Top of gradient)
  surface: '#050805', // Almost Black (Card background)
  text: '#F0F5F0', // Off-white
  textSecondary: '#869D86', // Muted Green Gray
  success: '#32CD32', // Lime Green (Classic)
  warning: '#FFD700', // Gold
  error: '#EF4444', // Red
  border: '#2A402A', // Subtle Green Border
  shadow: 'rgba(0, 0, 0, 0.9)',
  surfaceHighlight: '#111F11',
  glass: 'rgba(5, 8, 5, 0.8)', // Very dark glass
  // Contrast colors for readability
  accentContrastText: '#000000', // Black text on green backgrounds
  surfaceContrastText: '#F0F5F0', // Existing text for surface backgrounds
  primaryContrastText: '#F0F5F0', // Existing text for primary backgrounds
}

export const SLATE_THEME = {
  primary: '#64748B', // Slate 500 (Muted Blue)
  secondary: '#475569', // Slate 600
  accent: '#F1F5F9', // Slate 100 (Bright accent on dark)
  background: '#0F172A', // Slate 900 (Deep Dark)
  surface: '#1E293B', // Slate 800 (Card background)
  text: '#F8FAFC', // Slate 50 (Off-white)
  textSecondary: '#94A3B8', // Slate 400 (Muted)
  success: '#10B981', // Emerald 500
  warning: '#F59E0B', // Amber 500
  error: '#EF4444', // Red 500
  border: '#334155', // Slate 700
  shadow: 'rgba(0, 0, 0, 0.5)',
  surfaceHighlight: '#334155',
  glass: 'rgba(30, 41, 59, 0.7)', // Translucent Surface
  // Contrast colors for readability (slate has light accent on dark)
  accentContrastText: '#000000', // Black text on light accent backgrounds
  surfaceContrastText: '#F8FAFC', // Existing text for surface backgrounds
  primaryContrastText: '#000000', // Dark text for muted blue primary backgrounds
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
    background: [TACTICAL_THEME.background, '#020617'] as const, // Slate 900 -> Slate 950
    surface: [TACTICAL_THEME.surface, TACTICAL_THEME.background] as const,
    accent: [TACTICAL_THEME.accent, '#EA580C'] as const, // Orange 500 -> Orange 600
  },
  stealth: {
    background: [STEALTH_THEME.background, '#0A0A0A'] as const,
    surface: [STEALTH_THEME.surface, STEALTH_THEME.background] as const,
    accent: [STEALTH_THEME.accent, '#0284C7'] as const, // Sky 400 -> Sky 600
  },
  jungle: {
    background: ['#1A2F1C', '#000000'] as const, // Hunter Green -> Pure Black
    surface: ['#0A0F0A', '#000000'] as const,
    accent: ['#4ADE80', '#22C55E'] as const, // Bright Green Gradient
  },
  slate: {
    background: [SLATE_THEME.background, '#020617'] as const, // Slate 900 -> Slate 950
    surface: [SLATE_THEME.surface, SLATE_THEME.background] as const,
    accent: [SLATE_THEME.accent, '#E2E8F0'] as const, // Slate 100 -> Slate 200
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
