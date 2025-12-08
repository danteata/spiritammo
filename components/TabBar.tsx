import { View, StyleSheet, TouchableOpacity, LayoutAnimation, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '@/hooks/useAppStore';

export default function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { isDark, theme } = useAppStore();

  const backgroundColor = isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.85)';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';

  return (
    <View style={styles.positionWrapper}>
      <View style={styles.shadowWrapper}>
        <BlurView
          intensity={Platform.OS === 'ios' ? 40 : 50}
          tint={isDark ? 'dark' : 'light'}
          style={[styles.container, { backgroundColor, borderColor }]}
        >
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const label =
              options.tabBarLabel !== undefined
                ? options.tabBarLabel
                : options.title !== undefined
                  ? options.title
                  : route.name;

            const isFocused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                // Simple layout animation for the label appearance
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                navigation.navigate(route.name, route.params);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            // Determine Icon
            let iconName: any = 'circle';
            let IconComp = Ionicons;

            if (route.name === 'index') {
              iconName = isFocused ? 'home' : 'home-outline';
            } else if (route.name === 'armory') {
              iconName = isFocused ? 'list' : 'list-outline';
            } else if (route.name === 'training') {
              iconName = isFocused ? 'scan' : 'scan-outline';
            } else if (route.name === 'squad') {
              iconName = isFocused ? 'people' : 'people-outline';
            } else if (route.name === 'campaign') {
              iconName = isFocused ? 'map' : 'map-outline';
            } else if (route.name === 'mission-report') {
              iconName = isFocused ? 'stats-chart' : 'stats-chart-outline';
            } else if (route.name === 'settings') {
              iconName = isFocused ? 'settings' : 'settings-outline';
            }

            const activeColor = theme.accent;
            const inactiveColor = theme.textSecondary;

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={options.tabBarButtonTestID}
                onPress={onPress}
                onLongPress={onLongPress}
                style={styles.tab}
              >
                <View style={[
                  styles.iconContainer,
                  isFocused && {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                    transform: [{ scale: 1.1 }]
                  }
                ]}>
                  <IconComp
                    name={iconName}
                    size={24}
                    color={isFocused ? activeColor : inactiveColor}
                  />
                </View>
                {/* Optional: Show label only if focused? Or always? Let's hide for pure tactical look, or small under. */}
                {/* <ThemedText style={{ fontSize: 10,  color: isFocused ? activeColor : inactiveColor }}>
                                {label as string}
                            </ThemedText> */}
              </TouchableOpacity>
            );
          })}
        </BlurView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  positionWrapper: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  shadowWrapper: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    width: '100%',
    borderRadius: 32,
  },
  container: {
    flexDirection: 'row',
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'space-around',
    overflow: 'hidden',
    borderWidth: 1,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  iconContainer: {
    padding: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  }
});