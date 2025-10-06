import type { CapacitorConfig } from '@capacitor/cli';
import '@capacitor-community/safe-area';


const config: CapacitorConfig = {
  appId: 'it.skoolly.app',
  appName: 'skoolly',
  webDir: 'out',
  server: {
    // url: 'https://www.skoolly.it',
    url: 'http://192.168.1.15:3000',
    cleartext: true
  },
  plugins: {
    SafeArea: {
      customColorsForSystemBars: true,
      statusBarColor: '#00000000', // Trasparente
      statusBarContent: 'light',
      navigationBarColor: '#00000000', // Trasparente
      navigationBarContent: 'light',
    },
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
      apple:{
        clientId : 'it.skoolly.app'
      }
      
    }
  }
};

export default config;
