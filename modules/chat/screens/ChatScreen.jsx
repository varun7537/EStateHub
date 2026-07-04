import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ChevronLeft,
  Send,
  Mic,
  Plus,
  Home,
  Check,
  CheckCheck,
  BadgeCheck,
} from 'lucide-react-native';
import { API_BASE_URL } from '../../../utils/api';

const BRAND = '#2D6A4F';
const BRAND_DARK = '#1B4332';

// ---------- Presentational helpers (no logic/behavior change) ----------

const formatTime = (ts) =>
  new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const formatDateLabel = (ts) => {
  const date = new Date(ts);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (a, b) =>
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear();

  if (isSameDay(date, today)) return 'Today';
  if (isSameDay(date, yesterday)) return 'Yesterday';
  return date.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
};

// Groups consecutive messages from the same sender + inserts date separators.
// Purely presentational — does not touch fetch/send logic.
const buildTimeline = (messages) => {
  const items = [];
  let lastDateLabel = null;
  let lastSenderId = null;

  messages.forEach((msg, index) => {
    const dateLabel = formatDateLabel(msg.timestamp);
    if (dateLabel !== lastDateLabel) {
      items.push({ type: 'separator', id: `sep-${index}`, label: dateLabel });
      lastDateLabel = dateLabel;
      lastSenderId = null;
    }

    const isGroupStart = String(msg.sender_id) !== String(lastSenderId);
    const next = messages[index + 1];
    const isGroupEnd =
      !next ||
      String(next.sender_id) !== String(msg.sender_id) ||
      formatDateLabel(next.timestamp) !== dateLabel;

    items.push({ type: 'message', id: msg.id || `msg-${index}`, msg, isGroupStart, isGroupEnd });
    lastSenderId = msg.sender_id;
  });

  return items;
};

const initialsFrom = (title) => {
  if (!title) return 'P';
  const words = title.trim().split(' ');
  return (words[0]?.[0] || 'P').toUpperCase();
};

// ---------- Message bubble ----------

const MessageBubble = ({ message, isUser, isGroupEnd }) => {
  return (
    <View
      style={[
        styles.messageRow,
        isUser ? styles.userMessageRow : styles.agentMessageRow,
      ]}
    >
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.agentBubble,
          isUser
            ? isGroupEnd
              ? styles.userBubbleTail
              : styles.userBubbleStacked
            : isGroupEnd
            ? styles.agentBubbleTail
            : styles.agentBubbleStacked,
        ]}
      >
        <Text style={[styles.messageText, isUser ? styles.userText : styles.agentText]}>
          {message.message}
        </Text>
      </View>

      {isGroupEnd && (
        <View style={[styles.messageMeta, isUser && styles.messageMetaUser]}>
          <Text style={styles.timestamp}>{formatTime(message.timestamp)}</Text>
          {isUser && <CheckCheck color={BRAND} size={13} strokeWidth={2.5} style={{ marginLeft: 3 }} />}
        </View>
      )}
    </View>
  );
};

const DateSeparator = ({ label }) => (
  <View style={styles.dateSeparatorRow}>
    <View style={styles.dateSeparatorLine} />
    <Text style={styles.dateSeparatorText}>{label}</Text>
    <View style={styles.dateSeparatorLine} />
  </View>
);

