import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, Clock, Settings, Crown, Sparkles } from 'lucide-react';
import WorldMapWithSunlight from './WorldMapWithSunlight.jsx';

// STATSIG - Import Statsig React SDK and plugins for feature flags and analytics - OBJECTIVE 1
import { StatsigProvider, useClientAsyncInit, useStatsigClient } from "@statsig/react-bindings";
import { StatsigAutoCapturePlugin } from "@statsig/web-analytics";
import { StatsigSessionReplayPlugin } from "@statsig/session-replay";

// Available time zones
const TIME_ZONES = [
  { label: 'New York', value: 'America/New_York' },
  { label: 'London', value: 'Europe/London' },
  { label: 'Tokyo', value: 'Asia/Tokyo' },
  { label: 'Paris', value: 'Europe/Paris' },
  { label: 'Sydney', value: 'Australia/Sydney' },
  { label: 'Los Angeles', value: 'America/Los_Angeles' },
  { label: 'Dubai', value: 'Asia/Dubai' },
  { label: 'Mumbai', value: 'Asia/Kolkata' },
  { label: 'Singapore', value: 'Asia/Singapore' },
  { label: 'Berlin', value: 'Europe/Berlin' },
  { label: 'São Paulo', value: 'America/Sao_Paulo' },
  { label: 'Cairo', value: 'Africa/Cairo' },
  { label: 'Moscow', value: 'Europe/Moscow' },
  { label: 'Hong Kong', value: 'Asia/Hong_Kong' },
  { label: 'Toronto', value: 'America/Toronto' }
];

// Helper functions for analytics metadata
const getOrCreateSessionId = () => {
  let sessionId = sessionStorage.getItem('statsig_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('statsig_session_id', sessionId);
    sessionStorage.setItem('session_start_time', Date.now().toString());
  }
  return sessionId;
};

// STATSIG - Generate user properties from browser
const getUserProperties = () => {
  // Get or create a persistent user ID
  let userID = localStorage.getItem('world_clock_user_id');
  if (!userID) {
    userID = `user_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    localStorage.setItem('world_clock_user_id', userID);
  }

  // Get or create user email (optional - could be set by user later)
  const userEmail = localStorage.getItem('world_clock_user_email') || null;

  return {
    userID: userID,
    email: userEmail,
    // Auto-detected browser properties
    userAgent: navigator.userAgent,
    locale: navigator.language,
    country: Intl.DateTimeFormat().resolvedOptions().timeZone.split('/')[1] || 'Unknown',
    // Custom properties for analytics
    customIDs: {
      sessionID: getOrCreateSessionId(),
      deviceType: window.innerWidth < 768 ? 'mobile' : 'desktop',
      browserName: getBrowserName(),
      timezoneRegion: Intl.DateTimeFormat().resolvedOptions().timeZone.split('/')[0] || 'Unknown'
    },
    custom: {
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      windowSize: `${window.innerWidth}x${window.innerHeight}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      platform: navigator.platform,
      cookiesEnabled: navigator.cookieEnabled,
      onlineStatus: navigator.onLine ? 'online' : 'offline',
      firstVisit: !localStorage.getItem('world_clock_user_id') ? new Date().toISOString() : localStorage.getItem('world_clock_first_visit')
    }
  };
};

// Helper to detect browser name
const getBrowserName = () => {
  const userAgent = navigator.userAgent;
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  return 'Unknown';
};

// Store first visit timestamp
if (!localStorage.getItem('world_clock_first_visit')) {
  localStorage.setItem('world_clock_first_visit', new Date().toISOString());
}

const getContinent = (timezone) => {
  const continentMap = {
    'America': 'North America',
    'Europe': 'Europe',
    'Asia': 'Asia',
    'Australia': 'Oceania',
    'Africa': 'Africa',
    'Atlantic': 'Atlantic',
    'Pacific': 'Pacific'
  };

  const continent = timezone.split('/')[0];
  return continentMap[continent] || 'Unknown';
};

