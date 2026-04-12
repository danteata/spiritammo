import { useRef, useState, Children, isValidElement } from 'react'
import { StyleSheet, View, Platform, Text } from 'react-native'
import { BlurView, BlurTargetView } from 'expo-blur'
import { useAppStore } from '@/hooks/useAppStore'

interface BlurredTextOverlayProps {
  children: React.ReactNode
  containerStyle?: any
  textContainerStyle?: any
}

function extractText(node: React.ReactNode): string {
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (!isValidElement(node)) return ''
  const props = (node.props || {}) as Record<string, any>
  if (typeof props.children === 'string') return props.children
  if (typeof props.children === 'number') return String(props.children)
  if (props.text && typeof props.text === 'string') return props.text
  const parts = Children.map(props.children, (c: any) => extractText(c))
  return parts ? parts.join('') : ''
}

const SMEAR_LAYERS = [
  { dx: 0, dy: 0, r: 10 },
  { dx: -2, dy: -1, r: 8 },
  { dx: 2, dy: -1, r: 8 },
  { dx: -1, dy: 2, r: 8 },
  { dx: 1, dy: 2, r: 8 },
  { dx: -4, dy: -3, r: 6 },
  { dx: 4, dy: -3, r: 6 },
  { dx: -3, dy: 4, r: 6 },
  { dx: 3, dy: 4, r: 6 },
  { dx: -6, dy: 0, r: 5 },
  { dx: 6, dy: 0, r: 5 },
  { dx: 0, dy: -5, r: 5 },
  { dx: 0, dy: 5, r: 5 },
  { dx: -5, dy: -4, r: 4 },
  { dx: 5, dy: -4, r: 4 },
  { dx: -4, dy: 5, r: 4 },
  { dx: 4, dy: 5, r: 4 },
  { dx: -7, dy: -3, r: 4 },
  { dx: 7, dy: 3, r: 4 },
  { dx: -3, dy: 7, r: 4 },
  { dx: 3, dy: 7, r: 4 },
  { dx: -8, dy: 0, r: 3 },
  { dx: 8, dy: 0, r: 3 },
  { dx: 0, dy: -7, r: 3 },
  { dx: 0, dy: 7, r: 3 },
]

export default function BlurredTextOverlay({
  children,
  containerStyle,
  textContainerStyle,
}: BlurredTextOverlayProps) {
  const { isDark, theme } = useAppStore()
  const blurTargetRef = useRef(null)
  const [blurKey, setBlurKey] = useState(0)

  if (Platform.OS === 'ios') {
    return (
      <View style={[styles.wrapper, containerStyle]}>
        <BlurTargetView
          ref={blurTargetRef}
          style={[styles.textContainer, textContainerStyle]}
          onLayout={() => setBlurKey(k => k + 1)}
        >
          {children}
        </BlurTargetView>
        {blurKey > 0 && (
          <BlurView
            key={blurKey}
            blurTarget={blurTargetRef}
            style={styles.blurOverlay}
            intensity={25}
            tint="default"
          />
        )}
      </View>
    )
  }

  const rawText = extractText(children)
  const smearColor = isDark ? 'rgba(150, 170, 210, 0.08)' : 'rgba(50, 60, 90, 0.08)'
  const shadowColor = isDark ? 'rgba(150, 170, 210, 0.15)' : 'rgba(50, 60, 90, 0.15)'

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <View style={[styles.textContainer, styles.hiddenForLayout, textContainerStyle]}>
        {children}
      </View>
      <View style={styles.blurTextLayer} pointerEvents="none">
        {SMEAR_LAYERS.map((layer, i) => (
          <Text
            key={i}
            style={[
              styles.smearText,
              {
                color: smearColor,
                textShadowColor: shadowColor,
                left: layer.dx,
                top: layer.dy,
                textShadowRadius: layer.r,
                opacity: 0.2,
              },
              textContainerStyle,
            ]}
            numberOfLines={5}
          >
            {rawText}
          </Text>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
  },
  textContainer: {
    padding: 2,
  },
  hiddenForLayout: {
    opacity: 0,
  },
  blurTextLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    padding: 2,
  },
  smearText: {
    position: 'absolute',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 26,
    fontSize: 18,
    textShadowOffset: { width: 0, height: 0 },
  },
  blurOverlay: {
    ...StyleSheet.absoluteFill,
  },
})
