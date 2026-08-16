import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.socrates.studyapp',
  appName: 'Socrates AI Tutor',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
