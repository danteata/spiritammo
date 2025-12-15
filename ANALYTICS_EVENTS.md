# 🎯 Spirit Ammo Analytics Events Reference

This document provides a comprehensive reference of all analytics events tracked in Spirit Ammo. Use this as a guide for understanding current tracking and adding new events.

## 📊 Analytics Overview

**Provider**: Amplitude (with Session Replay)
**Initialization**: Automatic on app startup
**Configuration**: Environment-based provider switching
**Privacy**: GDPR-compliant with user opt-out options

---

## 🎯 Event Categories & Events

### 📱 App Lifecycle Events

| Event Name | Description | Trigger | Properties |
|------------|-------------|---------|------------|
| `app_open` | App launched or brought to foreground | App start/foreground | `platform`, `version`, `device_type` |
| `app_close` | App sent to background | App background | `session_duration`, `last_screen` |
| `app_background` | App minimized | User minimizes app | `time_in_app` |
| `app_foreground` | App restored from background | User returns to app | `background_duration` |

### 🧭 Navigation Events

| Event Name | Description | Trigger | Properties |
|------------|-------------|---------|------------|
| `tab_switch` | User switches between main tabs | Tab navigation | `from_tab`, `to_tab`, `tab_label` |
| `screen_view` | Screen becomes visible | Navigation events | `screen_name`, `previous_screen`, `context` |
| `deep_link_received` | App opened via deep link | External deep link | `link_type`, `source`, `campaign_id` |

### 🎖️ Practice & Training Events

| Event Name | Description | Trigger | Properties |
|------------|-------------|---------|------------|
| `practice_start` | User begins any practice activity | Practice initiation | `mode`, `scripture_id`, `collection` |
| `practice_complete` | User completes practice session | Practice completion | `duration`, `accuracy`, `mode`, `collection` |
| `target_practice_start` | Target practice modal opened | Target practice start | `scripture_id`, `reference`, `collection` |
| `target_practice_complete` | Target practice completed | Accuracy assessment | `accuracy`, `transcript`, `duration`, `vp_earned` |
| `stealth_drill_start` | Stealth drill modal opened | Stealth drill start | `scripture_id`, `reference`, `difficulty` |
| `stealth_drill_complete` | Stealth drill completed | Word completion | `accuracy`, `duration`, `difficulty`, `vp_earned` |
| `voice_recording_start` | Voice recording begins | Recording initiation | `scripture_id`, `recording_type` |
| `voice_recording_complete` | Voice recording saved | Recording completion | `accuracy`, `duration`, `auto_saved` |
| `voice_playback_start` | Voice playback begins | Playback initiation | `recording_id`, `playback_type` |
| `voice_playback_complete` | Voice playback ends | Playback completion | `duration`, `source` |

### ⚔️ Campaign & Mission Events

| Event Name | Description | Trigger | Properties |
|------------|-------------|---------|------------|
| `campaign_started` | User begins campaign | Campaign selection | `campaign_id`, `campaign_name`, `difficulty`, `theme` |
| `campaign_complete` | Campaign fully completed | All missions done | `campaign_id`, `total_time`, `completion_rate` |
| `mission_start` | Individual mission begins | Mission briefing | `mission_id`, `campaign_id`, `difficulty` |
| `mission_complete` | Mission completed successfully | Mission success | `mission_id`, `accuracy`, `time_taken`, `vp_earned` |
| `briefing_viewed` | Mission briefing displayed | Briefing modal open | `mission_id`, `briefing_type` |
| `node_unlocked` | Campaign node becomes available | Mission completion | `node_id`, `campaign_id`, `unlock_condition` |

### 📚 Content & Collection Events

| Event Name | Description | Trigger | Properties |
|------------|-------------|---------|------------|
| `collection_selected` | User selects collection | Collection choice | `collection_id`, `collection_name`, `scripture_count` |
| `chapter_selected` | Chapter selection in collection | Chapter navigation | `chapter_id`, `collection_id`, `verse_count` |
| `scripture_viewed` | Scripture displayed to user | Scripture load | `scripture_id`, `reference`, `context` |
| `intel_generated` | Battle intelligence created | Intel generation | `scripture_id`, `intel_type`, `success` |
| `file_uploaded` | PDF/EPUB file imported | File import | `file_type`, `file_size`, `verse_count` |

### 🪖 User Progression Events

| Event Name | Description | Trigger | Properties |
|------------|-------------|---------|------------|
| `rank_advanced` | Military rank increased | Rank milestone | `old_rank`, `new_rank`, `advancement_reason` |
| `achievement_unlocked` | Achievement earned | Achievement trigger | `achievement_id`, `achievement_name`, `rarity` |
| `streak_maintained` | Daily practice streak continued | Practice completion | `streak_length`, `streak_type` |
| `streak_broken` | Daily practice streak ended | Missed day | `previous_streak`, `break_reason` |
| `user_profile_updated` | User properties changed | Profile update | `updated_fields`, `update_source` |

### 💰 Economy & Purchase Events

