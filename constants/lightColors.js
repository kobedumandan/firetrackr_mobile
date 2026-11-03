import DarkColors from './colors';

const LightColors = {
  ...DarkColors,
  bgBase: '#f4f5f7',
  bgPanel: '#ffffff',
  bgCard: '#f7f8fa',
  bgHover: '#eceff3',
  bgOverlay: 'rgba(255,255,255,0.94)',
  border: '#cfd5dd',
  borderDim: '#e1e5eb',
  borderBright: '#b5c0cd',
  textPrimary: '#17202b',
  textSecondary: '#586575',
  textTertiary: '#6b7785',
  textMuted: '#75808d',
  pageDefaultBase: '#f0f2f5',
  accentGreen: '#087c4d',
  accentAmber: '#946000',
  accentBlue: '#1266c7',
  badgeGreen: { ...DarkColors.badgeGreen, text: '#087c4d' },
  badgeAmber: { ...DarkColors.badgeAmber, text: '#946000' },
  badgeBlue: { ...DarkColors.badgeBlue, text: '#1266c7' },
  badgeMuted: { bg: '#eceff3', text: '#586575', border: '#cfd5dd' },
};

export default LightColors;
