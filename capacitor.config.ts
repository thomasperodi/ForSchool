import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'it.skoolly.app',
  appName: 'skoolly',
  webDir: 'out',
  server: {
    url: 'https://for-school-tau.vercel.app/',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    CapacitorBrowser: {},
    App: {
      // custom scheme per deep linking
      scheme: 'skoolly'
    },
    // ✅ Aggiungi questa riga per risolvere l'errore
    SocialLogin: {
      google: {
        serverClientId: '672512372421-g6g1a3fcc17r40nrg1v3brv99858562t.apps.googleusercontent.com',
        
      },
      
    }
  }
};

export default config;