| Event Name | Description | Trigger | Properties |
|------------|-------------|---------|------------|
| `valor_points_earned` | VP added to balance | Practice/rewards | `amount`, `source`, `reason` |
| `valor_points_spent` | VP deducted from balance | Purchase/upgrade | `amount`, `item_type`, `item_id` |
| `item_purchased` | Avatar item bought | VP transaction | `item_id`, `item_name`, `cost`, `category` |
| `item_equipped` | Avatar item equipped | Equipment change | `item_id`, `slot`, `previous_item` |

### ⚙️ Settings & Configuration Events

| Event Name | Description | Trigger | Properties |
|------------|-------------|---------|------------|
| `setting_changed` | App setting modified | Settings update | `setting_name`, `old_value`, `new_value` |
| `theme_changed` | UI theme switched | Theme toggle | `old_theme`, `new_theme`, `theme_type` |
| `voice_engine_changed` | Speech engine switched | Engine selection | `old_engine`, `new_engine`, `reason` |
| `privacy_settings_updated` | Privacy preferences changed | Privacy update | `analytics_enabled`, `data_sharing` |

### 🎙️ Voice Features Events

| Event Name | Description | Trigger | Properties |
|------------|-------------|---------|------------|
| `whisper_model_loaded` | AI model initialized | Model load | `model_version`, `load_time`, `success` |
| `voice_library_opened` | Recording library viewed | Library access | `recording_count`, `sort_order` |
| `recording_deleted` | Voice recording removed | Recording deletion | `recording_id`, `reason` |
| `tts_voice_changed` | Text-to-speech voice changed | Voice selection | `old_voice`, `new_voice`, `language` |

### 📊 Performance & Error Events

| Event Name | Description | Trigger | Properties |
|------------|-------------|---------|------------|
| `performance_timing` | Performance measurement | Various operations | `operation`, `duration_ms`, `success` |
| `error_occurred` | Application error | Exception/crash | `error_type`, `error_message`, `context` |
| `loading_time` | Screen/component load time | Load completion | `component`, `load_time`, `cache_hit` |

### 👥 Social & Sharing Events

| Event Name | Description | Trigger | Properties |
|------------|-------------|---------|------------|
| `share_initiated` | Share action started | Share button | `share_type`, `content_type`, `platform` |
| `squad_invitation_sent` | Squad invite sent | Invite action | `invitation_type`, `recipient_count` |
| `squad_challenge_created` | Group challenge created | Challenge setup | `challenge_type`, `participant_count` |

---

## 🛠️ Implementation Guide

### Adding New Events

1. **Define the Event**: Add to `services/analytics.ts` Events object
2. **Implement Tracking**: Call `analytics.track()` or convenience methods
3. **Document Here**: Add to this reference document

#### Example Implementation:

```typescript
// 1. Add to Events object
Events: {
  // ... existing events
  'new_custom_event': 'custom_event_name'
}

// 2. Track in component
analytics.track({
  name: Analytics.Events.NEW_CUSTOM_EVENT,
  properties: {
    custom_property: 'value',
    context: 'additional_info'
  }
})

// 3. Or use convenience method
analytics.trackInteraction('action', 'element', { custom_data: true })
```

### Best Practices

#### Event Naming
- Use snake_case for event names
- Be descriptive but concise
- Group related events (e.g., `practice_start`, `practice_complete`)

#### Properties
- Include relevant context for analysis
- Use consistent property names across events
- Avoid sensitive user data
- Keep property values reasonable in size

#### Timing
- Track events at logical completion points
- Don't track rapid-fire events (debounce if needed)
- Use timing events for performance monitoring

#### User Privacy
- Never track personally identifiable information
- Respect user opt-out preferences
- Follow GDPR and privacy regulations

### Current Implementation Status

- ✅ **App Lifecycle**: Fully implemented
- ✅ **Navigation**: Tab switches and screen views
- ✅ **Practice Sessions**: Target practice and stealth drills
- ✅ **Campaign Progress**: Mission starts and completions
- ✅ **User Progression**: Ranks and achievements
- ✅ **Economy**: VP transactions and purchases
- ✅ **Settings**: Configuration changes
- ⏳ **Performance**: Basic timing (expandable)
- ⏳ **Social**: Basic sharing (expandable)

---

## 📈 Analytics Dashboard Insights

### Key Metrics to Monitor

1. **User Engagement**
   - Daily/Weekly Active Users
   - Session Duration
   - Feature Usage Frequency

2. **Practice Effectiveness**
   - Average Accuracy Trends
   - Practice Session Length
   - Feature Adoption Rates

3. **Progression & Retention**
   - Rank Advancement Rate
   - Daily Streak Maintenance
   - Campaign Completion Rates

4. **Monetization**
   - VP Earn Rate
   - Item Purchase Conversion
   - Feature-to-Purchase Funnel

5. **Technical Performance**
   - App Load Times
   - Error Rates by Feature
   - Session Replay Insights

---

## 🔧 Maintenance & Updates

When adding new features or modifying existing ones:

1. **Check this document** for existing similar events
2. **Follow naming conventions** and property standards
3. **Add implementation examples** for complex events
4. **Test event tracking** in development console
5. **Update this document** with new events

### Contact

For questions about analytics implementation or to add new events, reference this document and the `services/analytics.ts` file.
