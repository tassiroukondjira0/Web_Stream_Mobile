# 📱 CinéMax Mobile (React Native & Expo)

Application mobile native de streaming vidéo pour CinéMax, connectée à l'API Next.js.

---

## 🚀 Démarrage rapide

### 1. Prérequis
L'intégration AdMob utilise un module natif : **Expo Go ne peut pas afficher les publicités**. Lancez une development build avec `npx expo run:android` / `npx expo run:ios`, ou créez-la avec EAS.

### 2. Configuration de l'API
Le fichier `.env` est déjà configuré :
```env
EXPO_PUBLIC_API_URL=https://web-stream-mncx.onrender.com
```
> Si vous testez avec votre serveur local Next.js :
> - Sur **Android Emulator** : `http://10.0.2.2:3000`
> - Sur **Téléphone physique** : `http://<IP-DE-VOTRE-PC>:3000` (ex: `http://192.168.1.50:3000`)

### 3. Configuration AdMob
Créez les applications Android et iOS dans AdMob avec les identifiants de l'application (`com.cinemax.app`), puis créez des unités publicitaires **Bannière** et **App Open** pour chaque plateforme. Ajoutez les valeurs suivantes à votre `.env` local (ou configurez-les comme variables d'environnement EAS) :

```env
EXPO_PUBLIC_ADMOB_ANDROID_APP_ID=ca-app-pub-...~...
EXPO_PUBLIC_ADMOB_IOS_APP_ID=ca-app-pub-...~...
EXPO_PUBLIC_ADMOB_ANDROID_APP_OPEN_ID=ca-app-pub-.../...
EXPO_PUBLIC_ADMOB_IOS_APP_OPEN_ID=ca-app-pub-.../...
EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID=ca-app-pub-.../...
EXPO_PUBLIC_ADMOB_IOS_BANNER_ID=ca-app-pub-.../...
```

Les **App IDs** se trouvent dans les paramètres de l'application AdMob; les **IDs d'unités** se trouvent dans les détails de chaque bannière ou unité App Open. Ce sont deux types d'identifiants différents. En développement, l'application utilise les unités de test officielles de Google. En production, les annonces restent masquées si l'App ID ou l'unité de la plateforme manque. Les App IDs natifs sont intégrés au build via `app.config.js` : toute modification nécessite un nouveau build natif. L'annonce App Open peut apparaître à l'ouverture après le premier lancement, puis au retour de l'application au premier plan; elle ne s'affiche pas aux comptes Premium ni dans le lecteur vidéo.

Configurez également les messages de confidentialité/consentement UMP dans la console AdMob. L'application présente le formulaire requis avant d'initialiser le SDK et ne demande pas de publicité lorsque le consentement ne l'autorise pas.

### 4. Lancer l'application
Dans ce dossier :
```bash
npm start
```
Lancez l'application sur un appareil ou un émulateur via la development build; Expo Go n'inclut pas le SDK AdMob.

---

## 📂 Structure du projet

- `src/app/` : Écrans et navigation (Expo Router)
  - `index.tsx` : Accueil avec carrousels Films, Séries, Animés
  - `explore.tsx` : Recherche instantanée
  - `media/[id].tsx` : Fiche détaillée (synopsis, affiche, bouton lecture)
  - `player.tsx` : Lecteur vidéo (natif `expo-video` pour HLS/MP4 + repli WebView pour iframes)
  - `login.tsx` : Connexion et profil utilisateur
- `src/services/api.ts` : Client HTTP connecté aux routes Next.js avec jeton Bearer
- `src/context/AuthContext.tsx` : Gestion de la session et stockage sécurisé (SecureStore)
- `src/components/` : Composants réutilisables (`MediaCard`, `MediaRow`, etc.)
