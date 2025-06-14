import React, { useState, useEffect } from 'react';
import { Plus, X, Clock, Settings } from 'lucide-react';

// STATSIG - Import Statsig React SDK and plugins for feature flags and analytics
import { StatsigProvider, useClientAsyncInit, useStatsigClient } from "@statsig/react-bindings";
import { StatsigAutoCapturePlugin } from "@statsig/web-analytics";
import { StatsigSessionReplayPlugin } from "@statsig/session-replay";

// Import Google Fonts
const fontLink = document.createElement('link');
fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap';
fontLink.rel = 'stylesheet';
document.head.appendChild(fontLink);

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

const WorldClockDashboard = () => {
  // Initial preset cities
  const [clocks, setClocks] = useState([
    { id: 1, label: 'New York', timezone: 'America/New_York' },
    { id: 2, label: 'London', timezone: 'Europe/London' },
    { id: 3, label: 'Tokyo', timezone: 'Asia/Tokyo' }
  ]);
  
  const { client } = useStatsigClient(); // STATSIG - useStatsigClient hook
  const [currentTime, setCurrentTime] = useState(new Date());
  const [is24Hour, setIs24Hour] = useState(false);
  const [showSeconds, setShowSeconds] = useState(true);
  const [selectedTimezone, setSelectedTimezone] = useState('');
  const [showAddClock, setShowAddClock] = useState(false);

  // STATSIG - Check feature gates for A/B testing
  const isDarkTheme = client.checkGate("dark_theme");
  const isCompactLayout = client.checkGate("compact_layout");
  const hasSmoothAnimations = client.checkGate("smooth_animations");
  const hasEnhancedTimeDisplay = client.checkGate("enhanced_time_display");
  const hasSearchBar = client.checkGate("search_bar");

  // STATSIG - Get dynamic config for banner content
  const bannerConfig = client.getDynamicConfig("upsell_banner");
  
  const text = bannerConfig.get("text", null); // STATSIG - bannerConfig.get()
  const backgroundColor = bannerConfig.get("backgroundColor", "black"); // STATSIG - bannerConfig.get()
  const color = bannerConfig.get("color", "white"); // STATSIG - bannerConfig.get()
  const fontSize = bannerConfig.get("fontSize", 14); // STATSIG - bannerConfig.get()
  const isCloseable = bannerConfig.get("isCloseable", true); // STATSIG - bannerConfig.get()

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

  // Banner Component
  const Banner = () => {
    if (!text || !showBanner) return null;
    
    return (
      <div 
        style={{
          backgroundColor: backgroundColor, // STATSIG - bannerConfig.get() value
          color: color, // STATSIG - bannerConfig.get() value
          fontSize: fontSize + "px", // STATSIG - bannerConfig.get() value
          padding: "12px 16px",
          textAlign: "center",
          position: "relative",
          zIndex: 1000
        }}
      >
        <p style={{ margin: 0 }}>{text}</p> {/* STATSIG - bannerConfig.get() value */}
        {isCloseable && ( // STATSIG - bannerConfig.get() value
          <button
            onClick={() => setShowBanner(false)}
            style={{
              position: "absolute",
              right: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              color: color,
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

  // Add a new clock
  const addClock = () => {
    if (!selectedTimezone) return;

    const selectedTz = TIME_ZONES.find(tz => tz.value === selectedTimezone);
    if (!selectedTz) return;

    if (clocks.some(clock => clock.timezone === selectedTimezone)) {
      alert('This clock already exists!');
      return;
    }

    const newClock = {
      id: Date.now(),
      label: selectedTz.label,
      timezone: selectedTz.value
    };

    setClocks(prev => [...prev, newClock]);
    setSelectedTimezone('');
    setShowAddClock(false);

    client.logEvent("clock_added", selectedTz.value, { // STATSIG - client.logEvent()
      timezone: selectedTz.value,
      label: selectedTz.label,
      total_clocks: clocks.length + 1
    });
  };

  // Remove a clock
  const removeClock = (id) => {
    setClocks(prev => prev.filter(clock => clock.id !== id));

    client.logEvent("clock_removed", "SKU_12345", { // STATSIG - client.logEvent()
      clock_id: id,
      remaining_clocks: clocks.length - 1
    });
  };

  // Toggle 24-hour format
  const toggle24Hour = () => {
    setIs24Hour(prev => !prev);
    
    client.logEvent("time_format_toggled"); // STATSIG - client.logEvent()
  };

  // Toggle seconds display
  const toggleSeconds = () => {
    setShowSeconds(prev => !prev);
    
    client.logEvent("seconds_display_toggled"); // STATSIG - client.logEvent()
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
      {/* STATSIG - Dynamic Config Banner */}
      <Banner />
      
      <div className="p-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Clock 
                className="w-10 h-10"
                style={{ 
                  color: "#a855f7",
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
              style={{ color: "#c4b5fd" }}
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
                  style={{ color: "#a855f7" }}
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
                    backgroundColor: "#a855f7",
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
              {hasSearchBar ? ( // STATSIG - client.checkGate()
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
                                onClick={() => {
                                  setSelectedTimezone(zone.value);
                                  setShowAddClock(false);
                                  
                                  // Add the clock immediately with the selected timezone
                                  const selectedTz = TIME_ZONES.find(tz => tz.value === zone.value);
                                  if (selectedTz && !clocks.some(clock => clock.timezone === zone.value)) {
                                    const newClock = {
                                      id: Date.now(),
                                      label: selectedTz.label,
                                      timezone: selectedTz.value
                                    };
                                    setClocks(prev => [...prev, newClock]);
                                    
                                    client.logEvent("clock_added", selectedTz.value, { // STATSIG - client.logEvent()
                                      timezone: selectedTz.value,
                                      label: selectedTz.label,
                                      total_clocks: clocks.length + 1
                                    });
                                  }
                                  
                                  setSelectedTimezone('');
                                }}
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
                  <button
                    onClick={() => client.logEvent("button_click")} // STATSIG - client.logEvent()
                    disabled={!selectedTimezone || !TIME_ZONES.find(tz => tz.value === selectedTimezone)}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 font-medium"
                    style={{
                      borderRadius: "16px",
                      transition: `all ${hasSmoothAnimations ? 500 : 300}ms ease-in-out`
                    }}
                  >
                    Add
                  </button>
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
                    onClick={() => {
                      addClock();
                      setSelectedTimezone('');
                    }}
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
                          color: "#a855f7"
                        }}
                      >
                        {formatTime(clock.timezone)}
                      </div>
                      {!isCompactLayout && (
                        <>
                          <div 
                            className="text-sm font-light"
                            style={{ color: "#c4b5fd" }}
                          >
                            {formatDate(clock.timezone)}
                          </div>
                          {hasEnhancedTimeDisplay && (
                            <div 
                              className="text-xs font-medium mt-1"
                              style={{ color: "#a855f7" }}
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
            style={{ color: "#c4b5fd" }}
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

function App() {
  const { client } = useClientAsyncInit( // STATSIG - useClientAsyncInit
    "client-1jKRKqgQNUDG6QY5wHhX2pFDELaEnSUFWw8vB879CBN",
    { userID: 'a-user' }, 
    { plugins: [ new StatsigAutoCapturePlugin(), new StatsigSessionReplayPlugin() ] }, // STATSIG - plugins
  );

  return (
    <StatsigProvider client={client} loadingComponent={<div>Loading...</div>}> {/* STATSIG - StatsigProvider */}
      <WorldClockDashboard />
    </StatsigProvider>
  );
}

export default App;