export default function ChatScreen({ navigation, onBack, route, user: propUser }) {
  const { chatId, inquiryId } = route.params || {};
  const [user, setUser] = useState(propUser);

  useEffect(() => {
    if (propUser) setUser(propUser);
  }, [propUser]);

  useEffect(() => {
    const ensureUser = async () => {
      if (!user) {
        try {
          const savedUser = await AsyncStorage.getItem('user');
          if (savedUser) {
            const parsed = JSON.parse(savedUser);
            setUser(parsed);
            console.log("🟢 RESTORED USER FROM STORAGE:", parsed.id);
          }
        } catch (e) {
          console.error("Failed to restore user:", e);
        }
      }
    };
    ensureUser();
  }, [user]);

  console.log("🟢 CHAT SCREEN PARAMS:", route?.params);
  console.log("🟢 CHAT ID:", chatId);
  console.log("🟢 CURRENT USER ID:", user?.id);

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [chatContext, setChatContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const scrollViewRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!chatId) return;

    let isMounted = true;

    const loadMessages = async () => {
      if (isMounted) await fetchMessages();
    };

    loadMessages();

    const interval = setInterval(loadMessages, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [chatId]);

  useEffect(() => {
    // Keyboard listeners moved to KeyboardAvoidingView management
  }, [chatId]);

  const fetchMessages = async () => {
    if (!chatId) {
      console.warn("⚠️ fetchMessages called without chatId");
      return;
    }
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/chats/${chatId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success || Array.isArray(data)) {
        const msgs = Array.isArray(data) ? data : (data.messages || []);
        if (data.chatContext) setChatContext(data.chatContext);
        setMessages(msgs);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!message.trim()) return;

    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/chats/${chatId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message })
      });

      if (response.ok) {
        setMessage('');
        fetchMessages();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const handleCloseDeal = async () => {
    try {
      const effectiveInquiryId = inquiryId || chatContext?.inquiry_id;
      if (!effectiveInquiryId) {
        Alert.alert('Error', 'Inquiry information missing');
        return;
      }

      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/inquiries/${effectiveInquiryId}/close-deal`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        Alert.alert('Success', 'Deal closed successfully! 🎉');
        fetchMessages();
      } else {
        Alert.alert('Error', data.message || 'Failed to close deal');
      }
    } catch (error) {
      console.error('Close deal error:', error);
      Alert.alert('Error', 'Failed to connect to server');
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const isResponsibleParty = user?.role === 'builder' || user?.role === 'developer' || user?.role === 'agent';
  const otherPartyName = chatContext ? (user?.id === chatContext.user1_id ? 'Recipient' : chatContext.sender_name || 'User') : 'Chat';
  const showCloseDeal = isResponsibleParty && chatContext?.inquiry_status === 'accepted';
  const isDealClosed = chatContext?.inquiry_status === 'deal_closed';

  const myId = user?.id || propUser?.id;
  const timeline = buildTimeline(messages);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <StatusBar barStyle="light-content" backgroundColor={BRAND_DARK} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigation.navigate('messages')}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <ChevronLeft color="#FFFFFF" size={22} strokeWidth={2.5} />
          </TouchableOpacity>

          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>{initialsFrom(chatContext?.property_title)}</Text>
          </View>

          <View style={styles.headerTextBlock}>
            <Text style={styles.agentName} numberOfLines={1}>
              {chatContext?.property_title || 'Property Chat'}
            </Text>
            <View style={styles.headerSubRow}>
              <Home color="rgba(255,255,255,0.75)" size={11} strokeWidth={2.2} />
              <Text style={styles.agentStatus} numberOfLines={1}>
                {chatContext?.property_price ? `  $${chatContext.property_price}` : '  Property inquiry'}
              </Text>
            </View>
          </View>

          {isDealClosed ? (
            <View style={styles.dealClosedBadge}>
              <BadgeCheck color={BRAND} size={13} strokeWidth={2.5} />
              <Text style={styles.dealClosedText}>Closed</Text>
            </View>
          ) : (
            showCloseDeal && (
              <TouchableOpacity style={styles.closeDealButton} onPress={handleCloseDeal} activeOpacity={0.85}>
                <Text style={styles.closeDealText}>Close Deal</Text>
              </TouchableOpacity>
            )
          )}
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesArea}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={scrollToBottom}
        showsVerticalScrollIndicator={false}
      >
        {timeline.length === 0 && !loading ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Send color={BRAND} size={22} strokeWidth={2} />
            </View>
            <Text style={styles.emptyStateText}>No messages yet</Text>
            <Text style={styles.emptyStateSubtext}>Say hello and start the conversation</Text>
          </View>
        ) : (
          timeline.map((item) => {
            if (item.type === 'separator') {
              return <DateSeparator key={item.id} label={item.label} />;
            }
            const isUser = String(item.msg.sender_id) === String(myId);
            return (
              <MessageBubble
                key={item.id}
                message={item.msg}
                isUser={isUser}
                isGroupEnd={item.isGroupEnd}
              />
            );
          })
        )}
      </ScrollView>

      {/* Input */}
      <View style={styles.inputBar}>
        <View style={styles.inputPill}>
          <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
            <Plus color="#6B7280" size={20} strokeWidth={2.2} />
          </TouchableOpacity>

          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#9CA3AF"
            value={message}
            onChangeText={setMessage}
            multiline
          />

          <TouchableOpacity
            onPress={message.trim() ? handleSend : undefined}
            style={styles.sendButton}
            activeOpacity={0.8}
          >
            {message.trim() ? (
              <Send color="#FFFFFF" size={17} strokeWidth={2.5} />
            ) : (
              <Mic color="#FFFFFF" size={17} strokeWidth={2.2} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F1',
  },

  // Header
  header: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    backgroundColor: BRAND,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: BRAND_DARK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 10,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 10,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  headerTextBlock: {
    flex: 1,
  },
  agentName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  agentStatus: {
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.78)',
  },
  closeDealButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 18,
  },
  closeDealText: {
    color: BRAND,
    fontWeight: '700',
    fontSize: 12,
  },
  dealClosedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 18,
  },
  dealClosedText: {
    color: BRAND,
    fontWeight: '700',
    fontSize: 12,
  },

  // Messages area
  messagesArea: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingTop: 20,
    flexGrow: 1,
  },

  // Date separator
  dateSeparatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    gap: 10,
  },
  dateSeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E5E1',
  },
  dateSeparatorText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#E8F0EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyStateText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
  },

  // Message bubbles
  messageRow: {
    marginBottom: 2,
    maxWidth: '100%',
  },
  userMessageRow: {
    alignItems: 'flex-end',
  },
  agentMessageRow: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 2,
  },
  userBubble: {
    backgroundColor: BRAND,
    borderRadius: 18,
  },
  userBubbleTail: {
    borderBottomRightRadius: 4,
  },
  userBubbleStacked: {
    borderBottomRightRadius: 18,
  },
  agentBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EAECE9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  agentBubbleTail: {
    borderBottomLeftRadius: 4,
  },
  agentBubbleStacked: {
    borderBottomLeftRadius: 18,
  },
  messageText: {
    fontSize: 14.5,
    lineHeight: 20,
  },
  userText: {
    color: '#FFFFFF',
  },
  agentText: {
    color: '#111827',
  },
  messageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  messageMetaUser: {
    flexDirection: 'row',
  },
  timestamp: {
    fontSize: 10.5,
    color: '#9CA3AF',
  },

  // Input bar
  inputBar: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 12,
    backgroundColor: 'transparent',
  },
  inputPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    paddingLeft: 6,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 14.5,
    color: '#111827',
    maxHeight: 90,
    paddingVertical: 6,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: BRAND,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
});