const getTimezoneOffset = (timezone) => {
  const now = new Date();
  const localOffset = now.getTimezoneOffset();
  const targetTime = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  const targetOffset = (now.getTime() - targetTime.getTime()) / (1000 * 60);
  const hoursDiff = Math.round((targetOffset - localOffset) / 60);
  return hoursDiff > 0 ? `+${hoursDiff}` : hoursDiff.toString();
};

const isBusinessHours = (timezone) => {
  const time = new Date().toLocaleString("en-US", { timeZone: timezone });
  const hour = new Date(time).getHours();
  return hour >= 9 && hour <= 17;
};

const getDeviceInfo = () => {
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    cookiesEnabled: navigator.cookieEnabled
  };
};

// Clock tracking hook
const useClockTracking = () => {
  const [clockTimestamps, setClockTimestamps] = useState(new Map());
  const [toggleCounts, setToggleCounts] = useState({
    timeFormat: 0,
    seconds: 0
  });

  const trackClockAdded = (clockId) => {
    setClockTimestamps(prev => new Map(prev).set(clockId, Date.now()));
  };

  const getClockDuration = (clockId) => {
    const addedTime = clockTimestamps.get(clockId);
    return addedTime ? Date.now() - addedTime : 0;
  };

  const wasRecentlyAdded = (clockId, minutesThreshold = 5) => {
    const duration = getClockDuration(clockId);
    return duration < (minutesThreshold * 60 * 1000);
  };

  const incrementToggleCount = (type) => {
    setToggleCounts(prev => ({
      ...prev,
      [type]: prev[type] + 1
    }));
  };

  return {
    trackClockAdded,
    getClockDuration,
    wasRecentlyAdded,
    toggleCounts,
    incrementToggleCount
  };
};

