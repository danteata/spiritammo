import React from 'react'
import {
    StyleSheet,
    View,
    TouchableOpacity,
    ScrollView,
    Image,
    Dimensions,
    ImageBackground,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons'
import { MILITARY_TYPOGRAPHY } from '@/constants/colors'
import { useAppStore } from '@/hooks/useAppStore'
import { ThemedText, ThemedCard } from '@/components/Themed'
import { Campaign, CampaignNode } from '@/types/campaign'

interface CampaignMapProps {
    campaign: Campaign
    onNodeSelect: (node: CampaignNode) => void
}

const { width } = Dimensions.get('window')
const MAP_HEIGHT = 600

export default function CampaignMap({ campaign, onNodeSelect }: CampaignMapProps) {
    const { theme, isDark } = useAppStore()

    const renderNode = (node: CampaignNode, index: number) => {
        // Coordinate system: x is percentage (0-100), y is percentage from top (0-100)
        // Flip Y so 0 is bottom for visual progression? No, let's keep it simple: 0 top, 100 bottom.
        // Actually, "Start" usually at bottom. Let's assume input coords are Top-Left percentage.

        // Status Styles
        let nodeColor = theme.textSecondary
        let iconName = 'lock'
        let opacity = 0.5
        let scale = 1

        if (node.status === 'ACTIVE') {
            nodeColor = theme.accent // Ongoing mission
            iconName = 'map-marker-alt'
            opacity = 1
            scale = 1.2
        } else if (node.status === 'CONQUERED') {
            nodeColor = theme.primary // Completed
            iconName = 'star'
            opacity = 1
            scale = 1
        }

        return (
            <React.Fragment key={node.id}>
                {/* Connector Line to next node */}
                {index < campaign.nodes.length - 1 && (
                    <View
                        style={[
                            styles.connector,
                            {
                                left: `${node.coordinate.x}%`,
                                top: `${node.coordinate.y}%`,
                                // Calculate length and rotation to next node is complex in simple React Native views without SVG
                                // For MVP, we'll skip the drawn lines or do simple absolute positioning if mostly vertical
                                // Let's implement lines later or use SVG. 
                                // Simple dot connector for now?
                            }
                        ]}
                    />
                )}

                <TouchableOpacity
                    style={[
                        styles.node,
                        {
                            left: `${node.coordinate.x}%`,
                            top: `${node.coordinate.y}%`,
                            backgroundColor: node.status === 'ACTIVE' ? theme.surface : theme.background,
                            borderColor: nodeColor,
                            opacity,
                            transform: [{ scale }] // Active node pulses/larger
                        }
                    ]}
                    onPress={() => {
                        if (node.status !== 'LOCKED') {
                            onNodeSelect(node)
                        }
                    }}
                    disabled={node.status === 'LOCKED'}
                >
                    <FontAwesome5 name={iconName} size={16} color={nodeColor} />
                </TouchableOpacity>

                {/* Label */}
                <View style={[
                    styles.nodeLabel,
                    {
                        left: `${node.coordinate.x}%`,
                        top: `${node.coordinate.y + 10}%`,
                        opacity: node.status === 'LOCKED' ? 0 : 1
                    }
                ]}>
                    <ThemedText variant="caption" style={{ fontSize: 10, textAlign: 'center', width: 80, marginLeft: -40 }}>
                        {node.title}
                    </ThemedText>
                </View>
            </React.Fragment>
        )
    }

    return (
        <View style={styles.container}>
            <ImageBackground
                source={require('@/assets/images/icon.png')} // TODO: Replace with actual map texture later
                style={styles.mapBackground}
                imageStyle={{ opacity: 0.05, resizeMode: 'repeat' }}
            >
                <ScrollView
                    contentContainerStyle={[styles.mapContent, { height: MAP_HEIGHT }]}
                    indicatorStyle="white"
                >
                    {/* Grid Lines for effect */}
                    <View style={styles.gridOverlay} />

                    {/* Nodes */}
                    {campaign.nodes.map(renderNode)}

                </ScrollView>
            </ImageBackground>

            {/* Campaign Info Overlay */}
            <View style={[styles.infoOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)' }]}>
                <ThemedText variant="heading" style={styles.campaignTitle}>{campaign.title}</ThemedText>
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
    mapContent: {
        width: '100%',
        position: 'relative',
    },
    gridOverlay: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        // Could add more grid lines here
    },
    node: {
        position: 'absolute',
        width: 40,
        height: 40,
        marginLeft: -20, // Center horizontally
        marginTop: -20, // Center vertically
        borderRadius: 20,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    nodeLabel: {
        position: 'absolute',
        zIndex: 11,
    },
    connector: {
        position: 'absolute',
        height: 2,
        backgroundColor: 'rgba(255,255,255,0.3)',
        // Transforms handled inline?
    },
    infoOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    campaignTitle: {
        textAlign: 'center',
        marginBottom: 4,
    },
    campaignProgress: {
        textAlign: 'center',
        opacity: 0.7,
        fontSize: 12,
    }
})
