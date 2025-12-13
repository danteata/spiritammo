import React from 'react'
import {
    StyleSheet,
    View,
    TouchableOpacity,
    ScrollView,
    ImageBackground,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { FontAwesome5 } from '@expo/vector-icons'
import { useAppStore } from '@/hooks/useAppStore'
import { ThemedText } from '@/components/Themed'
import { Campaign, CampaignNode } from '@/types/campaign'
import Svg, { Line } from 'react-native-svg'

interface CampaignMapProps {
    campaign: Campaign
    onNodeSelect: (node: CampaignNode) => void
}

const MAP_WIDTH = 390 // Typical phone width
const MAP_HEIGHT = 550 // Usable map height

export default function CampaignMap({ campaign, onNodeSelect }: CampaignMapProps) {
    const { theme, isDark } = useAppStore()

    // Convert percentage coordinates to actual pixel positions
    const getNodePosition = (node: CampaignNode) => {
        return {
            x: (node.coordinate.x / 100) * MAP_WIDTH,
            y: (node.coordinate.y / 100) * MAP_HEIGHT,
        }
    }

    const renderConnectors = () => {
        const lines = []

        for (let i = 0; i < campaign.nodes.length - 1; i++) {
            const currentNode = campaign.nodes[i]
            const nextNode = campaign.nodes[i + 1]

            const start = getNodePosition(currentNode)
            const end = getNodePosition(nextNode)

            // Determine line color based on node status
            let strokeColor = 'rgba(255,255,255,0.2)'
            let strokeWidth = 2

            if (currentNode.status === 'CONQUERED' && nextNode.status === 'CONQUERED') {
                strokeColor = theme.success || '#10B981'
                strokeWidth = 3
            } else if (currentNode.status === 'CONQUERED' && nextNode.status === 'ACTIVE') {
                strokeColor = theme.accent || '#F59E0B'
                strokeWidth = 3
            } else if (currentNode.status === 'CONQUERED') {
                strokeColor = 'rgba(255,255,255,0.4)'
                strokeWidth = 2
            }

            lines.push(
                <Line
                    key={`connector-${currentNode.id}-${nextNode.id}`}
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={currentNode.status === 'LOCKED' ? '5,5' : undefined}
                />
            )
        }

        return (
            <Svg style={StyleSheet.absoluteFill} width={MAP_WIDTH} height={MAP_HEIGHT}>
                {lines}
            </Svg>
        )
    }

    const renderNode = (node: CampaignNode, index: number) => {
        const position = getNodePosition(node)

        // Status Styles
        let nodeColor = theme.textSecondary || '#6B7280'
        let iconName: any = 'lock'
        let opacity = 0.5
        let scale = 1
        let glow = false

        if (node.status === 'ACTIVE') {
            nodeColor = theme.accent || '#F59E0B'
            iconName = 'map-marker-alt'
            opacity = 1
            scale = 1.15
            glow = true
        } else if (node.status === 'CONQUERED') {
            nodeColor = theme.success || '#10B981'
            iconName = 'check-circle'
            opacity = 1
            glow = true
        }

        return (
            <View key={node.id}>
                {/* Node Button */}
                <TouchableOpacity
                    style={[
                        styles.node,
                        {
                            left: position.x - 25, // Center the 50px node
                            top: position.y - 25,
                            backgroundColor: isDark ? 'rgba(30,41,59,0.95)' : 'rgba(255,255,255,0.95)',
                            borderColor: nodeColor,
                            opacity,
                            transform: [{ scale }]
                        }
                    ]}
                    onPress={() => onNodeSelect(node)}
                    activeOpacity={0.8}
                >
                    {glow && (
                        <View style={[
                            styles.nodeGlow,
                            {
                                borderColor: nodeColor,
                                shadowColor: nodeColor,
                            }
                        ]} />
                    )}
                    <FontAwesome5 name={iconName} size={20} color={nodeColor} />
                </TouchableOpacity>

                {/* Node Label Below */}
                <View style={[
                    styles.nodeLabel,
                    {
                        left: position.x,
                        top: position.y + 35,
                    }
                ]}>
                    <ThemedText
                        variant="caption"
                        style={[
                            styles.nodeLabelText,
                            {
                                fontWeight: node.status === 'ACTIVE' ? '700' : '400',
                                color: node.status === 'LOCKED'
                                    ? (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)')
                                    : undefined
                            }
                        ]}
                    >
                        {node.title}
                    </ThemedText>
                </View>

                {/* Accuracy Badge Above Active/Conquered Nodes */}
                {node.status !== 'LOCKED' && (
                    <View style={[
                        styles.nodeDetails,
                        {
                            left: position.x,
                            top: position.y - 40,
                        }
                    ]}>
                        <LinearGradient
                            colors={
                                node.status === 'ACTIVE'
                                    ? ['rgba(245,158,11,0.9)', 'rgba(217,119,6,0.9)']
                                    : ['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.6)']
                            }
                            style={styles.detailsBadge}
                        >
                            <ThemedText
                                variant="caption"
                                style={[
                                    styles.accuracyText,
                                    { color: node.status === 'ACTIVE' ? '#FFF' : theme.accent }
                                ]}
                            >
                                {node.requiredAccuracy}% ACC
                            </ThemedText>
                        </LinearGradient>
                    </View>
                )}
            </View>
        )
    }

    return (
        <View style={styles.container}>
            <ImageBackground
                source={require('@/assets/images/icon.png')}
                style={styles.mapBackground}
                imageStyle={{ opacity: 0.03, resizeMode: 'repeat' }}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.mapContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Map Container with fixed dimensions */}
                    <View style={[styles.mapContainer, { width: MAP_WIDTH, height: MAP_HEIGHT }]}>
                        {/* Grid Overlay for visual effect */}
                        <View style={styles.gridOverlay} />

                        {/* SVG Connectors Layer */}
                        {renderConnectors()}

                        {/* Nodes Layer */}
                        {campaign.nodes.map(renderNode)}
                    </View>

                    {/* Extra padding at bottom */}
                    <View style={{ height: 100 }} />
                </ScrollView>
            </ImageBackground>

            {/* Campaign Info Overlay - Fixed at bottom */}
            <View style={[
                styles.infoOverlay,
                {
                    backgroundColor: isDark
                        ? 'rgba(15,23,42,0.95)'
                        : 'rgba(255,255,255,0.95)',
                    borderTopColor: isDark
                        ? 'rgba(255,255,255,0.1)'
                        : 'rgba(0,0,0,0.1)'
                }
            ]}>
                <ThemedText variant="heading" style={styles.campaignTitle}>
                    {campaign.title}
                </ThemedText>
                <ThemedText variant="body" style={styles.campaignProgress}>
                    PROGRESS: {campaign.completedNodes} / {campaign.totalNodes} SECTORS SECURED
                </ThemedText>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        overflow: 'hidden',
        borderRadius: 16,
    },
    mapBackground: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    mapContent: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    mapContainer: {
        position: 'relative',
        overflow: 'visible',
    },
    gridOverlay: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        borderRadius: 8,
    },
    node: {
        position: 'absolute',
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 3,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 8,
    },
    nodeGlow: {
        position: 'absolute',
        top: -4,
        left: -4,
        right: -4,
        bottom: -4,
        borderRadius: 29,
        borderWidth: 2,
        opacity: 0.5,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 8,
        elevation: 10,
    },
    nodeLabel: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
        width: 100,
        marginLeft: -50, // Center horizontally
        zIndex: 9,
    },
    nodeLabelText: {
        fontSize: 11,
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    nodeDetails: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
        width: 80,
        marginLeft: -40, // Center horizontally
        zIndex: 11,
    },
    detailsBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 65,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
        elevation: 3,
    },
    accuracyText: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    infoOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
    },
    campaignTitle: {
        textAlign: 'center',
        marginBottom: 4,
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 1,
    },
    campaignProgress: {
        textAlign: 'center',
        opacity: 0.7,
        fontSize: 11,
        letterSpacing: 0.5,
    }
})
