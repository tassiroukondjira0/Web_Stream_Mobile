import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { useAuth } from '@/context/AuthContext';
import { initializeAdMob } from '@/services/ads';

function getBannerAdUnitId(): string | null {
  if (__DEV__) return TestIds.BANNER;

  const appId = Platform.select({
    android: process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID,
    ios: process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID,
  });
  const adUnitId = Platform.select({
    android: process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID,
    ios: process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_ID,
  });

  return appId && adUnitId ? adUnitId : null;
}

const bannerAdUnitId = getBannerAdUnitId();

export default function AdMobBanner() {
  const { user, isLoading } = useAuth();
  const [canRequestAds, setCanRequestAds] = useState(false);
  const isPremium =
    user?.role === 'SUBSCRIBER' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (isLoading || isPremium || !bannerAdUnitId) return;

    let active = true;
    void initializeAdMob().then((ready) => {
      if (active) setCanRequestAds(ready);
    });

    return () => {
      active = false;
    };
  }, [isLoading, isPremium]);

  if (isLoading || isPremium || !bannerAdUnitId || !canRequestAds) return null;

  return (
    <View style={styles.container}>
      <BannerAd unitId={bannerAdUnitId} size={BannerAdSize.BANNER} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 10,
  },
});