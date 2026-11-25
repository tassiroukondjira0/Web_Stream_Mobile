import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSegments } from 'expo-router';
import { Platform } from 'react-native';
import { TestIds, useAppOpenAdManager } from 'react-native-google-mobile-ads';
import { useAuth } from '@/context/AuthContext';
import { initializeAdMob } from '@/services/ads';

const HAS_LAUNCHED_KEY = '@cinemax_has_launched';

function getAppOpenAdUnitId(): string | null {
  if (__DEV__) return TestIds.APP_OPEN;

  const appId = Platform.select({
    android: process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID,
    ios: process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID,
  });
  const adUnitId = Platform.select({
    android: process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_OPEN_ID,
    ios: process.env.EXPO_PUBLIC_ADMOB_IOS_APP_OPEN_ID,
  });

  return appId && adUnitId ? adUnitId : null;
}

const appOpenAdUnitId = getAppOpenAdUnitId();

export default function AdMobAppOpen({ isWakingServer }: { isWakingServer: boolean }) {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const isPlayerScreen = segments.includes('player');
  const isPremium =
    user?.role === 'SUBSCRIBER' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const [hasCheckedLaunch, setHasCheckedLaunch] = useState(false);
  const [hasLaunchedBefore, setHasLaunchedBefore] = useState(false);
  const [adsInitialized, setAdsInitialized] = useState(false);
  const coldStartHandled = useRef(false);

  useEffect(() => {
    let active = true;

    const checkPreviousLaunch = async () => {
      try {
        const previousLaunch = await AsyncStorage.getItem(HAS_LAUNCHED_KEY);
        if (!previousLaunch) {
          await AsyncStorage.setItem(HAS_LAUNCHED_KEY, 'true');
        }

        if (active) {
          setHasLaunchedBefore(Boolean(previousLaunch));
          setHasCheckedLaunch(true);
        }
      } catch (error) {
        console.warn('Impossible de vérifier le premier lancement de l’application :', error);
        if (active) setHasCheckedLaunch(true);
      }
    };

    void checkPreviousLaunch();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (
      isLoading ||
      isPremium ||
      isPlayerScreen ||
      !hasCheckedLaunch ||
      !hasLaunchedBefore ||
      !appOpenAdUnitId
    ) {
      return;
    }

    let active = true;
    void initializeAdMob().then((ready) => {
      if (active) setAdsInitialized(ready);
    });

    return () => {
      active = false;
    };
  }, [hasCheckedLaunch, hasLaunchedBefore, isLoading, isPlayerScreen, isPremium]);

  const shouldManageAds =
    hasCheckedLaunch &&
    hasLaunchedBefore &&
    adsInitialized &&
    !isLoading &&
    !isPremium &&
    !isPlayerScreen;
  const { status, showAdIfAvailable } = useAppOpenAdManager({
    adUnitId: shouldManageAds ? appOpenAdUnitId : null,
    autoLoad: shouldManageAds,
  });

  useEffect(() => {
    if (
      coldStartHandled.current ||
      isWakingServer ||
      isLoading ||
      !hasCheckedLaunch ||
      !segments.length
    ) {
      return;
    }

    if (isPremium || isPlayerScreen || !hasLaunchedBefore || !appOpenAdUnitId) {
      coldStartHandled.current = true;
      return;
    }

    if (!adsInitialized) return;

    if (status === 'loaded') {
      coldStartHandled.current = true;
      showAdIfAvailable();
    } else if (status === 'error' || status === 'no-fill') {
      coldStartHandled.current = true;
    }
  }, [
    adsInitialized,
    hasCheckedLaunch,
    hasLaunchedBefore,
    isLoading,
    isPlayerScreen,
    isPremium,
    isWakingServer,
    segments.length,
    showAdIfAvailable,
    status,
  ]);

  return null;
}