const WorldClockDashboard = () => {
  // Initial preset cities
  const [clocks, setClocks] = useState([
    { id: 1, label: 'New York', timezone: 'America/New_York' },
    { id: 2, label: 'London', timezone: 'Europe/London' },
    { id: 3, label: 'Tokyo', timezone: 'Asia/Tokyo' }
  ]);

  const { client } = useStatsigClient(); // STATSIG - Get Statsig client instance
  const dashboardStore = client.getParameterStore("dashboard_settings");
  const dashboardTitle = dashboardStore.get("title", "World Clock Dashboard");

  const prominentUpgradeExp = client.getExperiment("prominent_upgrade_icon");
  const upgradeStyle = prominentUpgradeExp.get("style", "original");

  const {
    trackClockAdded,
    getClockDuration,
    wasRecentlyAdded,
    toggleCounts,
    incrementToggleCount
  } = useClockTracking();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [is24Hour, setIs24Hour] = useState(false);
  const [showSeconds, setShowSeconds] = useState(true);
  const [selectedTimezone, setSelectedTimezone] = useState('');
  const [showAddClock, setShowAddClock] = useState(false);
  const dropdownRef = useRef(null);

  // STATSIG - Check feature gates for A/B testing - OBJECTIVE 3
  const isDarkTheme = client.checkGate("dark_theme");
  const isCompactLayout = client.checkGate("compact_layout");
  const hasSmoothAnimations = client.checkGate("smooth_animations");
  const hasEnhancedTimeDisplay = client.checkGate("enhanced_time_display");
  const hasSearchBar = client.checkGate("search_bar");
  const hasSunlightOverlay = client.checkGate("sunlight_overlay");

  // STATSIG - Get dynamic config for banner content - OBJECTIVE 4
  const bannerConfig = client.getDynamicConfig("upsell_banner");

  const text = bannerConfig.get("text", null);
  const bannerBackgroundColor = bannerConfig.get("backgroundColor", "#a855f7");
  const bannerTextColor = bannerConfig.get("color", "white");
  const fontSize = bannerConfig.get("fontSize", 14);
  const isCloseable = bannerConfig.get("isCloseable", true);

  const [showBanner, setShowBanner] = useState(true);

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Handle clicking outside the search dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showAddClock && dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowAddClock(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showAddClock]);

  // Format time for a specific timezone
  const formatTime = (timezone) => {
    const options = {
      timeZone: timezone,
      hour12: !is24Hour,
      hour: '2-digit',
      minute: '2-digit',
      ...(showSeconds && { second: '2-digit' })
    };

    return new Intl.DateTimeFormat('en-US', options).format(currentTime);
  };

  // Get date for a specific timezone
  const formatDate = (timezone) => {
    const options = {
      timeZone: timezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };

    return new Intl.DateTimeFormat('en-US', options).format(currentTime);
  };

  // Get relative time info for enhanced display
  const getRelativeTime = (timezone) => {
    const now = new Date();

    const localHour = now.getHours();
    const targetTime = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
    const targetHour = targetTime.getHours();

    let diffInHours = targetHour - localHour;

    if (diffInHours > 12) {
      diffInHours -= 24;
    } else if (diffInHours < -12) {
      diffInHours += 24;
    }

    if (diffInHours === 0) return "Same time";

    if (diffInHours > 0) {
      return `${diffInHours}h ahead`;
    } else {
      return `${Math.abs(diffInHours)}h behind`;
    }
  };

  // Get time components for analog clock
  const getTimeComponents = (timezone) => {
    const date = new Date(currentTime.toLocaleString("en-US", { timeZone: timezone }));
    const hours = date.getHours() % 12;
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();

    return {
      hourAngle: (hours * 30) + (minutes * 0.5),
      minuteAngle: minutes * 6,
      secondAngle: seconds * 6
    };
  };

  // STATSIG - Upgrade button click with event tracking - OBJECTIVE 2
  const handleUpgradeClick = () => {
    client.logEvent("upgrade_button_clicked", {
      button_location: "header_primary_cta",
      current_clocks_count: clocks.length,
      user_session_id: getOrCreateSessionId(),
      timestamp: new Date().toISOString()
    });

    alert('Upgrade to Premium! 🚀');
  };

  // Banner Component
  const Banner = () => {
    if (!text || !showBanner) return null;

    return (
      <div className="mx-auto mb-8 w-full max-w-6xl">
        <div
          className="relative overflow-hidden rounded-3xl border border-white/15 px-6 py-4 text-sm font-medium shadow-[0_25px_80px_rgba(129,140,248,0.35)] backdrop-blur-2xl"
          style={{
            background: bannerBackgroundColor,
            color: bannerTextColor,
            fontSize
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-white/10 opacity-70 mix-blend-screen" aria-hidden="true" />
          <div className="relative flex flex-wrap items-center justify-center gap-4 sm:justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-4 w-4" />
              <span>{text}</span>
            </div>
            {isCloseable && (
              <button
                onClick={() => {
                  setShowBanner(false);
                  client.logEvent("banner_closed", "upsell_banner", {
                    user_session_id: getOrCreateSessionId(),
                    timestamp: new Date().toISOString()
                  });
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/40 bg-white/10 text-sm"
                style={{ color: bannerTextColor }}
                aria-label="Dismiss banner"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Upgrade Button Component
  const UpgradeButton = () => {
    const isProminent = upgradeStyle === "prominent";
    const interactiveClasses = hasSmoothAnimations
      ? 'transition-transform duration-500 ease-in-out hover:-translate-y-0.5 hover:scale-[1.02]'
      : '';

    const variantClasses = isProminent
      ? 'bg-gradient-to-r from-amber-300 via-orange-400 to-rose-400 text-slate-900 shadow-[0_22px_65px_rgba(251,191,36,0.35)]'
      : 'bg-gradient-to-r from-yellow-300 via-amber-300 to-orange-300 text-slate-900 shadow-[0_18px_55px_rgba(253,224,71,0.3)]';

    return (
      <button
        onClick={handleUpgradeClick}
        className={`inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-semibold ${variantClasses} ${interactiveClasses}`}
      >
        <Crown className="h-4 w-4" />
        <span>{isProminent ? "🔥 Upgrade Now — Pro Features!" : "Upgrade to Pro"}</span>
        <Sparkles className="h-4 w-4" />
      </button>
    );
  };

  // Analog Clock Component
  const AnalogClock = ({ timezone }) => {
    const { hourAngle, minuteAngle, secondAngle } = getTimeComponents(timezone);

    return (
      <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-white/15 bg-gradient-to-br from-violet-500/15 via-transparent to-indigo-500/25 p-4 shadow-inner">
        <svg viewBox="0 0 100 100" className="h-full w-full text-white/80">
          <circle
            cx="50"
            cy="50"
            r="48"
            fill="rgba(30, 41, 59, 0.45)"
            stroke="rgba(165, 180, 252, 0.35)"
            strokeWidth="2"
          />

          {[...Array(12)].map((_, i) => {
            const angle = i * 30;
            const x1 = 50 + Math.cos((angle - 90) * Math.PI / 180) * 40;
            const y1 = 50 + Math.sin((angle - 90) * Math.PI / 180) * 40;
            const x2 = 50 + Math.cos((angle - 90) * Math.PI / 180) * 35;
            const y2 = 50 + Math.sin((angle - 90) * Math.PI / 180) * 35;

            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(199, 210, 254, 0.5)"
                strokeWidth="2"
              />
            );
          })}

          <line
            x1="50"
            y1="50"
            x2={50 + Math.cos((hourAngle - 90) * Math.PI / 180) * 24}
            y2={50 + Math.sin((hourAngle - 90) * Math.PI / 180) * 24}
            stroke="#f5d0fe"
            strokeWidth="4"
            strokeLinecap="round"
          />

          <line
            x1="50"
            y1="50"
            x2={50 + Math.cos((minuteAngle - 90) * Math.PI / 180) * 32}
            y2={50 + Math.sin((minuteAngle - 90) * Math.PI / 180) * 32}
            stroke="#c4b5fd"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {showSeconds && (
            <line
              x1="50"
              y1="50"
              x2={50 + Math.cos((secondAngle - 90) * Math.PI / 180) * 34}
              y2={50 + Math.sin((secondAngle - 90) * Math.PI / 180) * 34}
              stroke="#f472b6"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          )}

          <circle cx="50" cy="50" r="3" fill="#fdf2f8" />
        </svg>
      </div>
    );
  };

  // CONSOLIDATED: Single addClock function for all UI paths
  const addClock = (timezoneValue, addMethod = 'dropdown', searchQuery = '') => {
    if (!timezoneValue) return;

    const selectedTz = TIME_ZONES.find(tz => tz.value === timezoneValue);
    if (!selectedTz) return;

    if (clocks.some(clock => clock.timezone === timezoneValue)) {
      alert('This clock already exists!');
      return;
    }

    const newClock = {
      id: Date.now(),
      label: selectedTz.label,
      timezone: selectedTz.value
    };

    setClocks(prev => [...prev, newClock]);
    trackClockAdded(newClock.id);
    setSelectedTimezone('');
    setShowAddClock(false);

    const deviceInfo = getDeviceInfo();

    client.logEvent("clock_added", selectedTz.value, {
      timezone: selectedTz.value,
      label: selectedTz.label,
      total_clocks: clocks.length + 1,
      add_method: addMethod,
      search_query: searchQuery || null,
      user_session_id: getOrCreateSessionId(),
      continent: getContinent(selectedTz.value),
      is_business_hours: isBusinessHours(selectedTz.value),
      time_offset_from_local: getTimezoneOffset(selectedTz.value),
      user_language: deviceInfo.language,
      user_timezone: deviceInfo.timezone,
      screen_size: `${deviceInfo.screenWidth}x${deviceInfo.screenHeight}`,
      timestamp: new Date().toISOString()
    });
  };

  // Remove a clock
  const removeClock = (id) => {
    const clockToRemove = clocks.find(clock => clock.id === id);
    const duration = getClockDuration(id);

    setClocks(prev => prev.filter(clock => clock.id !== id));

    client.logEvent("clock_removed", clockToRemove?.timezone || "unknown", {
      clock_id: id,
      timezone: clockToRemove?.timezone,
      label: clockToRemove?.label,
      remaining_clocks: clocks.length - 1,
      time_on_dashboard_ms: duration,
      time_on_dashboard_minutes: Math.round(duration / 60000),
      removal_method: "button_click",
      user_session_id: getOrCreateSessionId(),
      was_recently_added: wasRecentlyAdded(id),
      timestamp: new Date().toISOString()
    });
  };

  // Toggle 24-hour format
  const toggle24Hour = () => {
    const newFormat = !is24Hour;
    setIs24Hour(newFormat);
    incrementToggleCount('timeFormat');

    const deviceInfo = getDeviceInfo();

    client.logEvent("time_format_toggled", newFormat ? "24h" : "12h", {
      new_format: newFormat ? "24h" : "12h",
      previous_format: newFormat ? "12h" : "24h",
      total_clocks_visible: clocks.length,
      user_session_id: getOrCreateSessionId(),
      device_locale: deviceInfo.language,
      user_timezone: deviceInfo.timezone,
      toggle_count_in_session: toggleCounts.timeFormat + 1,
      timestamp: new Date().toISOString()
    });
  };

  // Toggle seconds display
  const toggleSeconds = () => {
    const newState = !showSeconds;
    setShowSeconds(newState);
    incrementToggleCount('seconds');

    client.logEvent("seconds_display_toggled", newState ? "enabled" : "disabled", {
      new_state: newState ? "enabled" : "disabled",
      previous_state: newState ? "disabled" : "enabled",
      total_clocks_visible: clocks.length,
      user_session_id: getOrCreateSessionId(),
      current_time_format: is24Hour ? "24h" : "12h",
      toggle_count_in_session: toggleCounts.seconds + 1,
      timestamp: new Date().toISOString()
    });
  };

  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, ' ');
  const localTimePreview = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    ...(showSeconds ? { second: '2-digit' } : {}),
    hour12: !is24Hour,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
  }).format(currentTime);

  const enabledFeatureCount = [
    isDarkTheme,
    isCompactLayout,
    hasSmoothAnimations,
    hasEnhancedTimeDisplay,
    hasSearchBar,
    hasSunlightOverlay
  ].filter(Boolean).length;

  const quickStats = [
    { label: 'Clocks Tracked', value: `${clocks.length}` },
    { label: 'Time Format', value: is24Hour ? '24-hour' : '12-hour' },
    { label: 'Seconds Display', value: showSeconds ? 'Visible' : 'Hidden' },
    { label: 'Feature Gates', value: `${enabledFeatureCount} active` }
  ];

  const filteredTimezones = selectedTimezone
    ? TIME_ZONES.filter(zone =>
        zone.label.toLowerCase().includes(selectedTimezone.toLowerCase()) ||
        zone.value.toLowerCase().includes(selectedTimezone.toLowerCase())
      ).slice(0, 8)
    : [];

  const quickAddZones = TIME_ZONES.slice(0, 3);

  const panelHoverClass = hasSmoothAnimations
    ? 'transition-all duration-500 ease-in-out hover:-translate-y-1 hover:shadow-[0_45px_140px_rgba(76,29,149,0.45)]'
    : '';
  const buttonHoverClass = hasSmoothAnimations
    ? 'transition-transform duration-500 ease-in-out hover:scale-[1.03]'
    : '';
  const gridColumnsClass = isCompactLayout ? 'sm:grid-cols-1 md:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3';

  return (
    <div
      className="app-shell font-inter"
      style={{
        '--bg-gradient': isDarkTheme
          ? 'radial-gradient(circle at 20% 20%, rgba(10,10,15,0.95), #050505 65%)'
          : 'linear-gradient(135deg, #0b1437 0%, #461176 42%, #0f2a52 100%)',
        transform: hasSmoothAnimations ? 'scale(1)' : 'none'
      }}
    >
      <span className="app-shell__glow app-shell__glow--left" aria-hidden="true" />
      <span className="app-shell__glow app-shell__glow--right" aria-hidden="true" />
      <span className="app-shell__stars" aria-hidden="true" />
      <Banner />

      <div className="relative z-10 px-4 pb-16 pt-12 sm:px-6 lg:px-12">
        <div className="mx-auto max-w-6xl space-y-10">
          <header className={`relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.08] px-6 py-10 shadow-[0_45px_140px_rgba(59,7,100,0.45)] backdrop-blur-xl sm:px-12 ${panelHoverClass}`}>
            <div className="pointer-events-none absolute -right-12 -top-16 hidden h-56 w-56 rounded-full bg-gradient-to-br from-fuchsia-500/20 via-purple-500/20 to-transparent blur-3xl sm:block" />
            <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-4 text-center sm:text-left">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-slate-200/70">
                  <Clock className="h-3.5 w-3.5" />
                  global time intelligence
                </div>
                <div className="space-y-2">
                  <h1 className="bg-gradient-to-r from-indigo-200 via-sky-100 to-fuchsia-200 bg-clip-text text-4xl font-semibold tracking-tight text-transparent sm:text-5xl md:text-[3.1rem]">
                    {dashboardTitle}
                  </h1>
                  <p className="text-base text-slate-200/80 sm:text-lg">
                    Keep your team aligned across the globe with live clocks, contextual insights, and feature flags delivered by Statsig experiments.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-200/70 sm:justify-start">
                  <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">
                    Local time · {localTimePreview}
                  </span>
                  <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">
                    Timezone · {userTimezone}
                  </span>
                  <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">
                    Feature gates · {enabledFeatureCount} active
                  </span>
                </div>
              </div>
              <div className="flex justify-center sm:justify-end">
                <UpgradeButton />
              </div>
            </div>

            <dl className="mt-10 grid grid-cols-2 gap-4 text-left sm:grid-cols-4">
              {quickStats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/15 bg-white/10 px-4 py-4 backdrop-blur-lg"
                >
                  <dt className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-200/60">
                    {item.label}
                  </dt>
                  <dd className="mt-2 text-lg font-semibold text-white">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </header>

          <section className={`rounded-3xl border border-white/10 bg-white/[0.08] px-6 py-7 shadow-[0_40px_120px_rgba(17,25,40,0.55)] backdrop-blur-xl sm:px-10 sm:py-10 ${panelHoverClass}`}>
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.35em] text-slate-200/70">
                  <Settings className="h-3.5 w-3.5" />
                  controls
                </div>
                <h2 className="text-2xl font-semibold text-white">Dashboard controls</h2>
                <p className="text-sm text-slate-300/80">
                  Toggle how you view global time and add new hubs to monitor.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-4 md:justify-end">
                <label className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white">
                  <input
                    type="checkbox"
                    checked={is24Hour}
                    onChange={toggle24Hour}
                    className="rounded border-white/30 bg-transparent text-violet-400 focus:ring-violet-400"
                  />
                  24-hour format
                </label>
                <label className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white">
                  <input
                    type="checkbox"
                    checked={showSeconds}
                    onChange={toggleSeconds}
                    className="rounded border-white/30 bg-transparent text-violet-400 focus:ring-violet-400"
                  />
                  Show seconds
                </label>
                <button
                  onClick={() => setShowAddClock(!showAddClock)}
                  className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-400 via-fuchsia-500 to-rose-500 px-5 py-2 text-sm font-semibold text-slate-900 shadow-[0_20px_65px_rgba(162,91,255,0.45)] ${buttonHoverClass}`}
                >
                  <Plus className="h-4 w-4" />
                  Add clock
                </button>
              </div>
            </div>

            {hasSearchBar && (
              <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900/40 p-6 shadow-inner backdrop-blur-xl">
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-300/70">
                  Search & add timezone
                </label>
                <div className="relative mt-3" ref={dropdownRef}>
                  <input
                    type="text"
                    value={selectedTimezone}
                    onChange={(e) => setSelectedTimezone(e.target.value)}
                    onFocus={() => setShowAddClock(true)}
                    placeholder="Type a city or IANA timezone (e.g. Europe/Paris)…"
                    className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-slate-100 placeholder:text-slate-400/60 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/60"
                  />
                  {showAddClock && selectedTimezone && (
                    <div className="absolute top-full left-0 right-0 z-20 mt-2 max-h-56 overflow-y-auto rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur-xl shadow-[0_25px_85px_rgba(30,20,60,0.55)]">
                      {filteredTimezones.length > 0 ? (
                        filteredTimezones.map((zone) => (
                          <button
                            key={zone.value}
                            onClick={() => addClock(zone.value, 'search', selectedTimezone)}
                            className="flex w-full flex-col items-start gap-1 px-4 py-3 text-left text-sm text-slate-100 transition hover:bg-white/10"
                          >
                            <span className="font-medium">{zone.label}</span>
                            <span className="text-xs text-slate-300/70">{zone.value}</span>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-slate-300/70">
                          No matches yet — try another city or region.
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {quickAddZones.map((zone) => (
                    <button
                      key={zone.value}
                      onClick={() => addClock(zone.value, 'quick_select')}
                      className={`inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-slate-100 ${buttonHoverClass}`}
                    >
                      <Plus className="h-3 w-3" />
                      {zone.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className={`grid gap-6 ${gridColumnsClass}`}>
            {clocks.map((clock) => {
              const timezoneOffset = getTimezoneOffset(clock.timezone);
              const businessOpen = isBusinessHours(clock.timezone);
              const continent = getContinent(clock.timezone);

              return (
                <div
                  key={clock.id}
                  className={`group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.08] p-6 shadow-[0_45px_140px_rgba(59,7,100,0.4)] backdrop-blur-xl ${panelHoverClass}`}
                >
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.35em] text-slate-300/70">
                        <span className="rounded-full border border-white/15 bg-white/10 px-2 py-1 text-[11px]">
                          {continent}
                        </span>
                        <span className="rounded-full border border-white/15 bg-white/10 px-2 py-1 text-[11px]">
                          UTC {timezoneOffset}
                        </span>
                        <span className={`rounded-full px-2 py-1 text-[11px] ${businessOpen ? 'border border-emerald-300/50 bg-emerald-400/20 text-emerald-100' : 'border border-slate-400/40 bg-slate-400/10 text-slate-200/80'}`}>
                          {businessOpen ? 'Business hrs' : 'After hours'}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-2xl font-semibold tracking-wide text-white">
                          {clock.label}
                        </h3>
                        <div
                          className={`font-jetbrains text-[2.4rem] leading-none text-white ${hasEnhancedTimeDisplay ? 'tracking-[0.35em]' : 'tracking-[0.2em]'}`}
                        >
                          {formatTime(clock.timezone)}
                        </div>
                        <div className="space-y-1 text-sm text-slate-300/75">
                          <div>{formatDate(clock.timezone)}</div>
                          {hasEnhancedTimeDisplay && (
                            <div className="text-xs uppercase tracking-[0.35em] text-slate-400/70">
                              {getRelativeTime(clock.timezone)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {!isCompactLayout && (
                      <div className="flex-shrink-0">
                        <AnalogClock timezone={clock.timezone} />
                      </div>
                    )}
                  </div>
                  {clocks.length > 1 && (
                    <button
                      onClick={() => removeClock(clock.id)}
                      className={`absolute right-6 top-6 rounded-full border border-white/15 bg-white/10 p-2 text-slate-200/80 hover:text-rose-300 ${buttonHoverClass}`}
                      aria-label={`Remove ${clock.label}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </section>

          {hasSunlightOverlay && (
            <div className={`rounded-3xl border border-white/10 bg-white/[0.08] p-6 shadow-[0_40px_120px_rgba(17,25,40,0.55)] backdrop-blur-xl ${panelHoverClass}`}>
              <WorldMapWithSunlight />
            </div>
          )}

          <footer className="text-center text-sm font-light text-slate-300/80">
            <p>Times update automatically every second · Powered by Statsig experiments</p>
          </footer>
        </div>
      </div>

      <style jsx>{`
        .font-inter {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .font-jetbrains {
          font-family: 'JetBrains Mono', 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        }
      `}</style>
    </div>
  );
};

// STATSIG - App component using user properties - OBJECTIVE 1
function App() {
  const { client } = useClientAsyncInit(
    "client-1jKRKqgQNUDG6QY5wHhX2pFDELaEnSUFWw8vB879CBN",
    getUserProperties(), // STATSIG - Using your user properties function
    { plugins: [new StatsigAutoCapturePlugin(), new StatsigSessionReplayPlugin()] },
  );

  return (
    <StatsigProvider client={client} loadingComponent={<div>Loading...</div>}>
      <WorldClockDashboard />
    </StatsigProvider>
  );
}

export default App;
