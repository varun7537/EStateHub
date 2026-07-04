import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// Screens
import { SplashScreen } from './modules/user/screens/SplashScreen';
import { WelcomeScreen } from './modules/user/screens/WelcomeScreen';
import LoginScreen from './modules/auth/screens/LoginScreen';
import RegisterScreen from './modules/auth/screens/RegisterScreen';
import OTPVerificationScreen from './modules/auth/screens/OTPVerificationScreen';
import ForgotPassword from './modules/auth/screens/ForgotPassword';
import HomeScreen from './modules/user/screens/HomeScreen';
import ProfileScreen from './modules/user/screens/ProfileScreen';
import PropertyDetailScreen from './modules/property/screens/PropertyDetailScreen';
import SearchResultsScreen from './modules/property/screens/SearchResultsScreen';
import ExploreProperties from './modules/property/screens/ExploreProperties';
import BuilderDashboard from './modules/builder/screens/BuilderDashboard';
import BuilderRequestListScreen from './modules/builder/screens/BuilderRequestListScreen';
import BuilderRequestDetailScreen from './modules/builder/screens/BuilderRequestDetailScreen';
import ReportPropertyScreen from './modules/property/screens/ReportPropertyScreen';
import AddProperty from './modules/property/screens/AddProperties';
import BuilderInquiriesScreen from './modules/builder/screens/BuilderInquiriesScreen';
import PaymentScreen from './store/PaymentScreen';
import ChatScreen from './modules/chat/screens/ChatScreen';
import ChatListScreen from './modules/chat/screens/ChatListScreen';
import AddPropertiesAgent from './modules/property/screens/AddPropertiesAgent';
import AgentDashboard from './modules/agent/AgentDashboardScreen';
import MyListingsScreen from './modules/property/screens/MyListingsScreen';
import UserNavigator from './navigation/UserNavigator';
import FavoritesScreen from './modules/user/screens/FavoritesScreen';
import AssignAgentScreen from './modules/builder/screens/AssignAgentScreen';
import AgentNotificationsScreen from './modules/agent/AgentNotificationsScreen';
import BuilderNotificationsScreen from './modules/builder/screens/BuilderNotificationsScreen';
// ── NEW: Schedule Viewing & Virtual Tour screens ──────────────────────────────
import ScheduleViewingScreen from './modules/property/screens/ScheduleViewingScreen';
import VirtualTourScreen from './modules/property/screens/VirtualTourScreen';
import AgentInquiriesScreen from './modules/agent/AgentInquiriesScreen';
import AgentProfile from './modules/agent/AgentProfile';
// ─────────────────────────────────────────────────────────────────────────────

