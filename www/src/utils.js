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
