import React, { useState, useEffect } from 'react';
import { Plus, X, Clock, Settings } from 'lucide-react';
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
  const { client } = useStatsigClient();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [is24Hour, setIs24Hour] = useState(false);
  const [showSeconds, setShowSeconds] = useState(true);
  const [selectedTimezone, setSelectedTimezone] = useState('');
  const [showAddClock, setShowAddClock] = useState(false);

  // DYNAMIC CONFIG - All UI variables controlled by Statsig, NOT code
  const uiConfig = client ? client.getConfig("ui_settings") : null;
  
  // Get ALL styling from Statsig Dynamic Config (NO hardcoded values)
  const config = {
    // Colors (controlled remotely)
    backgroundColor: uiConfig?.get("background_color", "#0f172a") || "#0f172a",
    gradientColor: uiConfig?.get("gradient_color", "#581c87") || "#581c87", 
    textColor: uiConfig?.get("text_color", "#ffffff") || "#ffffff",
    accentColor: uiConfig?.get("accent_color", "#a855f7") || "#a855f7",
    secondaryTextColor: uiConfig?.get("secondary_text_color", "#c4b5fd") || "#c4b5fd",
    cardBackgroundColor: uiConfig?.get("card_background_color", "rgba(255,255,255,0.1)") || "rgba(255,255,255,0.1)",
    
    // Typography (controlled remotely)
    headerFontSize: uiConfig?.get("header_font_size", 36) || 36,
    timeFontSize: uiConfig?.get("time_font_size", 36) || 36,
    fontWeight: uiConfig?.get("font_weight", 600) || 600,
    
    // Layout & Animation (controlled remotely)  
    borderRadius: uiConfig?.get("border_radius", 16) || 16,
    animationSpeed: uiConfig?.get("animation_speed", 300) || 300,
    gridColumns: uiConfig?.get("grid_columns", 3) || 3,
    cardPadding: uiConfig?.get("card_padding", 24) || 24,
    
    // Content (controlled remotely)
    appTitle: uiConfig?.get("app_title", "World Clock Dashboard") || "World Clock Dashboard",
    appSubtitle: uiConfig?.get("app_subtitle", "Keep track of time across the globe") || "Keep track of time across the globe",
    
    // Feature toggles (controlled remotely)
    showAnalogClocks: uiConfig?.get("show_analog_clocks", true) || true,
    compactMode: uiConfig?.get("compact_mode", false) || false
  };

  // Log Dynamic Config exposure
  useEffect(() => {
    if (client && uiConfig) {
      client.logEvent("dynamic_config_loaded", {
        config_name: "ui_settings",
        background_color: config.backgroundColor,
        accent_color: config.accentColor,
        header_font_size: config.headerFontSize,
        compact_mode: config.compactMode
      });
    }
  }, [client, uiConfig]);

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

  // Track feature gate exposure (keeping search_bar gate from requirement #3)
  useEffect(() => {
    if (client) {
      client.logEvent("search_bar_gate_exposed", {
        gate_value: client.checkGate("search_bar")
      });
    }
  }, [client]);

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

  // Get time components for analog clock
  const getTimeComponents = (timezone) => {
    const date = new Date(currentTime.toLocaleString("en-US", {timeZone: timezone}));
    const hours = date.getHours() % 12;
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    
    return {
      hourAngle: (hours * 30) + (minutes * 0.5), // 30 degrees per hour + minute adjustment
      minuteAngle: minutes * 6, // 6 degrees per minute
      secondAngle: seconds * 6  // 6 degrees per second
    };
  };

  // Analog Clock Component
  const AnalogClock = ({ timezone }) => {
    // Show/hide based on Dynamic Config, not hardcoded
    if (!config.showAnalogClocks) return null;
    
    const { hourAngle, minuteAngle, secondAngle } = getTimeComponents(timezone);
    
    return (
      <div className="relative w-20 h-20 mx-auto">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Clock face */}
          <circle
            cx="50"
            cy="50"
            r="48"
            fill="rgba(147, 51, 234, 0.1)"
            stroke="rgba(196, 181, 253, 0.4)"
            strokeWidth="2"
          />
          
          {/* Hour markers */}
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
          
          {/* Hour hand */}
          <line
            x1="50"
            y1="50"
            x2={50 + Math.cos((hourAngle - 90) * Math.PI / 180) * 25}
            y2={50 + Math.sin((hourAngle - 90) * Math.PI / 180) * 25}
            stroke={config.accentColor}
            strokeWidth="3"
            strokeLinecap="round"
          />
          
          {/* Minute hand */}
          <line
            x1="50"
            y1="50"
            x2={50 + Math.cos((minuteAngle - 90) * Math.PI / 180) * 35}
            y2={50 + Math.sin((minuteAngle - 90) * Math.PI / 180) * 35}
            stroke={config.accentColor}
            strokeWidth="2"
            strokeLinecap="round"
          />
          
          {/* Second hand */}
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
          
          {/* Center dot */}
          <circle
            cx="50"
            cy="50"
            r="3"
            fill={config.accentColor}
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

    // Check if clock already exists
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

    if (client) {
      console.log("About to log clock_added event");
      client.logEvent("clock_added");
      console.log("clock_added event logged");
    }
  };

  // Remove a clock
  const removeClock = (id) => {
    const clockToRemove = clocks.find(clock => clock.id === id);
    setClocks(prev => prev.filter(clock => clock.id !== id));

    if (client) {
      console.log("About to log clock_removed event");
      client.logEvent("clock_removed");
      console.log("clock_removed event logged");
    }
  };

  // Toggle 24-hour format
  const toggle24Hour = () => {
    console.log("Toggle function called!");
    console.log("Client object:", client);
    setIs24Hour(prev => !prev);
    
    if (client && client.logEvent) {
      console.log("About to call client.logEvent");
      client.logEvent("time_format_toggled");
      console.log("logEvent completed");
    } else {
      console.error("Client or logEvent not available:", client);
    }
  };

  // Toggle seconds display
  const toggleSeconds = () => {
    console.log("Toggle seconds function called!");
    setShowSeconds(prev => !prev);
    
    if (client) {
      console.log("About to log seconds_display_toggled event");
      client.logEvent("seconds_display_toggled");
      console.log("seconds_display_toggled event logged");
    }
  };

  return (
    <div 
      className="min-h-screen p-4 font-inter"
      style={{
        background: `linear-gradient(to bottom right, ${config.backgroundColor}, ${config.gradientColor}, ${config.backgroundColor})`,
        transition: `all ${config.animationSpeed}ms ease-in-out`
      }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Header - all styling from Dynamic Config */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Clock 
              className="w-10 h-10"
              style={{ color: config.accentColor }}
            />
            <h1 
              className="font-bold tracking-tight"
              style={{ 
                fontSize: `${config.headerFontSize}px`,
                fontWeight: config.fontWeight,
                color: config.textColor
              }}
            >
              {config.appTitle}
            </h1>
          </div>
          <p 
            className="font-light"
            style={{ color: config.secondaryTextColor }}
          >
            {config.appSubtitle}
          </p>
        </div>

        {/* Controls - all styling from Dynamic Config */}
        <div 
          className="backdrop-blur-lg mb-8 border border-white/20"
          style={{
            backgroundColor: config.cardBackgroundColor,
            borderRadius: `${config.borderRadius}px`,
            padding: `${config.cardPadding}px`,
            transition: `all ${config.animationSpeed}ms ease-in-out`
          }}
        >
          <div className="flex flex-wrap items-center gap-4 justify-between">
            <div className="flex items-center gap-2">
              <Settings 
                className="w-5 h-5"
                style={{ color: config.accentColor }}
              />
              <span 
                className="font-medium"
                style={{ color: config.textColor }}
              >
                Settings
              </span>
            </div>
            
            <div className="flex flex-wrap items-center gap-6">
              {/* Format Controls */}
              <div className="flex items-center gap-4">
                <label 
                  className="flex items-center gap-2"
                  style={{ color: config.textColor }}
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
                  style={{ color: config.textColor }}
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

              {/* Add Clock Button */}
              <button
                onClick={() => setShowAddClock(!showAddClock)}
                className="flex items-center gap-2 text-white px-4 py-2 rounded-lg font-medium"
                style={{
                  backgroundColor: config.accentColor,
                  borderRadius: `${config.borderRadius}px`,
                  transition: `all ${config.animationSpeed}ms ease-in-out`
                }}
              >
                <Plus className="w-4 h-4" />
                Add Clock
              </button>
            </div>
          </div>

          {/* Add Clock Section - keeping search_bar feature gate from requirement #3 */}
          <div className="mt-4 pt-4 border-t border-white/20">
            {client && client.checkGate("search_bar") ? (
              // Show searchable timezone input when gate is enabled
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label 
                    className="block text-sm font-medium mb-2"
                    style={{ color: config.textColor }}
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
                        backgroundColor: config.cardBackgroundColor,
                        color: config.textColor,
                        borderRadius: `${config.borderRadius}px`,
                        transition: `all ${config.animationSpeed}ms ease-in-out`
                      }}
                    />
                    {showAddClock && selectedTimezone && (
                      <div 
                        className="absolute top-full left-0 right-0 mt-1 backdrop-blur-lg border border-white/20 max-h-48 overflow-y-auto z-10"
                        style={{
                          backgroundColor: config.cardBackgroundColor,
                          borderRadius: `${config.borderRadius}px`
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
                                setTimeout(() => {
                                  addClock();
                                  setSelectedTimezone('');
                                }, 100);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-white/20 border-b border-white/10 last:border-b-0"
                              style={{
                                color: config.textColor,
                                transition: `all ${config.animationSpeed}ms ease-in-out`
                              }}
                            >
                              <div className="font-medium">{zone.label}</div>
                              <div className="text-sm text-gray-400">{zone.value}</div>
                            </button>
                          ))}
                        {TIME_ZONES.filter(zone => 
                          zone.label.toLowerCase().includes(selectedTimezone.toLowerCase()) ||
                          zone.value.toLowerCase().includes(selectedTimezone.toLowerCase())
                        ).length === 0 && (
                          <div className="px-3 py-2 text-gray-400">No timezones found</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    addClock();
                    setSelectedTimezone('');
                    setShowAddClock(false);
                  }}
                  disabled={!selectedTimezone || !TIME_ZONES.find(tz => tz.value === selectedTimezone)}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 font-medium"
                  style={{
                    borderRadius: `${config.borderRadius}px`,
                    transition: `all ${config.animationSpeed}ms ease-in-out`
                  }}
                >
                  Add
                </button>
              </div>
            ) : (
              // Show dropdown selector when gate is disabled
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label 
                    className="block text-sm font-medium mb-2"
                    style={{ color: config.textColor }}
                  >
                    Select Timezone
                  </label>
                  <select
                    value={selectedTimezone}
                    onChange={(e) => setSelectedTimezone(e.target.value)}
                    className="w-full border border-white/20 px-3 py-2 focus:ring-2 focus:border-transparent"
                    style={{
                      backgroundColor: config.cardBackgroundColor,
                      color: config.textColor,
                      borderRadius: `${config.borderRadius}px`,
                      transition: `all ${config.animationSpeed}ms ease-in-out`
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
                    borderRadius: `${config.borderRadius}px`,
                    transition: `all ${config.animationSpeed}ms ease-in-out`
                  }}
                >
                  Add
                </button>
                <button
                  onClick={() => setSelectedTimezone('')}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 font-medium"
                  style={{
                    borderRadius: `${config.borderRadius}px`,
                    transition: `all ${config.animationSpeed}ms ease-in-out`
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Clock Grid - layout controlled by Dynamic Config */}
        <div 
          className={config.compactMode ? "space-y-3" : "grid gap-6"}
          style={{
            gridTemplateColumns: config.compactMode ? 'none' : `repeat(${Math.min(config.gridColumns, clocks.length)}, 1fr)`
          }}
        >
          {clocks.map((clock) => (
            <div
              key={clock.id}
              className={`backdrop-blur-lg border border-white/20 hover:bg-white/15 group ${
                config.compactMode ? 'flex items-center justify-between' : ''
              }`}
              style={{
                backgroundColor: config.cardBackgroundColor,
                borderRadius: `${config.borderRadius}px`,
                padding: `${config.cardPadding}px`,
                transition: `all ${config.animationSpeed}ms ease-in-out`
              }}
            >
              <div className={`flex ${config.compactMode ? 'items-center gap-6 flex-1' : 'justify-between items-start mb-4'}`}>
                <h3 
                  className={`text-xl font-semibold tracking-wide ${config.compactMode ? 'min-w-[120px]' : ''}`}
                  style={{ color: config.textColor }}
                >
                  {clock.label}
                </h3>
                {clocks.length > 1 && !config.compactMode && (
                  <button
                    onClick={() => removeClock(clock.id)}
                    className="text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100"
                    style={{
                      transition: `all ${config.animationSpeed}ms ease-in-out`
                    }}
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
              
              <div className={`${config.compactMode ? 'flex items-center gap-6' : 'text-center'}`}>
                <div className={`flex ${config.compactMode ? 'items-center gap-6' : 'items-center justify-between gap-6'}`}>
                  {/* Digital Time */}
                  <div className={config.compactMode ? 'text-left' : 'flex-1'}>
                    <div 
                      className={`font-jetbrains ${config.compactMode ? 'mb-0' : 'mb-2'} tracking-wider`}
                      style={{ 
                        fontSize: `${config.timeFontSize}px`,
                        fontWeight: config.fontWeight,
                        color: config.accentColor
                      }}
                    >
                      {formatTime(clock.timezone)}
                    </div>
                    {!config.compactMode && (
                      <div 
                        className="text-sm font-light"
                        style={{ color: config.secondaryTextColor }}
                      >
                        {formatDate(clock.timezone)}
                      </div>
                    )}
                  </div>
                  
                  {/* Analog Clock - only show if not compact and enabled in config */}
                  {!config.compactMode && (
                    <div className="flex-shrink-0 flex items-center justify-center h-full">
                      <AnalogClock timezone={clock.timezone} />
                    </div>
                  )}
                </div>
                
                {/* Remove button for compact layout */}
                {clocks.length > 1 && config.compactMode && (
                  <button
                    onClick={() => removeClock(clock.id)}
                    className="text-red-400 hover:text-red-300"
                    style={{
                      transition: `all ${config.animationSpeed}ms ease-in-out`
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
          style={{ color: config.secondaryTextColor }}
        >
          <p>Times update automatically every second</p>
        </div>
      </div>

      {/* Add custom font styles */}
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
  const { client, isLoading } = useClientAsyncInit(
    "client-1jKRKqgQNUDG6QY5wHhX2pFDELaEnSUFWw8vB879CBN",
    { userID: "a-user" },
    {
      plugins: [new StatsigAutoCapturePlugin(), new StatsigSessionReplayPlugin()],
    }
  );

  if (isLoading || !client) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <StatsigProvider client={client}>
      <WorldClockDashboard />
    </StatsigProvider>
  );
}

export default App;