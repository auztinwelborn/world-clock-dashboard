import React from "react";
import ReactDOM from "react-dom/client";
import { StatsigProvider, useClientAsyncInit } from "@statsig/react-bindings";
import { StatsigAutoCapturePlugin } from "@statsig/web-analytics";
import { StatsigSessionReplayPlugin } from "@statsig/session-replay";

function App() {
  const { client } = useClientAsyncInit(
    "client-1jKRKqgQNUDG6QY5wHhX2pFDELaEnSUFWw8vB879CBN",
    { userID: "a-user" }, // <-- ✅ comma added here
    {
      plugins: [new StatsigAutoCapturePlugin(), new StatsigSessionReplayPlugin()],
    }
  );

  return (
    <StatsigProvider client={client} loadingComponent={<div>Loading...</div>}>
      <div>Hello World</div>
    </StatsigProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
