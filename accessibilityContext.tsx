import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { AccessibilityInfo } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";
import { useAuth } from "./authContext";
import { ACCESSIBILITY_STORAGE_KEY } from "./storageKeys";

export type FeedbackType = "success" | "warning" | "error" | "selection" | "impact";

export interface AccessibilitySettings {
  sounds: boolean;
  vibrations: boolean;
  colorBlindMode: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
}

const DEFAULT_SETTINGS: AccessibilitySettings = {
  sounds: true,
  vibrations: true,
  colorBlindMode: false,
  highContrast: false,
  reduceMotion: false,
};

interface AccessibilityContextType {
  /** User + local preferences (when not logged in) */
  settings: AccessibilitySettings;
  /** System: VoiceOver / TalkBack enabled */
  isScreenReaderEnabled: boolean;
  /** System: reduce motion enabled at OS level */
  isReduceMotionEnabled: boolean;
  /** Resolved: use app setting or fallback to system for reduce motion */
  shouldReduceMotion: boolean;
  /** Announce to screen reader (VoiceOver/TalkBack) */
  announce: (message: string) => void;
  /** Haptic + sound feedback; respects settings. Use in event handlers. */
  triggerFeedback: (type?: FeedbackType, options?: { sound?: boolean; vibration?: boolean }) => Promise<void>;
  /** High-contrast + color-blind aware theme */
  theme: {
    text: string;
    textSecondary: string;
    background: string;
    cardBackground: string;
    border: string;
    toggleActive: string;
    toggleInactive: string;
    /** For high contrast: stronger borders and focus rings */
    focusRing?: string;
    /** Primary actions (buttons) */
    primary?: string;
  };
  /** Persist local a11y prefs (e.g. when not logged in) */
  setLocalSettings: (s: Partial<AccessibilitySettings>) => Promise<void>;
}

const getTheme = (colorBlind: boolean, highContrast: boolean) => {
  if (highContrast) {
    return {
      text: "#000000",
      textSecondary: "#333333",
      background: "#FFFFFF",
      cardBackground: "#FFFFFF",
      border: "#000000",
      toggleActive: "#000000",
      toggleInactive: "#666666",
      focusRing: "#000000",
      primary: "#000000",
    };
  }
  if (colorBlind) {
    return {
      text: "#000000",
      textSecondary: "#4A4A4A",
      background: "#F8F9FA",
      cardBackground: "#FFFFFF",
      border: "#000000",
      toggleActive: "#FFD700",
      toggleInactive: "#CCCCCC",
      primary: "#007A5E",
    };
  }
  return {
    text: "#333333",
    textSecondary: "#666666",
    background: "#ffffff",
    cardBackground: "#ffffff",
    border: "#f0f0f0",
    toggleActive: "#007bff",
    toggleInactive: "#ccc",
    primary: "#007A5E",
  };
};

const Context = createContext<AccessibilityContextType | null>(null);

let feedbackSound: Audio.Sound | null = null;

const playFeedbackSound = async () => {
  try {
    if (feedbackSound) {
      await feedbackSound.setPositionAsync(0);
      await feedbackSound.playAsync();
      return;
    }
    const { sound } = await Audio.Sound.createAsync(
      require("./assets/sounds/feedback.mp3")
    );
    feedbackSound = sound;
    await sound.playAsync();
  } catch (e) {
    // ignore
  }
};

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);
  const [isReduceMotionEnabled, setIsReduceMotionEnabled] = useState(false);
  const [localSettings, setLocalSettingsState] = useState<AccessibilitySettings>(DEFAULT_SETTINGS);

  const settings: AccessibilitySettings = {
    sounds: user?.settings?.sounds ?? localSettings.sounds,
    vibrations: user?.settings?.vibrations ?? localSettings.vibrations,
    colorBlindMode: user?.settings?.colorBlindMode ?? localSettings.colorBlindMode,
    highContrast: user?.settings?.highContrast ?? localSettings.highContrast,
    reduceMotion: user?.settings?.reduceMotion ?? localSettings.reduceMotion,
  };

  const shouldReduceMotion = settings.reduceMotion || isReduceMotionEnabled;

  const theme = getTheme(settings.colorBlindMode, settings.highContrast);

  const announce = useCallback((message: string) => {
    AccessibilityInfo.announceForAccessibility(message);
  }, []);

  const triggerFeedback = useCallback(
    async (type: FeedbackType = "success", opts?: { sound?: boolean; vibration?: boolean }) => {
      const doSound = opts?.sound ?? settings.sounds;
      const doVibration = opts?.vibration ?? settings.vibrations;

      if (doVibration) {
        try {
          switch (type) {
            case "success":
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              break;
            case "warning":
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              break;
            case "error":
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              break;
            case "selection":
              await Haptics.selectionAsync();
              break;
            case "impact":
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              break;
            default:
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        } catch (_) {}
      }

      if (doSound && (type === "success" || type === "impact" || type === "selection")) {
        await playFeedbackSound();
      }
    },
    [settings.sounds, settings.vibrations]
  );

  const setLocalSettings = useCallback(async (s: Partial<AccessibilitySettings>) => {
    setLocalSettingsState((prev) => {
      const next = { ...prev, ...s };
      AsyncStorage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  useEffect(() => {
    const sub1 = AccessibilityInfo.addEventListener("screenReaderChanged", setIsScreenReaderEnabled);
    AccessibilityInfo.isScreenReaderEnabled().then(setIsScreenReaderEnabled);

    let sub2: { remove?: () => void } | undefined;
    try {
      const rmx = (AccessibilityInfo as any).isReduceMotionEnabled;
      if (typeof rmx === "function") {
        rmx().then((v: boolean) => setIsReduceMotionEnabled(!!v));
        sub2 = (AccessibilityInfo as any).addEventListener?.("reduceMotionChanged", (v: boolean) => setIsReduceMotionEnabled(!!v));
      }
    } catch (_) {}

    return () => {
      sub1?.remove?.();
      sub2?.remove?.();
    };
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(ACCESSIBILITY_STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as Partial<AccessibilitySettings>;
        setLocalSettingsState((prev) => ({ ...DEFAULT_SETTINGS, ...prev, ...parsed }));
      } catch (_) {}
    });
  }, []);

  const value: AccessibilityContextType = {
    settings,
    isScreenReaderEnabled,
    isReduceMotionEnabled,
    shouldReduceMotion,
    announce,
    triggerFeedback,
    theme,
    setLocalSettings,
  };

  return <Context.Provider value={value}>{children}</Context.Provider>;
};

export const useAccessibility = () => {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useAccessibility must be used within AccessibilityProvider");
  return ctx;
};
