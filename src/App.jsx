import React, { useState, useEffect } from 'react';
import { Plus, X, Clock, Settings, Crown, Sparkles } from 'lucide-react';

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
  const targetTime = new Date(now.toLocaleString("en-US", {timeZone: timezone}));
  const targetOffset = (now.getTime() - targetTime.getTime()) / (1000 * 60);
  const hoursDiff = Math.round((targetOffset - localOffset) / 60);
  return hoursDiff > 0 ? `+${hoursDiff}` : hoursDiff.toString();
};

const isBusinessHours = (timezone) => {
  const time = new Date().toLocaleString("en-US", {timeZone: timezone});
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

  // STATSIG - Check feature gates for A/B testing - OBJECTIVE 3
  const isDarkTheme = client.checkGate("dark_theme");
  const isCompactLayout = client.checkGate("compact_layout");
  const hasSmoothAnimations = client.checkGate("smooth_animations");
  const hasEnhancedTimeDisplay = client.checkGate("enhanced_time_display");
  const hasSearchBar = client.checkGate("search_bar");

  // STATSIG - Check if user should see banner (feature gate for segmentation) - OBJECTIVE 4
  const shouldShowBanner = client.checkGate("show_upsell_banner");
  
  // STATSIG - Get

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
      if (showAddClock && !event.target.closest('.relative')) {
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
    const localOffset = now.getTimezoneOffset();
    const targetTime = new Date(now.toLocaleString("en-US", {timeZone: timezone}));
    const targetOffset = (now.getTime() - targetTime.getTime()) / (1000 * 60);
    const hoursDiff = Math.round((targetOffset - localOffset) / 60);
    
    if (hoursDiff === 0) return "Same time";
    return hoursDiff > 0 ? `+${hoursDiff}h ahead` : `${Math.abs(hoursDiff)}h behind`;
  };

  // Get time components for analog clock
  const getTimeComponents = (timezone) => {
    const date = new Date(currentTime.toLocaleString("en-US", {timeZone: timezone}));
    const hours = date.getHours() % 12;
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    
    return {
      hourAngle: (hours * 30) + (minutes * 0.5),
      minuteAngle: minutes * 6,
      secondAngle: seconds * 6
    };
  };

  // STATSIG - Handle upgrade button click with event tracking
  const handleUpgradeClick = () => {
    client.logEvent("upgrade_button_clicked", {
      button_location: "top_right_header",
      current_clocks_count: clocks.length,
      user_session_id: getOrCreateSessionId(),
      timestamp: new Date().toISOString()
    });

    // Simulate upgrade flow
    alert('Upgrade to Premium! 🚀');
  };

  // Banner Component
  const Banner = () => {
    if (!text || !showBanner) return null;
    
    return (
      <div 
        style={{
          backgroundColor: bannerBackgroundColor,
          color: bannerTextColor,
          fontSize: fontSize + "px",
          padding: "12px 16px",
          textAlign: "center",
          position: "relative",
          zIndex: 1000
        }}
      >
        <p style={{ margin: 0 }}>{text}</p>
        {isCloseable && (
          <button
            onClick={() => {
              setShowBanner(false);
              client.logEvent("banner_closed", "upsell_banner", {
                user_session_id: getOrCreateSessionId(),
                timestamp: new Date().toISOString()
              });
            }}
            style={{
              position: "absolute",
              right: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              color: bannerTextColor,
              fontSize: "18px",
              cursor: "pointer"
            }}
          >
            ×
          </button>
        )}
      </div>
    );
  };

  // Upgrade Button Component
  const UpgradeButton = () => {
    return (
      <button
        onClick={handleUpgradeClick}
        className="flex items-center gap-2 text-white px-6 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl group"
        style={{
          background: "linear-gradient(135deg, #f59e0b, #f97316, #dc2626)",
          borderRadius: "16px",
          transition: `all ${hasSmoothAnimations ? 500 : 300}ms ease-in-out`,
          transform: hasSmoothAnimations ? 'scale(1)' : 'none',
          border: "2px solid rgba(255, 255, 255, 0.2)"
        }}
        onMouseEnter={hasSmoothAnimations ? (e) => {
          e.target.style.transform = 'scale(1.05)';
          e.target.style.background = 'linear-gradient(135deg, #fbbf24, #fb923c, #ef4444)';
        } : undefined}
        onMouseLeave={hasSmoothAnimations ? (e) => {
          e.target.style.transform = 'scale(1)';
          e.target.style.background = 'linear-gradient(135deg, #f59e0b, #f97316, #dc2626)';
        } : undefined}
      >
        <Crown className="w-5 h-5" />
        <span>Upgrade to Pro</span>
        <Sparkles className="w-4 h-4 group-hover:animate-pulse" />
      </button>
    );
  };

  // Analog Clock Component
  const AnalogClock = ({ timezone }) => {
    const { hourAngle, minuteAngle, secondAngle } = getTimeComponents(timezone);
    
    return (
      <div className="relative w-20 h-20 mx-auto">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle
            cx="50"
            cy="50"
            r="48"
            fill="rgba(147, 51, 234, 0.1)"
            stroke="rgba(196, 181, 253, 0.4)"
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
                stroke="rgba(196, 181, 253, 0.6)"
                strokeWidth="2"
              />
            );
          })}
          
          <line
            x1="50"
            y1="50"
            x2={50 + Math.cos((hourAngle - 90) * Math.PI / 180) * 25}
            y2={50 + Math.sin((hourAngle - 90) * Math.PI / 180) * 25}
            stroke="#a855f7"
            strokeWidth="3"
            strokeLinecap="round"
          />
          
          <line
            x1="50"
            y1="50"
            x2={50 + Math.cos((minuteAngle - 90) * Math.PI / 180) * 35}
            y2={50 + Math.sin((minuteAngle - 90) * Math.PI / 180) * 35}
            stroke="#a855f7"
            strokeWidth="2"
            strokeLinecap="round"
          />
          
          {showSeconds && (
            <line
              x1="50"
              y1="50"
              x2={50 + Math.cos((secondAngle - 90) * Math.PI / 180) * 38}
              y2={50 + Math.sin((secondAngle - 90) * Math.PI / 180) * 38}
              stroke="#ec4899"
              strokeWidth="1"
              strokeLinecap="round"
            />
          )}
          
          <circle
            cx="50"
            cy="50"
            r="3"
            fill="#a855f7"
          />
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

    // 1. Execute business logic
    const newClock = {
      id: Date.now(),
      label: selectedTz.label,
      timezone: selectedTz.value
    };

    setClocks(prev => [...prev, newClock]);
    trackClockAdded(newClock.id);
    setSelectedTimezone('');
    setShowAddClock(false);

    // 2. Track the successful action (keeping all your original rich metadata)
    const deviceInfo = getDeviceInfo();
    
    client.logEvent("clock_added", selectedTz.value, { // STATSIG - Log clock addition event - OBJECTIVE 2
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

    // Log removal event with collected metadata
    client.logEvent("clock_removed", clockToRemove?.timezone || "unknown", { // STATSIG - Log clock removal event - OBJECTIVE 2
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
    
    client.logEvent("time_format_toggled", newFormat ? "24h" : "12h", { // STATSIG - Log time format toggle event - OBJECTIVE 2
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
    
    client.logEvent("seconds_display_toggled", newState ? "enabled" : "disabled", { // STATSIG - Log seconds display toggle event - OBJECTIVE 2
      new_state: newState ? "enabled" : "disabled",
      previous_state: newState ? "disabled" : "enabled",
      total_clocks_visible: clocks.length,
      user_session_id: getOrCreateSessionId(),
      current_time_format: is24Hour ? "24h" : "12h",
      toggle_count_in_session: toggleCounts.seconds + 1,
      timestamp: new Date().toISOString()
    });
  };

  return (
    <div 
      className="min-h-screen font-inter"
      style={{
        background: isDarkTheme 
          ? `linear-gradient(to bottom right, #000000, #1a1a1a, #000000)` 
          : `linear-gradient(to bottom right, #0f172a, #581c87, #0f172a)`,
        transition: `all ${hasSmoothAnimations ? 500 : 300}ms ease-in-out`,
        transform: hasSmoothAnimations ? 'scale(1)' : 'none'
      }}
    >
      {/* Dynamic Config Banner */}
      <Banner />
      
      <div className="p-4">
        <div className="max-w-6xl mx-auto">
          {/* Header with Upgrade Button */}
          <div className="text-center mb-8 relative">
            {/* Upgrade Button - Top Right */}
            <div className="absolute top-0 right-0">
              <UpgradeButton />
            </div>
            
            <div className="flex items-center justify-center gap-3 mb-4">
              <Clock 
                className="w-10 h-10"
                style={{ 
                  color: "#9ca3af",
                  transform: hasSmoothAnimations ? 'scale(1)' : 'none',
                  transition: `all ${hasSmoothAnimations ? 500 : 300}ms ease-in-out`
                }}
              />
              <h1 
                className="font-bold tracking-tight"
                style={{ 
                  fontSize: "36px",
                  fontWeight: 600,
                  color: "#ffffff"
                }}
              >
                World Clock Dashboard
              </h1>
            </div>
            <p 
              className="font-light"
              style={{ color: "#9ca3af" }}
            >
              Keep track of time across the globe
            </p>
          </div>

          {/* Controls */}
          <div 
            className="backdrop-blur-lg mb-8 border border-white/20"
            style={{
              backgroundColor: "rgba(255,255,255,0.1)",
              borderRadius: "16px",
              padding: "24px",
              transition: `all ${hasSmoothAnimations ? 500 : 300}ms ease-in-out`,
              transform: hasSmoothAnimations ? 'translateY(0)' : 'none'
            }}
          >
            <div className="flex flex-wrap items-center gap-4 justify-between">
              <div className="flex items-center gap-2">
                <Settings 
                  className="w-5 h-5"
                  style={{ color: "#9ca3af" }}
                />
                <span 
                  className="font-medium"
                  style={{ color: "#ffffff" }}
                >
                  Settings
                </span>
              </div>
              
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-4">
                  <label 
                    className="flex items-center gap-2"
                    style={{ color: "#ffffff" }}
                  >
                    <input
                      type="checkbox"
                      checked={is24Hour}
                      onChange={toggle24Hour}
                      className="rounded"
                    />
                    24-hour format
                  </label>
                  
                  <label 
                    className="flex items-center gap-2"
                    style={{ color: "#ffffff" }}
                  >
                    <input
                      type="checkbox"
                      checked={showSeconds}
                      onChange={toggleSeconds}
                      className="rounded"
                    />
                    Show seconds
                  </label>
                </div>

                <button
                  onClick={() => setShowAddClock(!showAddClock)}
                  className="flex items-center gap-2 text-white px-4 py-2 rounded-lg font-medium"
                  style={{
                    backgroundColor: "#6b7280",
                    borderRadius: "16px",
                    transition: `all ${hasSmoothAnimations ? 500 : 300}ms ease-in-out`,
                    transform: hasSmoothAnimations ? 'scale(1)' : 'none'
                  }}
                  onMouseEnter={hasSmoothAnimations ? (e) => e.target.style.transform = 'scale(1.05)' : undefined}
                  onMouseLeave={hasSmoothAnimations ? (e) => e.target.style.transform = 'scale(1)' : undefined}
                >
                  <Plus className="w-4 h-4" />
                  Add Clock
                </button>
              </div>
            </div>

            {/* Add Clock Section - search_bar feature gate */}
            <div className="mt-4 pt-4 border-t border-white/20">
              {hasSearchBar ? (
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="flex-1 min-w-[200px]">
                    <label 
                      className="block text-sm font-medium mb-2"
                      style={{ color: "#ffffff" }}
                    >
                      Search & Add Timezone
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={selectedTimezone}
                        onChange={(e) => setSelectedTimezone(e.target.value)}
                        onFocus={() => setShowAddClock(true)}
                        placeholder="Type to search timezones..."
                        className="w-full border border-white/20 px-3 py-2 placeholder-gray-400 focus:ring-2 focus:border-transparent"
                        style={{
                          backgroundColor: "rgba(255,255,255,0.1)",
                          color: "#ffffff",
                          borderRadius: "16px",
                          transition: `all ${hasSmoothAnimations ? 500 : 300}ms ease-in-out`
                        }}
                      />
                      {showAddClock && selectedTimezone && (
                        <div 
                          className="absolute top-full left-0 right-0 mt-1 backdrop-blur-lg border border-white/20 max-h-48 overflow-y-auto z-10"
                          style={{
                            backgroundColor: "rgba(255,255,255,0.1)",
                            borderRadius: "16px"
                          }}
                        >
                          {TIME_ZONES
                            .filter(zone => 
                              zone.label.toLowerCase().includes(selectedTimezone.toLowerCase()) ||
                              zone.value.toLowerCase().includes(selectedTimezone.toLowerCase())
                            )
                            .slice(0, 8)
                            .map(zone => (
                              <button
                                key={zone.value}
                                onClick={() => addClock(zone.value, 'search', selectedTimezone)} // Uses single addClock function
                                className="w-full text-left px-3 py-2 hover:bg-white/20 border-b border-white/10 last:border-b-0"
                                style={{
                                  color: "#ffffff",
                                  transition: `all ${hasSmoothAnimations ? 500 : 300}ms ease-in-out`
                                }}
                              >
                                <div className="font-medium">{zone.label}</div>
                                <div className="text-sm text-gray-400">{zone.value}</div>
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="flex-1 min-w-[200px]">
                    <label 
                      className="block text-sm font-medium mb-2"
                      style={{ color: "#ffffff" }}
                    >
                      Select Timezone
                    </label>
                    <select
                      value={selectedTimezone}
                      onChange={(e) => setSelectedTimezone(e.target.value)}
                      className="w-full border border-white/20 px-3 py-2 focus:ring-2 focus:border-transparent"
                      style={{
                        backgroundColor: "rgba(255,255,255,0.1)",
                        color: "#ffffff",
                        borderRadius: "16px",
                        transition: `all ${hasSmoothAnimations ? 500 : 300}ms ease-in-out`
                      }}
                    >
                      <option value="" className="bg-slate-800 text-white">Choose a city...</option>
                      {TIME_ZONES.map(zone => (
                        <option key={zone.value} value={zone.value} className="bg-slate-800 text-white">
                          {zone.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => addClock(selectedTimezone, 'dropdown')} // Uses single addClock function
                    disabled={!selectedTimezone}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 font-medium"
                    style={{
                      borderRadius: "16px",
                      transition: `all ${hasSmoothAnimations ? 500 : 300}ms ease-in-out`
                    }}
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Clock Grid - layout controlled by compact_layout feature gate */}
          <div 
            className={isCompactLayout ? "space-y-3" : "grid gap-6"}
            style={{
              gridTemplateColumns: isCompactLayout ? 'none' : `repeat(${Math.min(3, clocks.length)}, 1fr)`
            }}
          >
            {clocks.map((clock) => (
              <div
                key={clock.id}
                className={`backdrop-blur-lg border border-white/20 hover:bg-white/15 group ${
                  isCompactLayout ? 'flex items-center justify-between' : ''
                }`}
                style={{
                  backgroundColor: "rgba(255,255,255,0.1)",
                  borderRadius: "16px",
                  padding: "24px",
                  transition: `all ${hasSmoothAnimations ? 500 : 300}ms ease-in-out`,
                  transform: hasSmoothAnimations ? 'scale(1)' : 'none'
                }}
                onMouseEnter={hasSmoothAnimations ? (e) => e.target.style.transform = 'scale(1.02)' : undefined}
                onMouseLeave={hasSmoothAnimations ? (e) => e.target.style.transform = 'scale(1)' : undefined}
              >
                <div className={`flex ${isCompactLayout ? 'items-center gap-6 flex-1' : 'justify-between items-start mb-4'}`}>
                  <h3 
                    className={`text-xl font-semibold tracking-wide ${isCompactLayout ? 'min-w-[120px]' : ''}`}
                    style={{ color: "#ffffff" }}
                  >
                    {clock.label}
                  </h3>
                  {clocks.length > 1 && !isCompactLayout && (
                    <button
                      onClick={() => removeClock(clock.id)}
                      className="text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100"
                      style={{
                        transition: `all ${hasSmoothAnimations ? 500 : 300}ms ease-in-out`
                      }}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
                
                <div className={`${isCompactLayout ? 'flex items-center gap-6' : 'text-center'}`}>
                  <div className={`flex ${isCompactLayout ? 'items-center gap-6' : 'items-center justify-between gap-6'}`}>
                    <div className={isCompactLayout ? 'text-left' : 'flex-1'}>
                      <div 
                        className={`font-jetbrains ${isCompactLayout ? 'mb-0' : 'mb-2'} tracking-wider`}
                        style={{ 
                          fontSize: `${hasEnhancedTimeDisplay ? 48 : 36}px`,
                          fontWeight: 600,
                          color: "#ffffff"
                        }}
                      >
                        {formatTime(clock.timezone)}
                      </div>
                      {!isCompactLayout && (
                        <>
                          <div 
                            className="text-sm font-light"
                            style={{ color: "#9ca3af" }}
                          >
                            {formatDate(clock.timezone)}
                          </div>
                          {hasEnhancedTimeDisplay && (
                            <div 
                              className="text-xs font-medium mt-1"
                              style={{ color: "#9ca3af" }}
                            >
                              {getRelativeTime(clock.timezone)}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    
                    {!isCompactLayout && (
                      <div className="flex-shrink-0 flex items-center justify-center h-full">
                        <AnalogClock timezone={clock.timezone} />
                      </div>
                    )}
                  </div>
                  
                  {clocks.length > 1 && isCompactLayout && (
                    <button
                      onClick={() => removeClock(clock.id)}
                      className="text-red-400 hover:text-red-300"
                      style={{
                        transition: `all ${hasSmoothAnimations ? 500 : 300}ms ease-in-out`
                      }}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div 
            className="text-center mt-12 text-sm font-light"
            style={{ color: "#9ca3af" }}
          >
            <p>Times update automatically every second</p>
          </div>
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

// STATSIG - App component using user properties - OBJECTIVE 2
function App() {
  const { client } = useClientAsyncInit(
    "client-1jKRKqgQNUDG6QY5wHhX2pFDELaEnSUFWw8vB879CBN",
    getUserProperties(), // STATSIG - Using your user properties function
    { plugins: [ new StatsigAutoCapturePlugin(), new StatsigSessionReplayPlugin() ] },
  );

  return (
    <StatsigProvider client={client} loadingComponent={<div>Loading...</div>}>
      <WorldClockDashboard />
    </StatsigProvider>
  );
}

export default App;