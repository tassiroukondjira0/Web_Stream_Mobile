import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Database, Eye, EyeOff, Search, Trash2 } from 'lucide-react-native';
import { Api } from '@/services/api';
import { AdminMediaItem } from '@/types/media';
import { colors } from '@/theme/theme';

const getTypeColor = (type: string) => {
  switch (type) {
    case 'MOVIE': return '#3b82f6';
    case 'SERIES': return '#a855f7';
    case 'ANIME': return '#06b6d4';
    default: return colors.textSecondary;
  }
};

const normalize = (value: string) => {
  const lowerValue = value.toLowerCase();
  const normalized = typeof lowerValue.normalize === 'function'
    ? lowerValue.normalize('NFD')
    : lowerValue
      .replace(/[àáâãäå]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôõö]/g, 'o')
      .replace(/[ùúûü]/g, 'u')
      .replace(/[ýÿ]/g, 'y')
      .replace(/ç/g, 'c')
      .replace(/ñ/g, 'n');

  return normalized.replace(/[\u0300-\u036f]/g, '');
};

export default function AdminMediasScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [medias, setMedias] = useState<AdminMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const loadMedias = useCallback(async () => {
    try {
      const items = await Api.getAdminMedias();
      setMedias(items);
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Impossible de charger les médias.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const initialLoadDone = useRef(false);
  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      loadMedias();
    }
  }, [loadMedias]);

  // Le backend ne filtre pas : la recherche se fait localement.
  const filteredMedias = useMemo(() => {
    const q = normalize(search.trim());
    if (!q) return medias;
    return medias.filter((m) => normalize(m.title ?? '').includes(q));
  }, [medias, search]);

  const onRefresh = () => {
    setRefreshing(true);
    loadMedias();
  };

  const togglePublish = async (item: AdminMediaItem) => {
    try {
      await Api.updateAdminMedia(item.slug, { isPublished: !item.isPublished });
      Alert.alert('Succès', `"${item.title}" ${!item.isPublished ? 'publié' : 'masqué'}.`);
      loadMedias();
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Impossible de mettre à jour.');
    }
  };

  const deleteMedia = (item: AdminMediaItem) => {
    Alert.alert(
      'Supprimer',
      `Supprimer "${item.title}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await Api.deleteAdminMedia(item.slug);
              Alert.alert('Succès', 'Média supprimé.');
              loadMedias();
            } catch (e: any) {
              Alert.alert('Erreur', e?.message || 'Impossible de supprimer.');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item: m }: { item: AdminMediaItem }) => (
    <View style={styles.mediaCard}>
      <View style={styles.mediaInfo}>
        <View style={styles.mediaTitleRow}>
          <Text style={styles.mediaTitle} numberOfLines={1}>{m.title}</Text>
          <View style={[styles.typeBadge, { backgroundColor: getTypeColor(m.type) + '20' }]}>
            <Text style={[styles.typeText, { color: getTypeColor(m.type) }]}>{m.type}</Text>
          </View>
        </View>
        <Text style={styles.mediaMeta}>
          {m.releaseYear || '—'} · {m.accessLevel === 'PREMIUM' ? '👑 Premium' : '🆓 Gratuit'}
          {m.isPublished ? ' · ✅' : ' · ❌'}
        </Text>
        {m.synopsis ? (
          <Text style={styles.mediaSynopsis} numberOfLines={2}>{m.synopsis}</Text>
        ) : null}
      </View>
      <View style={styles.mediaActions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: m.isPublished ? '#10b98120' : '#f59e0b20' }]}
          onPress={() => togglePublish(m)}
          activeOpacity={0.7}
        >
          {m.isPublished ? (
            <EyeOff color="#f59e0b" size={16} />
          ) : (
            <Eye color="#10b981" size={16} />
          )}
          <Text style={[styles.actionText, { color: m.isPublished ? '#f59e0b' : '#10b981' }]}>
            {m.isPublished ? 'Masquer' : 'Publier'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#ef444420' }]}
          onPress={() => deleteMedia(m)}
          activeOpacity={0.7}
        >
          <Trash2 color="#ef4444" size={16} />
          <Text style={[styles.actionText, { color: '#ef4444' }]}>Supprimer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowLeft color={colors.textPrimary} size={22} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Database color="#3b82f6" size={18} />
            <Text style={styles.headerTitle}>Médias</Text>
            {!loading ? <Text style={styles.countText}>({filteredMedias.length})</Text> : null}
          </View>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.searchWrap}>
          <Search color={colors.textTertiary} size={16} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher..."
            placeholderTextColor={colors.textTertiary}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          style={styles.scroll}
          data={filteredMedias}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={12}
          windowSize={7}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={<Text style={styles.emptyText}>Aucun média trouvé.</Text>}
        />
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 10,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  countText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.muted,
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    paddingVertical: 10,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 40,
    fontSize: 15,
  },
  list: {
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 10,
  },
  mediaCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  mediaInfo: {
    gap: 4,
  },
  mediaTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mediaTitle: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  mediaMeta: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  mediaSynopsis: {
    color: colors.textTertiary,
    fontSize: 12,
    lineHeight: 16,
  },
  mediaActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
