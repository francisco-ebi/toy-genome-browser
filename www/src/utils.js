export function formatGenomicCoordinate(value) {
  const absValue = Math.abs(value);
  if (absValue < 1000) {
    return `${Math.round(value)} bp`;
  } else if (absValue < 1000000) {
    return `${+(value / 1000).toFixed(2)} kbp`;
  } else {
    return `${+(value / 1000000).toFixed(2)} Mbp`;
  }
}

export function debounce(cb, wait) {
  let timeoutId = null;
  return (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => {
      cb(...args);
    }, wait);
  };
}

export function clamp(number, min, max) {
  return Math.max(min, Math.min(number, max));
}
