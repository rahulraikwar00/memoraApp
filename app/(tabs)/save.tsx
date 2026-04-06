import { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  ScrollView,
  Pressable, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { AudioModule, RecordingPresets, setAudioModeAsync, requestRecordingPermissionsAsync } from 'expo-audio';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBookmarkStore } from '../../stores/useBookmarkStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { generateTags } from '../../lib/tagger';
import { metadataApi } from '../../lib/api';
import TagChip from '../../components/TagChip';

interface Metadata {
  title?: string;
  description?: string;
  image_url?: string;
  domain?: string;
}

type ContentType = 'link' | 'image' | 'note' | 'voice';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function SaveScreen() {
  const router = useRouter();
  const { addBookmark } = useBookmarkStore();
  const { colors, spacing, typography, borderRadius } = useThemeStore();
  
  const [contentType, setContentType] = useState<ContentType>('link');
  const [url, setUrl] = useState('');
  const [noteText, setNoteText] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedAudioUri, setRecordedAudioUri] = useState<string | null>(null);
  const recorderRef = useRef<InstanceType<typeof AudioModule.AudioRecorder> | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scale = useSharedValue(1);

  useEffect(() => {
    checkClipboard();
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  const checkClipboard = async () => {
    try {
      const clipboardContent = await Clipboard.getStringAsync();
      if (isValidUrl(clipboardContent)) {
        setUrl(clipboardContent);
        await fetchMetadata(clipboardContent);
      }
    } catch (e) {
      console.log('Clipboard check failed:', e);
    }
  };

  const isValidUrl = (string: string): boolean => {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const fetchMetadata = async (urlString: string) => {
    try {
      const domain = new URL(urlString).hostname;
      
      try {
        const metadata = await metadataApi.getPreview(urlString);
        setMetadata({
          domain: metadata.domain,
          title: metadata.title || '',
          description: metadata.description || '',
          image_url: metadata.image_url || undefined,
        });
        if (metadata.title) {
          const suggestedTags = generateTags(urlString, metadata.title);
          setTags(suggestedTags);
        }
      } catch (apiError) {
        console.log('Metadata API failed, using fallback:', apiError);
        setMetadata({
          domain,
          title: '',
          description: '',
          image_url: undefined,
        });
        const suggestedTags = generateTags(urlString, '');
        setTags(suggestedTags);
      }
    } catch (e) {
      console.log('Metadata fetch failed:', e);
    }
  };

  const handleUrlSubmit = async () => {
    if (!url.trim()) {
      Alert.alert('Error', 'Please enter a URL');
      return;
    }
    if (!isValidUrl(url)) {
      Alert.alert('Error', 'Please enter a valid URL');
      return;
    }
    setIsLoading(true);
    await fetchMetadata(url);
    setIsLoading(false);
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      const suggestedTags = generateTags('', 'image');
      setTags(suggestedTags);
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your camera');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      const suggestedTags = generateTags('', 'photo');
      setTags(suggestedTags);
    }
  };

  const saveImageToLocal = async (uri: string): Promise<string> => {
    const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
    const dest = `${FileSystem.documentDirectory}images/${filename}`;
    
    const dirInfo = await FileSystem.getInfoAsync(`${FileSystem.documentDirectory}images`);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}images`, { intermediates: true });
    }
    
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  };

  const startRecording = async () => {
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert('Permission Required', 'Please allow microphone access');
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      const recorderClass = (AudioModule as any).AudioRecorder;
      const recorder = new recorderClass(RecordingPresets.HIGH_QUALITY);
      recorderRef.current = recorder;
      
      await recorder.prepareToRecordAsync();
      recorder.record();
      
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      console.log('Failed to start recording:', e);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    const recorder = recorderRef.current;
    if (!recorder) return;

    try {
      setIsRecording(false);
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      await recorder.stop();
      const uri = recorder.uri;
      recorderRef.current = null;

      if (uri) {
        const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.m4a`;
        const dest = `${FileSystem.documentDirectory}voice/${filename}`;
        
        const dirInfo = await FileSystem.getInfoAsync(`${FileSystem.documentDirectory}voice`);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}voice`, { intermediates: true });
        }
        
        await FileSystem.copyAsync({ from: uri, to: dest });
        setRecordedAudioUri(dest);
        
        const suggestedTags = generateTags('', 'voice');
        setTags(suggestedTags);
      }

      await setAudioModeAsync({
        allowsRecording: false,
      });

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      console.log('Failed to stop recording:', e);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      scale.value = withSpring(0.95, { damping: 15 });
      setTimeout(() => {
        scale.value = withSpring(1, { damping: 15 });
      }, 100);

      let localPath: string | null = null;

      if (contentType === 'link') {
        if (!url.trim()) {
          Alert.alert('Error', 'Please enter a URL');
          setIsLoading(false);
          return;
        }
        
        const domain = metadata?.domain || new URL(url).hostname;
        await addBookmark({
          url: url.trim(),
          title: metadata?.title || url,
          description: metadata?.description || null,
          image_url: metadata?.image_url || null,
          domain,
          tags: JSON.stringify(tags),
          is_public: isPublic ? 1 : 0,
          local_path: null,
        });
      } else if (contentType === 'image') {
        if (!selectedImage) {
          Alert.alert('Error', 'Please select an image');
          setIsLoading(false);
          return;
        }
        
        localPath = await saveImageToLocal(selectedImage);
        
        await addBookmark({
          url: '',
          title: noteText || 'Photo',
          description: null,
          image_url: localPath,
          domain: 'local-image',
          tags: JSON.stringify(tags),
          is_public: isPublic ? 1 : 0,
          local_path: localPath,
        });
      } else if (contentType === 'note') {
        if (!noteText.trim()) {
          Alert.alert('Error', 'Please enter some text');
          setIsLoading(false);
          return;
        }
        
        await addBookmark({
          url: '',
          title: noteText.substring(0, 50) + (noteText.length > 50 ? '...' : ''),
          description: noteText,
          image_url: null,
          domain: 'local-note',
          tags: JSON.stringify(tags),
          is_public: isPublic ? 1 : 0,
          local_path: null,
        });
      } else if (contentType === 'voice') {
        if (!recordedAudioUri) {
          Alert.alert('Error', 'Please record something first');
          setIsLoading(false);
          return;
        }
        
        await addBookmark({
          url: '',
          title: `Voice Note (${formatDuration(recordingDuration)})`,
          description: null,
          image_url: null,
          domain: 'local-voice',
          tags: JSON.stringify(tags),
          is_public: isPublic ? 1 : 0,
          local_path: recordedAudioUri,
        });
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setUrl('');
      setNoteText('');
      setTags([]);
      setMetadata(null);
      setIsPublic(false);
      setSelectedImage(null);
      setRecordedAudioUri(null);
      setRecordingDuration(0);

      Alert.alert('Saved!', 'Content saved successfully', [
        { text: 'OK', onPress: () => router.push('/(tabs)') }
      ]);
    } catch {
      Alert.alert('Error', 'Failed to save');
    } finally {
      setIsLoading(false);
    }
  };

  const addTag = (tag: string) => {
    const normalizedTag = tag.toLowerCase().trim();
    if (normalizedTag && !tags.includes(normalizedTag) && tags.length < 6) {
      setTags([...tags, normalizedTag]);
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const canSave = (): boolean => {
    if (isLoading) return false;
    switch (contentType) {
      case 'link':
        return url.trim().length > 0;
      case 'image':
        return selectedImage !== null;
      case 'note':
        return noteText.trim().length > 0;
      case 'voice':
        return recordedAudioUri !== null;
      default:
        return false;
    }
  };

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const renderContentInput = () => {
    switch (contentType) {
      case 'link':
        return (
          <View style={[styles.inputContainer, { marginBottom: spacing.xxl }]}>
            <View style={[styles.urlInputWrapper, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: borderRadius.md }]}>
              <TextInput
                style={[styles.urlInput, { color: colors.textPrimary }]}
                value={url}
                onChangeText={setUrl}
                placeholder="https://example.com"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                onSubmitEditing={handleUrlSubmit}
                returnKeyType="go"
              />
              <Pressable 
                style={styles.pasteButton}
                onPress={checkClipboard}
              >
                <Ionicons name="clipboard-outline" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <Pressable 
              style={[styles.fetchButton, { backgroundColor: colors.accent }]}
              onPress={handleUrlSubmit}
              disabled={isLoading || !url.trim()}
            >
              <Text style={styles.fetchButtonText}>
                {isLoading ? 'Fetching...' : 'Fetch Info'}
              </Text>
            </Pressable>
          </View>
        );

      case 'image':
        return (
          <View style={[styles.inputContainer, { marginBottom: spacing.xxl }]}>
            {selectedImage ? (
              <View style={styles.selectedImageContainer}>
                <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
                <Pressable 
                  style={[styles.removeButton, { backgroundColor: colors.danger }]}
                  onPress={() => setSelectedImage(null)}
                >
                  <Ionicons name="close" size={20} color="#fff" />
                </Pressable>
              </View>
            ) : (
              <View style={[styles.imagePickerButtons, { gap: spacing.md }]}>
                <Pressable 
                  style={[styles.imagePickerButton, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: borderRadius.md }]}
                  onPress={pickImage}
                >
                  <Ionicons name="images-outline" size={32} color={colors.textSecondary} />
                  <Text style={[styles.imagePickerText, { color: colors.textSecondary }]}>Choose from Gallery</Text>
                </Pressable>
                <Pressable 
                  style={[styles.imagePickerButton, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: borderRadius.md }]}
                  onPress={takePhoto}
                >
                  <Ionicons name="camera-outline" size={32} color={colors.textSecondary} />
                  <Text style={[styles.imagePickerText, { color: colors.textSecondary }]}>Take Photo</Text>
                </Pressable>
              </View>
            )}
          </View>
        );

      case 'note':
        return (
          <View style={[styles.inputContainer, { marginBottom: spacing.xxl }]}>
            <TextInput
              style={[styles.noteInput, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: borderRadius.md, color: colors.textPrimary }]}
              value={noteText}
              onChangeText={setNoteText}
              placeholder="Write your note here..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>
        );

      case 'voice':
        return (
          <View style={[styles.inputContainer, { marginBottom: spacing.xxl }]}>
            <View style={[styles.recorderContainer, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: borderRadius.md }]}>
              {recordedAudioUri ? (
                <View style={styles.recordedContainer}>
                  <Ionicons name="checkmark-circle" size={48} color={colors.success} />
                  <Text style={[styles.recordedText, { color: colors.textPrimary }]}>Recording saved</Text>
                  <Text style={[styles.durationText, { color: colors.textSecondary }]}>{formatDuration(recordingDuration)}</Text>
                  <Pressable 
                    style={[styles.reRecordButton, { borderColor: colors.border }]}
                    onPress={() => {
                      setRecordedAudioUri(null);
                      setRecordingDuration(0);
                    }}
                  >
                    <Text style={[styles.reRecordText, { color: colors.textSecondary }]}>Record again</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.recordingControls}>
                  <Pressable 
                    style={[
                      styles.recordButton,
                      { backgroundColor: isRecording ? colors.danger : colors.accent }
                    ]}
                    onPress={isRecording ? stopRecording : startRecording}
                  >
                    <Ionicons 
                      name={isRecording ? 'stop' : 'mic'} 
                      size={40} 
                      color="#fff" 
                    />
                  </Pressable>
                  <Text style={[styles.recordingStatus, { color: colors.textSecondary }]}>
                    {isRecording ? `Recording... ${formatDuration(recordingDuration)}` : 'Tap to record'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={[styles.content, { padding: spacing.lg }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.header, { marginBottom: spacing.xxl }]}>
          <Text style={[styles.title, { color: colors.textPrimary, marginBottom: spacing.xs, ...typography.hero }]}>Save</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary, ...typography.body }]}>Save links or text notes</Text>
        </View>

        <View style={[styles.segmentedControl, { backgroundColor: colors.elevated, marginBottom: spacing.xxl }]}>
          {(['link', 'image', 'note', 'voice'] as ContentType[]).map((type) => (
            <Pressable
              key={type}
              style={[
                styles.segmentButton,
                contentType === type && { backgroundColor: colors.accent }
              ]}
              onPress={() => setContentType(type)}
            >
              <Ionicons 
                name={type === 'link' ? 'link' : type === 'note' ? 'document-text' : type === 'image' ? 'image' : 'mic'} 
                size={18} 
                color={contentType === type ? '#fff' : colors.textSecondary} 
              />
              <Text style={[
                styles.segmentText,
                { color: contentType === type ? '#fff' : colors.textSecondary }
              ]}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {contentType === 'link' && metadata && (
          <View style={[styles.previewSection, { marginBottom: spacing.xxl }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: spacing.md, ...typography.title }]}>Preview</Text>
            <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: borderRadius.md }]}>
              {metadata.image_url && (
                <View style={[styles.previewImagePlaceholder, { backgroundColor: colors.elevated }]}>
                  <Ionicons name="image-outline" size={40} color={colors.textTertiary} />
                </View>
              )}
              <View style={[styles.previewContent, { padding: spacing.md }]}>
                <Text style={[styles.previewDomain, { color: colors.textTertiary }]}>{metadata.domain}</Text>
                <Text style={[styles.previewTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                  {metadata.title || url}
                </Text>
                {metadata.description && (
                  <Text style={[styles.previewDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                    {metadata.description}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        {renderContentInput()}

        <View style={[styles.tagsSection, { marginBottom: spacing.xxl }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: spacing.md, ...typography.title }]}>Tags</Text>
          <View style={[styles.tagsContainer, { gap: spacing.sm }]}>
            {tags.map((tag, index) => (
              <Pressable key={index} onPress={() => removeTag(tag)}>
                <TagChip tag={tag} />
              </Pressable>
            ))}
          </View>
          {tags.length < 6 && (
            <View style={styles.addTagContainer}>
              <TextInput
                style={[styles.tagInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }]}
                placeholder="Add tag..."
                placeholderTextColor={colors.textTertiary}
                onSubmitEditing={(e) => {
                  addTag(e.nativeEvent.text);
                }}
              />
            </View>
          )}
        </View>

        <View style={[styles.toggleSection, { marginBottom: spacing.xxl }]}>
          <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>Make public</Text>
          <Pressable 
            style={[styles.toggle, { backgroundColor: isPublic ? colors.accent : colors.elevated }]}
            onPress={() => setIsPublic(!isPublic)}
          >
            <View style={[styles.toggleThumb, isPublic ? { alignSelf: 'flex-end' } : {}]} />
          </Pressable>
        </View>

        <AnimatedPressable 
          style={[
            styles.saveButton, 
            animatedButtonStyle, 
            { backgroundColor: colors.accent },
            (!canSave() || isLoading) && styles.saveButtonDisabled
          ]}
          onPress={handleSave}
          disabled={!canSave() || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="bookmark" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Save</Text>
            </>
          )}
        </AnimatedPressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {},
  header: {},
  title: {},
  subtitle: {},
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 8,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
  },
  inputContainer: {},
  urlInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 12,
  },
  urlInput: {
    flex: 1,
    fontSize: 15,
    padding: 12,
  },
  pasteButton: {
    padding: 12,
  },
  fetchButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  fetchButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  imagePickerButtons: {
    flexDirection: 'row',
  },
  imagePickerButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  imagePickerText: {
    marginTop: 8,
    fontSize: 13,
  },
  selectedImageContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  selectedImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteInput: {
    minHeight: 150,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
  },
  recorderContainer: {
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
  },
  recordingControls: {
    alignItems: 'center',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  recordingStatus: {
    fontSize: 15,
  },
  recordedContainer: {
    alignItems: 'center',
  },
  recordedText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  durationText: {
    fontSize: 14,
    marginTop: 4,
  },
  reRecordButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 8,
  },
  reRecordText: {
    fontSize: 14,
  },
  previewSection: {},
  sectionTitle: {},
  previewCard: {
    overflow: 'hidden',
    borderWidth: 1,
  },
  previewImagePlaceholder: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewContent: {},
  previewDomain: {
    fontSize: 13,
    marginBottom: 4,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 4,
  },
  previewDescription: {
    fontSize: 15,
  },
  tagsSection: {},
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  addTagContainer: {
    flexDirection: 'row',
  },
  tagInput: {
    fontSize: 15,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    maxWidth: 150,
  },
  toggleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 15,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    padding: 20,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});