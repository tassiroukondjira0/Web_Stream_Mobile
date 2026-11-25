import mobileAds, { AdsConsent } from 'react-native-google-mobile-ads';

let initializationPromise: Promise<boolean> | null = null;

export function initializeAdMob(): Promise<boolean> {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      try {
        const consentInfo = await AdsConsent.gatherConsent();
        if (!consentInfo.canRequestAds) return false;

        await mobileAds().initialize();
        return true;
      } catch (error) {
        console.warn('Impossible d’initialiser AdMob :', error);
        return false;
      }
    })();
  }

  return initializationPromise;
}