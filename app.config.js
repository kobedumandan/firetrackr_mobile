// Extends app.json. google-services.json (from the Firebase console) is what
// lets Android receive push alerts; it is only wired in once it exists, so the
// app still builds before Firebase has been set up.
const fs = require('fs');
const path = require('path');

module.exports = ({ config }) => {
  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim() || config.extra?.eas?.projectId;
  if (projectId) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId)) {
      throw new Error('EXPO_PUBLIC_EAS_PROJECT_ID must be the project UUID from Expo project settings.');
    }
    config.extra = { ...config.extra, eas: { ...config.extra?.eas, projectId } };
  }
  const firebaseFile = process.env.GOOGLE_SERVICES_JSON || path.join(__dirname, 'google-services.json');
  if (fs.existsSync(firebaseFile)) {
    config.android = { ...config.android, googleServicesFile: firebaseFile };
  }
  return config;
};