// Auth & API utilities
import { authTokenManager } from './utils/authTokenManager';
import { apiGet } from './utils/apiClient';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('splash');
  const [screenStack, setScreenStack] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [searchQuery, setSearchQuery] = useState(null);
  const [messageCount, setMessageCount] = useState(0);
  const [reportPropertyData, setReportPropertyData] = useState(null);
  const [paymentData, setPaymentData] = useState(null);
  const [chatData, setChatData] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isAppReady, setIsAppReady] = useState(false);

  // ── NEW: state for ScheduleViewing & VirtualTour params ───────────────────
  const [scheduleViewingData, setScheduleViewingData] = useState(null);
  const [virtualTourData, setVirtualTourData] = useState(null);
  // ─────────────────────────────────────────────────────────────────────────

  // ─────────────────────────────────────────────
  // 1. Initialize app: load token + user from storage
  // ─────────────────────────────────────────────
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await authTokenManager.initialize();

        const savedUser = await AsyncStorage.getItem('user');
        if (savedUser) {
          const parsedUser = JSON.parse(savedUser);
          setUserData(parsedUser);
        }
      } catch (e) {
        console.error('[App] Failed to initialize app session:', e);
      } finally {
        setIsAppReady(true);
      }
    };

    initializeApp();
  }, []);

  // ─────────────────────────────────────────────
  // 2. Fetch unread message count (protected route)
  // ─────────────────────────────────────────────
  const fetchUnreadCount = useCallback(async () => {
    if (!authTokenManager.isAuthenticated()) return;

    try {
      const data = await apiGet('/chats', {
        onUnauthorized: resetApp,
      });

      if (Array.isArray(data)) {
        const totalUnread = data.reduce(
          (sum, chat) => sum + (chat.unread || 0),
          0
        );
        setMessageCount(totalUnread);
      }
    } catch (err) {
      if (err.status === 0) {
        console.warn('[App] Network error fetching unread count:', err.message);
      } else if (err.status !== 401) {
        console.error('[App] Failed to fetch unread count:', err);
      }
    }
  }, []);

  useEffect(() => {
    if (!userData) return;
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [userData, fetchUnreadCount]);

  // ─────────────────────────────────────────────
  // 3. Splash screen timeout fallback
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (currentScreen === 'splash') {
      const timer = setTimeout(() => {
        setCurrentScreen('welcome');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [currentScreen]);

  // ─────────────────────────────────────────────
  // 4. Navigation
  // ─────────────────────────────────────────────
  const navigateTo = useCallback((screen, params = {}) => {
    const normalizedScreen =
      screen === 'PropertyDetailScreen' ? 'propertyDetail' : screen;

    if (normalizedScreen === 'propertyDetail' && !params.property) {
      console.warn('[App] Tried to open propertyDetail without property data.');
      return;
    }

    if (normalizedScreen !== 'propertyDetail') {
      setSelectedProperty(null);
    }

    setScreenStack((prev) => [...prev, currentScreen]);
    setCurrentScreen(normalizedScreen);

    // Property detail
    if (normalizedScreen === 'propertyDetail') {
      setSelectedProperty(params.property);
    }

    if (params.requestId !== undefined) setSelectedRequestId(params.requestId);
    if (params.query !== undefined) setSearchQuery(params.query);

    // Report property params
    if (
      params.propertyId ||
      params.propertyName ||
      params.propertyAddress ||
      params.propertyPrice ||
      params.propertyImage
    ) {
      setReportPropertyData({
        propertyId: params.propertyId,
        propertyName: params.propertyName,
        propertyAddress: params.propertyAddress,
        propertyPrice: params.propertyPrice,
        propertyImage: params.propertyImage,
      });
    }

    if (params.propertyPrice) {
      setPaymentData({
        propertyId: params.propertyId,
        propertyName: params.propertyName,
        propertyPrice: params.propertyPrice,
      });
    }

    if (normalizedScreen === 'chat') {
      setChatData({
        chatId: params.chatId,
        inquiryId: params.inquiryId,
      });
    }

    // ── NEW: capture params for ScheduleViewing ───────────────────────────
    if (normalizedScreen === 'ScheduleViewing') {
      setScheduleViewingData({
        propertyId: params.propertyId,
        propertyName: params.propertyName,
        propertyAddress: params.propertyAddress,
        propertyPrice: params.propertyPrice,
        propertyImage: params.propertyImage,
      });
    }

    // ── NEW: capture params for VirtualTour ───────────────────────────────
    if (normalizedScreen === 'VirtualTour') {
      setVirtualTourData({
        propertyId: params.propertyId,
        propertyName: params.propertyName,
        propertyAddress: params.propertyAddress,
        propertyImages: params.propertyImages,
      });
    }
    // ─────────────────────────────────────────────────────────────────────
  }, [currentScreen]);

  const goBack = useCallback(() => {
    setScreenStack((prev) => {
      if (prev.length === 0) {
        setCurrentScreen('home');
        return prev;
      }
      const last = prev[prev.length - 1];
      setCurrentScreen(last);
      return prev.slice(0, -1);
    });
  }, []);

  // ─────────────────────────────────────────────
  // 5. Logout / Reset
  // ─────────────────────────────────────────────
  const resetApp = useCallback(async () => {
    try {
      await authTokenManager.clearToken();
      await AsyncStorage.multiRemove(['user', 'userRole', 'userId', 'loginMethod']);
      setUserData(null);
      setScreenStack([]);
      setCurrentScreen('welcome');
      setSelectedProperty(null);
      setSelectedRequestId(null);
      setReportPropertyData(null);
      setPaymentData(null);
      setChatData(null);
      setScheduleViewingData(null);
      setVirtualTourData(null);
      setMessageCount(0);
    } catch (e) {
      console.error('[App] Error during logout:', e);
    }
  }, []);

  // ─────────────────────────────────────────────
  // 6. Login Success Handler
  // ─────────────────────────────────────────────
  const handleLoginSuccess = useCallback(async (user, token) => {
    if (token) {
      await authTokenManager.setToken(token);
    }
    if (user) {
      await AsyncStorage.setItem('user', JSON.stringify(user));
      setUserData(user);
    }
    navigateTo('home');
  }, [navigateTo]);

  const navigation = useMemo(
    () => ({ navigate: navigateTo, goBack }),
    [navigateTo, goBack]
  );

  const showNavbarScreens = [
    'home', 'messages', 'profile', 'searchResults',
    'favorites', 'builderDashboard', 'agentDashboard',
  ];

  // ─────────────────────────────────────────────
  // 7. Screen Renderer
  // ─────────────────────────────────────────────
  const renderScreen = () => {
    switch (currentScreen) {
      case 'splash':
        return <SplashScreen onComplete={() => setCurrentScreen('welcome')} />;

      case 'welcome':
        return (
          <WelcomeScreen
            onGetStarted={() => navigateTo('register')}
            onExploreAsBuilder={() => navigateTo('exploreProperties')}
            onNavigateToLogin={() => navigateTo('login')}
          />
        );

      case 'login':
        return (
          <LoginScreen
            navigation={navigation}
            onBack={goBack}
            onNavigateToLoginSuccess={handleLoginSuccess}
            onForgotPassword={() => navigateTo('forgotPassword')}
            onRegister={() => navigateTo('register')}
          />
        );

      case 'register':
        return (
          <RegisterScreen
            navigation={navigation}
            onBack={goBack}
            onRegisterSuccess={(user) => {
              if (user) setUserData(user);
              navigateTo('otp');
            }}
            onNavigateToLogin={() => navigateTo('login')}
          />
        );

      case 'otp':
        return (
          <OTPVerificationScreen
            navigation={navigation}
            onBack={goBack}
            onVerifySuccess={() => navigateTo('home')}
          />
        );

      case 'forgotPassword':
        return (
          <ForgotPassword
            navigation={navigation}
            onBack={goBack}
            onResetSuccess={() => navigateTo('login')}
          />
        );

      case 'home':
        return (
          <HomeScreen
            navigation={navigation}
            userName={userData?.name}
            onProfilePress={() => navigateTo('profile')}
            onLogout={resetApp}
            onSearch={(query) => navigateTo('searchResults', { query })}
            onPropertyClick={(property) => navigateTo('propertyDetail', { property })}
          />
        );

      case 'profile':
        return (
          <ProfileScreen
            navigation={navigation}
            userName={userData?.name}
            userEmail={userData?.email}
            userPhone={userData?.phone}
            onBack={goBack}
            onLogout={resetApp}
          />
        );

      case 'propertyDetail':
        return (
          <PropertyDetailScreen
            navigation={navigation}
            onBack={goBack}
            user={userData}
            route={{ params: { property: selectedProperty } }}
          />
        );

      case 'searchResults':
        return (
          <SearchResultsScreen
            navigation={navigation}
            searchQuery={searchQuery}
            onBack={goBack}
            onPropertyClick={(property) => navigateTo('propertyDetail', { property })}
          />
        );

      case 'exploreProperties':
        return (
          <ExploreProperties
            navigation={navigation}
            onBack={goBack}
            onPropertyClick={(property) => navigateTo('propertyDetail', { property })}
          />
        );

      case 'builderDashboard':
        return (
          <BuilderDashboard
            navigation={navigation}
            builderName={userData?.name}
            onBack={goBack}
            onPropertyClick={(property) => navigateTo('propertyDetail', { property })}
            onAddProperty={() => navigateTo('addProperty')}
            onAssignAgent={() => navigateTo('assignAgent')}
          />
        );

      case 'assignAgent':
        return <AssignAgentScreen navigation={navigation} onBack={goBack} />;

      case 'builderInquiries':
        return <BuilderInquiriesScreen navigation={navigation} onBack={goBack} />;

      case 'builderRequests':
        return <BuilderRequestListScreen navigation={navigation} onBack={goBack} />;

      case 'builderRequestDetail':
        return (
          <BuilderRequestDetailScreen
            navigation={navigation}
            onBack={goBack}
            requestId={selectedRequestId}
          />
        );

      case 'agentDashboard':
        return (
          <AgentDashboard
            navigation={navigation}
            agentName={userData?.name}
            onBack={goBack}
          />
        );

      case 'agentNotifications':
        return <AgentNotificationsScreen navigation={navigation} onBack={goBack} />;

      case 'builderNotifications':
        return <BuilderNotificationsScreen navigation={navigation} onBack={goBack} />;

      case 'addProperty':
        return (
          <AddProperty
            onBack={goBack}
            onPropertyAdded={() => navigateTo('builderDashboard')}
          />
        );

      case 'addPropertyAgent':
        return (
          <AddPropertiesAgent
            onBack={goBack}
            onPropertyAdded={() => navigateTo('agentDashboard')}
          />
        );

      case 'myListings':
        return (
          <MyListingsScreen navigation={{ navigate: navigateTo, goBack }} />
        );

      case 'ReportPropertyScreen':
        return (
          <ReportPropertyScreen
            navigation={navigation}
            onBack={goBack}
            route={{
              params: {
                propertyId: reportPropertyData?.propertyId,
                propertyName: reportPropertyData?.propertyName,
                propertyAddress: reportPropertyData?.propertyAddress,
                propertyPrice: reportPropertyData?.propertyPrice,
                propertyImage: reportPropertyData?.propertyImage,
              },
            }}
          />
        );

      case 'PaymentScreen':
        return (
          <PaymentScreen
            navigation={navigation}
            onBack={goBack}
            route={{
              params: {
                propertyId: paymentData?.propertyId,
                propertyName: paymentData?.propertyName,
                propertyPrice: paymentData?.propertyPrice,
              },
            }}
          />
        );

      case 'chat':
        return (
          <ChatScreen
            navigation={navigation}
            onBack={goBack}
            route={{
              params: {
                chatId: chatData?.chatId,
                inquiryId: chatData?.inquiryId,
              },
            }}
            user={userData}
          />
        );

      case 'messages':
        return (
          <ChatListScreen
            navigation={navigation}
            onBack={goBack}
            user={userData}
          />
        );

      case 'favorites':
        return <FavoritesScreen navigation={navigation} onBack={goBack} />;

      // ── NEW: Schedule Viewing screen ──────────────────────────────────────
      case 'ScheduleViewingScreen':
        return (
          <ScheduleViewingScreen
            navigation={navigation}
            onBack={goBack}
            route={{
              params: {
                propertyId: scheduleViewingData?.propertyId,
                propertyName: scheduleViewingData?.propertyName,
                propertyAddress: scheduleViewingData?.propertyAddress,
                propertyPrice: scheduleViewingData?.propertyPrice,
                propertyImage: scheduleViewingData?.propertyImage,
              },
            }}
          />
        );

      // ── NEW: Virtual Tour screen ───────────────────────────────────────────
      case 'VirtualTourScreen':
        return (
          <VirtualTourScreen
            navigation={navigation}
            onBack={goBack}
            route={{
              params: {
                propertyId: virtualTourData?.propertyId,
                propertyName: virtualTourData?.propertyName,
                propertyAddress: virtualTourData?.propertyAddress,
                propertyImages: virtualTourData?.propertyImages,
              },
            }}
          />
        );
      // ─────────────────────────────────────────────────────────────────────

      default:
        console.warn('[App] Unknown screen:', currentScreen);
        return (
          <WelcomeScreen
            onGetStarted={() => navigateTo('register')}
            onExploreAsBuilder={() => navigateTo('exploreProperties')}
            onNavigateToLogin={() => navigateTo('login')}
          />
        );
    }
  };

  if (!isAppReady) return null;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <View style={styles.container}>
          {renderScreen()}
          {showNavbarScreens.includes(currentScreen) && (
            <UserNavigator
              activeTab={currentScreen}
              onTabPress={(tab) => {
                const tabMap = {
                  home: 'home',
                  search: 'searchResults',
                  favorites: 'favorites',
                  messages: 'messages',
                  profile: 'profile',
                };
                if (tabMap[tab]) navigation.navigate(tabMap[tab]);
              }}
              messageCount={messageCount}
              userRole={userData?.role}
            />
          )}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});