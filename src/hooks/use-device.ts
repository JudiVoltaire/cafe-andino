"use client";

import { useState, useEffect, useRef } from "react";

export type Device = "mobile" | "tablet" | "desktop";

export interface DeviceInfo {
  device: Device;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
  screenHeight: number;
}

const MOBILE_MAX = 767;
const TABLET_MAX = 1023;

function getDevice(width: number): Device {
  if (width <= MOBILE_MAX) return "mobile";
  if (width <= TABLET_MAX) return "tablet";
  return "desktop";
}

function getDeviceInfo(width: number, height: number): DeviceInfo {
  const device = getDevice(width);
  return {
    device,
    isMobile: device === "mobile",
    isTablet: device === "tablet",
    isDesktop: device === "desktop",
    screenWidth: width,
    screenHeight: height,
  };
}

const SSR_INFO: DeviceInfo = getDeviceInfo(1024, 768);

export function useDevice(): DeviceInfo {
  // Always initialize with SSR_INFO so that initial hydration HTML matches server
  const [info, setInfo] = useState<DeviceInfo>(SSR_INFO);
  const lastDeviceRef = useRef<Device>("desktop");

  useEffect(() => {
    // Immediately sync with actual browser dimensions on mount
    const currentDevice = getDevice(window.innerWidth);
    lastDeviceRef.current = currentDevice;
    setInfo(getDeviceInfo(window.innerWidth, window.innerHeight));

    let raf = 0;
    function handleResize() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const newDevice = getDevice(window.innerWidth);
        // Only re-render if the device category actually changed
        if (newDevice !== lastDeviceRef.current) {
          lastDeviceRef.current = newDevice;
          setInfo(getDeviceInfo(window.innerWidth, window.innerHeight));
        }
      });
    }
    window.addEventListener("resize", handleResize, { passive: true });
    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return info;
}
