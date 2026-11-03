// App behavior notes, kept in the app so personnel can read them offline.
// Replace these with station-approved documents when the organization supplies them.
export const SETTINGS_DOCUMENTS = {
  privacy: {
    title: 'Privacy Policy',
    introduction: 'How this personnel app uses information during incident response.',
    sections: [
      { title: 'Account and assignments', text: 'The app uses your signed-in profile, station, team, assigned truck and dispatch information to show your duties and incident updates. Access uses your personnel account.' },
      { title: 'Location sharing', text: 'While you are on duty, the app shares your device location with the command center for responder tracking and routing. With the required permission, sharing can continue in the background. Sharing stops when you sign out or your duty status turns tracking off.' },
      { title: 'Notifications', text: 'When you enable push notifications, a device notification token and your sound preference are registered with the backend. Dispatch alerts are delivered through Expo and the device notification service. You can change these preferences in Settings or manage permissions in your phone settings.' },
      { title: 'Reports and photos', text: 'Information and photos you choose to submit in incident reports are sent to the backend and can be viewed by authorized users. Avoid including unrelated personal information in reports or photographs.' },
      { title: 'Information on this phone', text: 'Your sign-in session, app theme and notification preferences are stored using the device secure storage. Signing out removes the saved sign-in session. Theme and notification preferences remain on this phone.' },
      { title: 'Maps and services', text: 'Displaying maps and receiving alerts involves external map and notification services. Those services receive network requests needed to display maps or deliver alerts.' },
      { title: 'Questions about your information', text: 'Contact your station administrator for questions about account access, incident records, data retention or requests concerning your personal information. Your organization manages the backend and its records.' },
    ],
  },
  terms: {
    title: 'Terms of Use',
    introduction: 'Guidance for using this app as part of your station’s response operations.',
    sections: [
      { title: 'Authorized personnel', text: 'Use the app with your own authorized personnel account. Keep your credentials private and sign out when you finish using a shared phone.' },
      { title: 'Accurate operational records', text: 'Record acknowledgements, departures, arrivals, scene clearance and incident reports accurately. Confirm actions only when they reflect what actually occurred and you have the authority to perform them.' },
      { title: 'Location and device permissions', text: 'Keep required location and notification permissions enabled while on duty. Phone connectivity, GPS conditions, battery restrictions and device settings can affect live tracking and alerts.' },
      { title: 'Routes and alerts', text: 'Routes and notifications support operational coordination. Follow station instructions, current road conditions and the directions of the incident command team. Report missing or incorrect information to your dispatcher.' },
      { title: 'Responsible access', text: 'Access incident and personnel information only for your assigned duties. Do not share account access, incident photographs or personal information with unauthorized people.' },
      { title: 'Station procedures and support', text: 'Your station’s policies and operating procedures apply when using this app. Contact your station administrator for access changes, corrections, technical assistance and the organization’s official policies.' },
    ],
  },
};
